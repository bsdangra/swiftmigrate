import { GoogleGenerativeAI } from "@google/generative-ai";
import dotenv from "dotenv";

dotenv.config();

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

export const callLLM = async(prompt = '') => {
  const model = genAI.getGenerativeModel({
    model: "gemini-3.1-pro-preview",
  });
  const result = await model.generateContent(prompt);
  return result;
}

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

  const normalizedDependencyCode = normalizeCodeInput(dependencyCode);
  
  const prompt = buildPrompt({
    seleniumCode,
    dependencyCode: normalizedDependencyCode,
    errorContext,
    preprocessResult,
    previousPlaywrightCode,
    steps
  });

  const result = await model.generateContent(prompt);

  let text =
    result.choices?.[0]?.message?.content || result.response?.candidates?.[0]?.content?.parts?.[0]?.text || 
  result.output_text ||"";

  console.log(`file ${fileName} prompt details i/p token ${result.usage?.prompt_tokens || result.response?.usageMetadata?.promptTokenCount || result.usage?.input_tokens}
   o/p token ${result.usage?.completion_tokens || result.response?.usageMetadata?.candidatesTokenCount || result.usage?.output_tokens} 
  cached token ${result.usage?.prompt_tokens_details?.cached_tokens|| result.usage?.input_tokens_details?.cached_tokens} total cost ${result.usage?.cost}`);

  
  return cleanCode(text);
};

function normalizeCodeInput(input) {
  if (Array.isArray(input)) {
    return input
      .map(item => normalizeCodeInput(item))
      .filter(Boolean)
      .join("\n\n");
  }

  if (typeof input === "object" && input !== null) {
    return normalizeCodeInput(input.content ?? input.code ?? input.body ?? "");
  }

  return typeof input === "string" ? input : "";
}

function buildPrompt({
  seleniumCode,
  dependencyCode = "",
  errorContext,
  preprocessResult,
  previousPlaywrightCode,
  steps
}) {
  const resolvedDependencyCode = normalizeCodeInput(dependencyCode);
 
  return `
TASK:
Convert Selenium Java test into Playwright TypeScript.

================================
TEST SOURCE (SOURCE OF TRUTH)
================================
${seleniumCode}

================================
RELEVANT PAGE OBJECT CONTEXT
================================
${resolvedDependencyCode || "No relevant page object context provided"}

================================
KNOWN ISSUES
================================
${preprocessResult?.issues?.map(i => `- ${i.message}`).join("\n") || "None"}

================================
PREVIOUS ERROR
================================
${errorContext || "None"}

================================
PREVIOUS ATTEMPT
================================
${previousPlaywrightCode || "None"}

================================
STRICT CONVERSION RULES
================================
- Preserve the complete test flow and all user actions.
- Keep the source test logic as close as possible to the original.
- Use ONLY locators defined in the provided page object context.
- Do NOT invent new locators unless absolutely necessary.
- Convert Selenium constructs to Playwright equivalents.
- Convert WebDriver waits and assertions to Playwright assertions or locator waits.
- Translate page object methods to Playwright helper actions or inline them logically.
- Preserve assertions, validations, and verification steps.
- Prefer page.locator() and expect() for interactions and assertions.
- Use async/await for all Playwright operations.
- Do NOT return markdown, comments, or explanation text.
- Project package structure have base, pages, tests and utility folders, filetype of each type will go under corresponding folder on final generation. Improve import statements taking this into consideration and updating only when required.

================================
PLAYWRIGHT RULES
================================
- Use @playwright/test
- Wrap in test(...) blocks
- Use fixtures only when needed
- Use async functions and await every action
- Use page.locator() over page.$ or direct selector strings when possible
- Use expect() for assertions
- Keep the output valid TypeScript code

================================
OUTPUT
================================
Return ONLY valid Playwright TypeScript code. No markdown fences, no extra comments, no explanation.
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
