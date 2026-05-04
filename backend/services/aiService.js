import { GoogleGenerativeAI } from "@google/generative-ai";
import dotenv from "dotenv";
import { emitProgress } from "./progressEmitter.js";
import { SocketMessageCategory } from "../socket.js";
import OpenAI from "openai";

dotenv.config();

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

const openAIClient = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});


export const callLLM = async(prompt = '') => {
  const model = genAI.getGenerativeModel({
    model: "gemini-3.1-pro-preview",
  });
  const result = await model.generateContent(prompt);
  return result;
}

export const convertWithAI = async (
  fileName,
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
 /* await openAIClient.responses.create({
  model: "gpt-4o-mini",
  input: prompt
});
*/
  let text =
    result.choices?.[0]?.message?.content || result.response?.candidates?.[0]?.content?.parts?.[0]?.text || 
  result.output_text ||"";

  console.log(`file ${fileName} prompt details i/p token ${result.usage?.prompt_tokens || result.response?.usageMetadata?.promptTokenCount || result.usage?.input_tokens}
   o/p token ${result.usage?.completion_tokens || result.response?.usageMetadata?.candidatesTokenCount || result.usage?.output_tokens} 
  cached token ${result.usage?.prompt_tokens_details?.cached_tokens|| result.usage?.input_tokens_details?.cached_tokens} total cost ${result.usage?.cost}`);

  
  const inputToken = result.usage?.prompt_tokens || result.response?.usageMetadata?.promptTokenCount || result.usage?.input_tokens;
  const outputToken = result.usage?.completion_tokens || result.response?.usageMetadata?.candidatesTokenCount || result.usage?.output_tokens;
  let tokenUsed = inputToken + outputToken;

  emitProgress('token utilization', `${tokenUsed}`, SocketMessageCategory.INFO);
  
  return {playwrightCode: cleanCode(text),
     tokenUsed}; 
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

===============================================
Known Selenium to Playwright Construct mappings
===============================================
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
- Ensure generated code fits a standard Playwright project structure with folders: tests/, pages/, utils/, base/.
- Use relative imports for page objects and utilities: e.g., import { LoginPage } from '../pages/LoginPage'.
- Generate TypeScript files with .ts extension.
- Generate package.json with @playwright/test, TypeScript, and other necessary dependencies.
- Convert Selenium Keys (e.g., Keys.ENTER, Keys.TAB) to Playwright keyboard actions: Use page.keyboard.press('Enter') or page.keyboard.type() for key inputs, and page.keyboard.down() for modifier keys like Shift or Ctrl.

================================
CONFIGURATION FILES
================================
- Include a playwright.config.ts with: testDir: './tests', use: { headless: true }, and any necessary browser configurations (e.g., projects: [{ name: 'chromium', use: { ... } }]).
- Include a tsconfig.json with: "target": "ESNext", "module": "commonjs", "strict": true, "esModuleInterop": true, "moduleResolution": "node", "resolveJsonModule": true, "outDir": "dist", and "include": ["tests", "pages", "utils", "base"].
- Ensure package.json has: "scripts": { "test": "playwright test", "install-browsers": "playwright install" }, and list @playwright/test and typescript as devDependencies with pinned versions (e.g., "@playwright/test": "^1.45.0").
====================================
ESSENTIAL ARTIFACTS AND INSTRUCTIONAL FILES
====================================
- Include a README.md with sections: Project Description, Prerequisites (Node.js, npm), Installation (npm install && npm run install-browsers), Running Tests (npm test), and any setup notes (e.g., environment variables).
- Add a package-lock.json (generated via npm install) to lock dependencies.
================================
PLAYWRIGHT RULES
================================
- Use @playwright/test
- Wrap in test(...) blocks
- Use fixtures only when needed
- Use async functions and await every action
- Use page.locator() over page.$ or direct selector strings when possible
- Use expect() for assertions
- Use Page Object Model: Encapsulate page interactions in classes with methods like async login(username, password).
- Include error handling: Use try-catch in tests and log failures appropriately.
- Generate a final Allure report.
========================================
MIGRATION RULES AND FIDELITY TO ORIGINAL
========================================
- Keep the Playwright test logic as close as possible to the original Selenium tests: Preserve test flow, assertions, and data usage.
- Maintain test data and configurations: Migrate any hardcoded values or external data sources (e.g., Excel readers) intact.
- Preserve comments and naming: Retain original comments, variable names, and method signatures where feasible.
- Handle unsupported features: If a Selenium feature has no direct Playwright equivalent, note it in comments and provide a workaround (e.g., for complex waits, use page.waitForFunction()).
- If additional coverage is needed, add one or two extra Playwright test cases that extend the same user journey without changing the original Selenium test flow.
- Keep the original test intact; any added cases must be additive and focused on complementary validations or missing assertions.
================================
ADDITIONAL QUALITY CHECKS
================================
- Ensure no syntax errors: All generated code must be valid TypeScript and runnable.
- Ensure code follows standard formatting.
- Make it self-contained: Avoid external dependencies beyond what's in package.json.
====================================
KNOWN PATTERN HANDLING INSTRUCTIONS
===================================
## AI Resolver Entries
- Convert TestNG DataProvider patterns into a 'for...of' loop where each dataset generates an independent named 'test()' block; if data comes from an external file and you't resolve it, insert a "Manual Review Recommended" comment in the final Allure report.
- Convert 'executeAsyncScript' calls into 'await page.evaluate(() => new Promise(resolve => { ...original logic...; resolve(); }))' wrapping the original callback logic.
- If DataProvider method body references a file reader utility, do not attempt data extraction - insert- "Manual Review Recommended: replace with Node fs/CSV read at the call site".
- Replace custom soft assertion wrapper methods with Playwright's native 'expect.soft(locator)' chaining; preserve all assertion messages as the second argument.
- Convert multi-window popup handling to 'const popupPromise = context.waitForEvent('page'); await triggerAction(); const popup = await popupPromise;'' pattern.
## Unsupported Entries
- If Robot Framework DSL keywords are detected, do not attempt migration — insert- "Manual Review Required: Robot Framework keyword '<name>' requires manual rewrite at each occurrence.
- Flag all RemoteWebDriver instantiation and Grid configuration as "Manual Review Required" and -replace with Playwright connect() or project-level device config in playwright.config.ts
- Flag all TestNG Listener classes and @Listeners annotations as '// UNSUPPORTED: implement equivalent using Playwright Allure report.
- Flag custom retry and polling wrapper methods as '// UNSUPPORTED: Playwright has built-in auto-retry on assertions and configurable timeout — evaluate if this wrapper is still needed'.
- All codes and constructs that cannot be directly mapped to Playwright equivalents should be flagged with "Manual Review Required" comments, and a brief note on the recommended Playwright approach if possible in the final Allure report.
===================================
OUTPUT
================================
Return ONLY valid Playwright TypeScript code that should be compile-ready and executable, adhering strictly to the above rules and conventions. The final generated project should have a Allure report.
;
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
