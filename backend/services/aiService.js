import { GoogleGenerativeAI } from "@google/generative-ai";
import dotenv from "dotenv";

dotenv.config();

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

export const convertWithAI = async (
  seleniumCode,
  dependencyCode = "",
  errorContext = "",
  preprocessResult = null,
  previousPlaywrightCode = "",
  steps = []
) => {
  const model = genAI.getGenerativeModel({
    model: "gemini-3.1-pro-preview",
  });

  const prompt = buildPrompt({
    seleniumCode,
    dependencyCode,
    errorContext,
    preprocessResult,
    previousPlaywrightCode,
    steps
  });

  const result = await model.generateContent(prompt);

  let text =
    result.response?.candidates?.[0]?.content?.parts?.[0]?.text || "";

  return cleanCode(text);
};

function buildPrompt({
  seleniumCode,
  dependencyCode,
  errorContext,
  preprocessResult,
  previousPlaywrightCode,
  steps
}) {
  return `
TASK:
Convert Selenium Java test into Playwright TypeScript.

================================
TEST (SOURCE OF TRUTH)
================================
${seleniumCode}

================================
PAGE OBJECTS (RELEVANT ONLY)
================================
${dependencyCode || "No dependencies"}

================================
TEST STEPS
================================
${steps?.join("\n") || "N/A"}

================================
KNOWN ISSUES
================================
${preprocessResult?.issues?.map(i => `- ${i.message}`).join("\n") || "None"}

================================
PREVIOUS ERROR (if any)
================================
${errorContext || "None"}

================================
PREVIOUS ATTEMPT (if any)
================================
${previousPlaywrightCode || "None"}

================================
RULES (STRICT)
================================
- Preserve full test flow
- Do NOT remove steps
- Do NOT invent locators
- Use ONLY locators from Page Objects
- Inline POM methods logically
- Maintain assertions
- Prefer locators from Page Objects
- If locator is missing, infer using text, role, or label
- Include page.goto() only if the test involves opening the application or login flow
- Always wait for elements before interacting (waitFor or expect)

================================
PLAYWRIGHT RULES
================================
- Use @playwright/test
- Wrap in test(...)
- Use async/await
- Prefer page.locator()
- Use expect() for assertions

================================
OUTPUT
================================
Return ONLY Playwright code
`;
}


// 🔥 MAIN POM CONTEXT BUILDER
function getRelevantPOMContext(testCode, pageObjects = []) {
  if (!pageObjects.length) return "No page objects provided";

  const calledMethods = extractCalledMethods(testCode);

  let result = "";

  pageObjects.forEach(pom => {
    const methodsMap = extractAllMethods(pom.content);

    // 🔥 include 1-level dependency
    const allMethods = new Set(calledMethods);

    calledMethods.forEach(method => {
      const body = methodsMap[method]?.body || "";
      const innerCalls = extractInnerMethodCalls(body);
      innerCalls.forEach(m => allMethods.add(m));
    });

    const relevantMethods = Object.entries(methodsMap)
      .filter(([name]) => allMethods.has(name))
      .map(([_, m]) => m.full)
      .join("\n");

    if (!relevantMethods) return;

    const relevantLocators = extractRelevantLocators(
      pom.content,
      relevantMethods
    );

    result += `
File: ${pom.fileName}

LOCATORS:
${relevantLocators || "None"}

METHODS:
${relevantMethods}
`;
  });

  return result || "No relevant methods found";
}


// 🔥 Extract all methods with body + full text
function extractAllMethods(content) {
  const methodRegex =
    /public\s+(?:\w+\s+)*(\w+)\s*\((.*?)\)\s*{([\s\S]*?)}/g;

  const methods = {};
  let match;

  while ((match = methodRegex.exec(content)) !== null) {
    const name = match[1];

    methods[name] = {
      name,
      body: match[3],
      full: match[0]
    };
  }

  return methods;
}


// 🔍 Extract called methods from test
function extractCalledMethods(testCode) {
  const regex = /\b\w+\.(\w+)\(/g;

  const methods = new Set();
  let match;

  while ((match = regex.exec(testCode)) !== null) {
    methods.add(match[1]);
  }

  return Array.from(methods);
}


// 🔥 Extract nested method calls (1-level)
function extractInnerMethodCalls(methodBody = "") {
  const regex = /\b(\w+)\(/g;

  const methods = new Set();
  let match;

  while ((match = regex.exec(methodBody)) !== null) {
    methods.add(match[1]);
  }

  return Array.from(methods);
}


// 🔥 Extract relevant locators (FIXED)
function extractRelevantLocators(pomContent, methodsContent) {
  const usedVars = extractUsedVariables(methodsContent);
  const lines = pomContent.split("\n");

  let result = "";

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    const matchedVar = usedVars.find(v => line.includes(v));

    if (matchedVar) {
      // include @FindBy above
      if (i > 0 && lines[i - 1].includes("@FindBy")) {
        result += lines[i - 1] + "\n";
      }

      // include only locator declaration (clean)
      if (
        line.includes("WebElement") ||
        line.includes("By.") ||
        line.includes("@FindBy")
      ) {
        result += line + "\n";
      }
    }
  }

  return result.trim();
}


// 🔍 Extract variables used in methods
function extractUsedVariables(methodsContent) {
  const regex = /\b([a-zA-Z_]\w*)\./g;

  const vars = new Set();
  let match;

  while ((match = regex.exec(methodsContent)) !== null) {
    vars.add(match[1]);
  }

  return Array.from(vars);
}


// 🔧 Clean AI output
function cleanCode(code) {
  return code
    .replace(/```[a-z]*\n?/gi, "")
    .replace(/```/g, "")
    .trim();
}


// 🔍 EXPLAIN CHANGES
export const explainChanges = async (seleniumCode, playwrightCode) => {
  const model = genAI.getGenerativeModel({
    model: "gemini-3.1-pro-preview",
  });

  const prompt = `
Compare Selenium and Playwright code.

Explain in 3-4 bullet points:
- What changed
- Why changes were made
- Any fixes applied

Selenium:
${seleniumCode}

Playwright:
${playwrightCode}
`;

  const result = await model.generateContent(prompt);

  return result.response?.candidates?.[0]?.content?.parts?.[0]?.text || "";
};


// 🔍 VERIFY INTENT
export const verifyIntent = async (seleniumCode, playwrightCode) => {
  const model = genAI.getGenerativeModel({
    model: "gemini-3.1-pro-preview",
  });

  const prompt = `
Compare Selenium and Playwright test.

Does Playwright preserve:
- same user journey
- same actions
- same validations

Answer ONLY: YES or NO

Selenium:
${seleniumCode}

Playwright:
${playwrightCode}
`;

  const result = await model.generateContent(prompt);

  return result.response?.candidates?.[0]?.content?.parts?.[0]?.text || "";
};