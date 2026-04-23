// utils/fileAnalyzer.js

export function detectFramework(files) {
  let isTestNG = false;
  let isJUnit4 = false;
  let isJUnit5 = false;

  for (const file of files) {
    const content = file.content || "";

    if (
      content.includes("org.testng.annotations") ||
      content.includes("@Test") && content.includes("TestNG")
    ) {
      isTestNG = true;
    }

    if (content.includes("org.junit.")) {
      isJUnit4 = true;
    }

    if (content.includes("org.junit.jupiter")) {
      isJUnit5 = true;
    }
  }

  // 🔥 Priority logic
  if (isTestNG) return "TestNG";
  if (isJUnit5) return "JUnit5";
  if (isJUnit4) return "JUnit4";

  return "unknown";
}


export function classifyFiles(files) {
  const result = {
    testFiles: [],
    pageObjects: [],
    baseClasses: [],
    utils: [],
    ignored: []
  };

  files.forEach((file) => {
    const name = file.fileName.toLowerCase();
    const content = file.content || "";

    const isTestByAnnotation = content.includes("@Test");
    const isPageByContent =
      content.includes("WebElement") ||
      content.includes("PageFactory") ||
      content.includes("@FindBy");

    const isBaseByContent =
      content.includes("WebDriver") &&
      (content.includes("setup") ||
        content.includes("initialize") ||
        content.includes("driver ="));

    const isUtilityByName =
      name.includes("util") ||
      name.includes("helper") ||
      name.includes("manager") ||
      name.includes("logger") ||
      name.includes("listener");

    // ✅ 1. TEST (STRICT)
    if (
      name.endsWith("test.java") ||   // 🔥 stricter
      isTestByAnnotation
    ) {
      result.testFiles.push(file);
      return;
    }

    // ✅ 2. PAGE OBJECT
    if (
      name.endsWith("page.java") ||   // 🔥 stricter
      isPageByContent
    ) {
      result.pageObjects.push(file);
      return;
    }

    // ✅ 3. BASE CLASS
    if (
      name.includes("base") ||
      isBaseByContent
    ) {
      result.baseClasses.push(file);
      return;
    }

    // ✅ 4. UTILS / SUPPORT FILES
    if (isUtilityByName) {
      result.utils.push(file);
      return;
    }

    // ❗ fallback
    result.ignored.push(file);
  });

  return result;
}

export function extractUsedClasses(testContent) {
  const regex = /new\s+(\w+)/g;
  const classes = new Set();

  let match;
  while ((match = regex.exec(testContent)) !== null) {
    classes.add(match[1]);
  }

  return Array.from(classes);
}

export function mapTestsToPOMs(testFiles, pageObjects) {
  return testFiles.map(test => {
    const usedClasses = extractUsedClasses(test.content);

    const normalize = (name) => name.toLowerCase();

    const pageObjectNames = pageObjects.map(p =>
      p.fileName.replace(".java", "").toLowerCase()
    );

    // ✅ Only Page Objects → for dependency graph
    const mappedPOMs = pageObjects.filter(pom =>
      usedClasses.some(cls =>
        normalize(cls) === normalize(pom.fileName.replace(".java", ""))
      )
    );

    // 🔥 Separate non-POM classes
    const nonPOMClasses = usedClasses.filter(cls =>
      !pageObjectNames.includes(normalize(cls))
    );

    return {
      ...test,
      mappedPOMs,

      // 🔥 IMPORTANT separation
      helperClasses: nonPOMClasses.filter(cls =>
        cls.endsWith("Util") ||
        cls.endsWith("Manager") ||
        cls.endsWith("Logger") ||
        cls.endsWith("Listener")
      ),

      externalClasses: nonPOMClasses.filter(cls =>
        cls === "ChromeDriver" ||
        cls === "Logger" ||
        cls === "SoftAssert"
      )
    };
  });
}

export function filterRelevantFiles(files) {
  return files.filter(file => {
    const name = file.fileName.toLowerCase();
    const content = file.content || "";

    if (!name.endsWith(".java")) return false;

    // ✅ Keep core files
    if (
      name.includes("test") ||
      name.includes("page") ||
      name.includes("base")
    ) {
      return true;
    }

    // 🔥 NEW: include support files (important)
    if (
      name.includes("util") ||
      name.includes("helper") ||
      name.includes("listener") ||
      name.includes("logger") ||
      name.includes("manager")
    ) {
      return true;
    }

    // ✅ fallback
    if (
      content.includes("@Test") ||
      content.includes("WebElement") ||
      content.includes("By.") ||
      content.includes("findElement")
    ) {
      return true;
    }

    return false;
  });
}