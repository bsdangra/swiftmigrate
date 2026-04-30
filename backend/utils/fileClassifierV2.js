import { callLLM } from "../services/aiService.js";

/* classify v2 */
export async function classifyFilesV2(files) {
  // 🔹 Step 1: Build class map
  const classMap = new Map();

  files.forEach(file => {
    const content = file.content || "";
    const classNameMatch = content.match(/class\s+(\w+)/);
    const className = classNameMatch ? classNameMatch[1] : file.fileName.replace(".java", "");

    classMap.set(className, {
      ...file,
      className,
      meta: extractFeatures(file),
      score: { test: 0, page: 0, base: 0, util: 0 },
      finalType: null
    });
  });

  // 🔹 Step 2: Build relationships
  buildRelationships(classMap);

  // 🔹 Step 3: Scoring
  classMap.forEach(file => {
    applyScoring(file, classMap);
  });

  // 🔹 Step 4: Resolve final type
  const result = {
    testFiles: [],
    pageObjects: [],
    baseClasses: [],
    utils: [],
    ignored: []
  };

  for (const file of classMap.values()) {
    const initialType = resolveType(file);

    // 🔥 calculate confidence
    const confidence = calculateConfidence(file.score);
    file.confidence = confidence;

    let finalType = initialType;

    // 🔥 LLM fallback trigger
    const threshold = file.score.base > 0 ? 0.3 : 0.4;
    if (confidence < threshold) {
      console.log("LLM fallback triggered:", file.fileName, file.score);
      // const llmType = await llmClassifyFile(file);

      // if (!llmType) {
      //   console.warn("LLM failed classification:", file.fileName);
      // }

      // if (llmType) {
      //   finalType = llmType;
      //   file.llmOverride = true; // optional debug flag
      // }
    }

    file.finalType = finalType;

    // push to result
    if (finalType === "test") result.testFiles.push(file);
    else if (finalType === "page") result.pageObjects.push(file);
    else if (finalType === "base") result.baseClasses.push(file);
    else if (finalType === "util") result.utils.push(file);
    else result.ignored.push(file);
  }

  return result;
}

function extractFeatures(file) {
  const content = file.content || "";

  return {
    // 🔥 TEST signals
    hasTestAnnotation: content.includes("@Test"),
    hasAssertion: /Assert\.|Assertions\./.test(content),

    // 🔥 DRIVER / BASE signals
    hasWebDriverField: /WebDriver\s+\w+/.test(content),

    initializesDriver:
      content.includes("new ChromeDriver") ||
      content.includes("new FirefoxDriver") ||
      content.includes("WebDriverFactory") ||
      /driver\s*=\s*/.test(content) ||   // ✅ important
      content.includes("getDriver()"),

    hasDriverLifecycle:
      content.includes("driver.manage") ||
      content.includes("driver.get("),

    // 🔥 PAGE signals
    hasFindBy: content.includes("@FindBy"),
    hasWebElementField: /WebElement\s+\w+;/.test(content),
    hasLocatorUsage: content.includes("By."),

    hasWaits: content.includes("WebDriverWait"),

    // 🔥 RELATIONSHIPS
    usesClasses: extractUsedClassesV2(content), 
    extendsClass: extractExtends(content)
  };
}

function buildRelationships(classMap) {
  // initialize
  classMap.forEach(file => {
    file.meta.usedBy = [];
  });

  // build reverse dependency
  classMap.forEach(file => {
    (file.meta.usesClasses || []).forEach(dep => {
      if (classMap.has(dep)) {
        classMap.get(dep).meta.usedBy.push(file.className);
      }
    });
  });
}

function applyScoring(file, classMap) {
  const meta = file.meta;
  const score = file.score;
  const name = file.fileName.toLowerCase();

  // 🔥 TEST
  if (meta.hasTestAnnotation) score.test += 5;
  if (meta.hasAssertion) score.test += 3;
  if ((meta.usesClasses || []).length > 0 && !meta.hasWebElementField) {
    score.test += 2;
  }
  if (name.includes("test")) score.test += 2;

  // 🔥 NEGATIVE: Page should not look like Test
  const isClearlyPage =
    meta.hasFindBy ||
    (meta.hasWebElementField && meta.hasLocatorUsage);

  if (isClearlyPage && !meta.hasTestAnnotation) {
    score.test -= 3;
  }

  // 🔥 BASE
  if (meta.initializesDriver) score.base += 5;
  if (meta.hasWebDriverField) score.base += 3;
  if (meta.hasDriverLifecycle) score.base += 3;
  if (meta.usedBy.length > 2 && meta.initializesDriver) {
    score.base += 3;
  }
  if (name.includes("base")) score.base += 2;

  const isExtended = Array.from(classMap.values()).some(
    f => f.meta.extendsClass === file.className
  );

  if (isExtended) {
    score.base += 6;
  }

  // 🔥 PAGE OBJECT

  const isClearlyBase =
    meta.initializesDriver ||
    meta.hasDriverLifecycle;

  const isClearlyTest =
    meta.hasTestAnnotation ||
    name.includes("test");

  if (!isClearlyBase && !isClearlyTest) {
    if (meta.hasFindBy) score.page += 4;
    if (meta.hasWebElementField) score.page += 3;
    if (meta.hasLocatorUsage && meta.hasWebElementField) {
      score.page += 2;
    }
  }

  const usedByTests = meta.usedBy.filter(user => {
  const userFile = classMap.get(user);
    return (
      userFile &&
      (userFile.meta.hasTestAnnotation ||
      userFile.fileName.toLowerCase().includes("test"))
    );
  });

  if (usedByTests.length >= 1 && !isClearlyBase) {
    score.page += 5;
  }

  if (usedByTests.length > 1) {
    score.page += 2; // bonus
  }

  // 🔥 NEGATIVE: Base should not be treated as Page
  if (meta.initializesDriver || meta.hasDriverLifecycle) {
    score.page -= 3;
  }

  // 🔥 UTIL
  if (
    name.includes("util") ||
    name.includes("helper") ||
    name.includes("manager") ||
    name.includes("logger")
  ) {
    score.util += 4;
  }

  const isStateless =
    !meta.hasWebDriverField &&
    !meta.initializesDriver &&
    (meta.usesClasses || []).length === 0;

  if (isStateless) score.util += 2;

  // 🔥 NEGATIVE: Infra should not be util
  if (meta.hasWebDriverField || meta.initializesDriver) {
    score.util -= 2;
  }
  score.test = Math.min(score.test, 20);
  score.page = Math.min(score.page, 20);
  score.base = Math.min(score.base, 20);
  score.util = Math.min(score.util, 20);
}

function resolveType(file) {
  const { test, page, base, util } = file.score;

  // 🔥 Hard rules
  if (file.meta.hasTestAnnotation) return "test";

  if (
    file.meta.initializesDriver &&
    file.score.base >= file.score.page
  ) {
    return "base";
  }

  // 🔥 Score-based fallback
  const max = Math.max(test, page, base, util);

  if (max === test && test > 0) return "test";
  if (max === base && base > 0) return "base";
  if (max === page && page > 0) return "page";
  if (max === util && util > 0) return "util";

  return "ignored";
}

function calculateConfidence(score) {
  const values = Object.values(score).sort((a, b) => b - a);

  if (values[0] === 0) return 0;

  return (values[0] - values[1]) / values[0];
}

export function extractUsedClassesV2(content) {
  const classes = new Set();

  const ignore = new Set([
    "String", "int", "long", "double", "float", "boolean",
    "char", "byte", "short", "void",
    "List", "Map", "Set", "ArrayList", "HashMap",
    "System", "Math", "Thread", "Exception", "RuntimeException",
    "WebDriver", "WebElement", "By", "Logger"
  ]);

  const ignoreMethods = new Set(["out", "err"]);

  const isLowerCase = (name) =>
    name && name[0] === name[0].toLowerCase();

  const newRegex = /\bnew\s+(\w+)/g;
  const declRegex = /\b(?:private|public|protected)?\s*(?:static\s+)?(?:final\s+)?(\w+)\s+\w+\s*;/g;
  const methodRegex = /\b(\w+)\s*\./g;
  const importRegex = /import\s+[\w\.]+\.(\w+);/g;
  const genericRegex = /<([\w,\s]+)>/g;

  let match;

  // new
  while ((match = newRegex.exec(content)) !== null) {
    if (!ignore.has(match[1])) classes.add(match[1]);
  }

  // declarations
  while ((match = declRegex.exec(content)) !== null) {
    if (!ignore.has(match[1])) classes.add(match[1]);
  }

  // method usage
  while ((match = methodRegex.exec(content)) !== null) {
    const name = match[1];

    if (
      !ignore.has(name) &&
      !ignoreMethods.has(name) &&
      !isLowerCase(name)
    ) {
      classes.add(name);
    }
  }

  // imports
  while ((match = importRegex.exec(content)) !== null) {
    if (match[1] && match[1] !== "*" && !ignore.has(match[1])) {
      classes.add(match[1]);
    }
  }

  // generics
  while ((match = genericRegex.exec(content)) !== null) {
    const types = match[1]
    .split(",")
    .map(t => t.replace(/[^a-zA-Z0-9_]/g, "").trim());

    types.forEach(t => {
      if (!ignore.has(t)) classes.add(t);
    });
  }

  return Array.from(classes);
}

function extractExtends(content) {
  const match = content.match(/class\s+\w+\s+extends\s+(\w+)/);
  return match ? match[1] : null;
}

async function llmClassifyFile(file) {
  const prompt = `
    Classify this Selenium Java class into ONE of:
    - test
    - page
    - base
    - util

    Rules:
    - test → contains test methods or annotations
    - page → represents UI interactions (locators/actions)
    - base → initializes WebDriver or setup
    - util → helper / stateless

  Code:
  ${truncateCode(file.content)}

  Answer ONLY one word.
  `;

  try {
    const response = await callLLM(prompt);

    const type = response.trim().toLowerCase();

    if (["test", "page", "base", "util"].includes(type)) {
      return type;
    }

    return null;
  } catch (e) {
    console.error("LLM classification failed:", e);
    return null;
  }
}

function truncateCode(code, maxLength = 2000) {
  if (code.length <= maxLength) return code;

  return code.slice(0, maxLength);
}