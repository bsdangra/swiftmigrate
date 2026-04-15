import { GoogleGenerativeAI } from "@google/generative-ai";
import dotenv from "dotenv";

dotenv.config();

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);


export const convertWithAI = async (
  seleniumCode,
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
  errorContext,
  preprocessResult,
  previousPlaywrightCode,
  steps
}) {
  return `
${baseBlock()}
${optimizationBlock()}
${safetyBlock()}
${intentBlock(steps)}
${preprocessBlock(preprocessResult)}
${repairBlock(previousPlaywrightCode)}
${failureBlock(errorContext)}

Selenium Code (SOURCE OF TRUTH):
${seleniumCode}
`;
}

function baseBlock() {
  return `
Convert Selenium Java test into Playwright TypeScript.

CRITICAL REQUIREMENT:
- Preserve user journey
- Do NOT skip steps unless absolutely invalid
- Replace failing steps with safe alternatives
- Selenium is SOURCE OF TRUTH

SAFETY OVERRIDES ALL OTHER RULES

STRICT RULES:
- MUST use @playwright/test
- MUST wrap inside test('name', async ({ page }) => {})
- MUST be runnable
- Use async/await
- Prefer getByRole/getByText/getByLabel
- NO explanations
- RETURN ONLY CODE
`;
}

function optimizationBlock() {
  return `
OPTIMIZATION:
- Avoid redundant checks (no waitFor + count together)
- Prefer locator.count()
- Avoid unnecessary try-catch
- Prefer meaningful assertions

ASSERTION RULES:
- Prefer validating visible content (text, headings)
- Avoid generic assertions like title unless no better option
- Use page.locator() based assertions when possible

`;
}

function safetyBlock() {
  return `
SAFE INTERACTION (MANDATORY):
- NEVER interact without checking existence

Pattern:
const el = page.locator('selector');

if (await el.count() > 0) {
  await el.click();
} else {
  await expect(page).toHaveTitle(/expected/i);
}

- If element missing:
  → DO NOT fail
  → DO NOT skip flow
  → fallback to validation
`;
}

function intentBlock(steps) {
  if (!steps?.length) return "";

  return `
TEST INTENT:
${steps.map(s => `- ${s}`).join("\n")}
`;
}

function preprocessBlock(preprocessResult) {
  if (!preprocessResult?.promptHints?.length) return "";

  return `
CODE ISSUES DETECTED:
${preprocessResult.promptHints.map(h => `- ${h}`).join("\n")}
`;
}

function repairBlock(previousPlaywrightCode) {
  if (!previousPlaywrightCode) return "";

  return `
FIX THIS EXISTING CODE (DO NOT REWRITE):
${previousPlaywrightCode}

RULES:
- Preserve working parts
- Modify only failing sections
- Do NOT remove steps
- Convert failing locators into safe interaction
`;
}

function failureBlock(errorContext) {
  if (!errorContext) return "";

  return `
RUNTIME FAILURE:

${errorContext}

FIX STRATEGY:
- Identify failing step
- Missing element → use safe interaction
- Weak locator → improve selector
- Invalid action → replace with validation
`;
}


// export const convertWithAI = async (
//   seleniumCode, 
//   errorContext = "", 
//   preprocessResult = null,
//   previousPlaywrightCode = "",
//   steps = []
// ) => {
//   const model = genAI.getGenerativeModel({
//     model: "gemini-3.1-pro-preview",
//   });

//   const prompt = `
// Convert Selenium Java test into Playwright TypeScript.

// CRITICAL REQUIREMENT:
// - The Playwright test MUST cover the same user journey as Selenium
// - Do NOT skip steps unless absolutely invalid
// - If a step fails, replace it with equivalent safe logic (not remove it)
// - Selenium code is the SOURCE OF TRUTH for intent

// OPTIMIZATION RULES:
// - Avoid redundant checks (do NOT use both waitFor and count)
// - Prefer simple conditional checks using locator.count()
// - Avoid unnecessary try-catch unless required
// - Prefer meaningful assertions (text/content) over generic ones

// STRICT RULES:
// - MUST use @playwright/test
// - MUST wrap inside test('name', async ({ page }) => {})
// - MUST be directly runnable
// - Use async/await
// - Prefer robust selectors:
//   - page.getByRole()
//   - page.getByText()
//   - page.getByLabel()
// - Avoid brittle selectors like random IDs unless clearly valid
// - NO explanations
// - NO markdown
// - RETURN ONLY CODE

// MANDATORY SAFETY RULE (VERY IMPORTANT):
// - NEVER directly interact with elements (click/type) without checking existence
// - ALWAYS use safe interaction pattern:

// Example:
// const el = page.locator('selector');
// if (await el.count() > 0) {
//   await el.click(); // or type/fill
// } else {
//   // fallback validation
//   await expect(page).toHaveTitle(/expected/i);
// }

// - If element does NOT exist:
//   → DO NOT throw error
//   → DO NOT skip the flow
//   → Replace with fallback validation (title or visible text)

// ${
//   steps?.length
//     ? `
// TEST INTENT (MUST BE PRESERVED):
// The Playwright test MUST include:
// ${steps.map(s => `- ${s}`).join("\n")}
// `
//     : ""
// }

// ${
//   preprocessResult?.promptHints?.length
//     ? `
// ADDITIONAL INSTRUCTIONS BASED ON CODE ANALYSIS:
// ${preprocessResult.promptHints.map(h => `- ${h}`).join("\n")}
// `
//     : ""
// }

// ${
//   previousPlaywrightCode
//     ? `
// PREVIOUS PLAYWRIGHT CODE (FAILED):
// ${previousPlaywrightCode}

// IMPORTANT REPAIR INSTRUCTIONS:
// - Fix this existing Playwright code instead of rewriting from scratch
// - Preserve working parts
// - Only modify failing sections
// - Do NOT remove steps unless absolutely invalid
// - If a locator fails:
//   → convert it into safe interaction (count() check + fallback)
// `
//     : ""
// }

// ${
//   errorContext
//     ? `
// RUNTIME FAILURE CONTEXT:

// Error:
// ${errorContext}

// FIX STRATEGY:
// - Identify failing step
// - If failure is due to missing element:
//   → Replace direct interaction with safe conditional logic
// - If locator is weak:
//   → Improve selector (role/text/label)
// - If action is invalid:
//   → Replace with equivalent validation
// `
//     : ""
// }

// Selenium Code (SOURCE OF TRUTH):
// ${seleniumCode}
// `;

//   const result = await model.generateContent(prompt);

//   let text =
//     result.response?.candidates?.[0]?.content?.parts?.[0]?.text || "";

//   return cleanCode(text);
// };

export const explainChanges = async (seleniumCode, playwrightCode) => {
  const model = genAI.getGenerativeModel({
    model: "gemini-3.1-pro-preview",
  });

  const prompt = `
Compare Selenium and Playwright code.

Explain in 3-4 bullet points:
- What changed
- Why changes were made
- Any fixes applied (like invalid selectors)

Keep it simple, developer-friendly.

Selenium:
${seleniumCode}

Playwright:
${playwrightCode}
`;

  const result = await model.generateContent(prompt);

  return result.response?.candidates?.[0]?.content?.parts?.[0]?.text || "";
};

export const verifyIntent = async (seleniumCode, playwrightCode) => {
  const model = genAI.getGenerativeModel({
    model: "gemini-3.1-pro-preview",
  });

  const prompt = `
Compare Selenium and Playwright test.

Does the Playwright test preserve:
- same user journey
- same key actions (click, input, navigation)
- same validations

Answer ONLY:
YES or NO

If NO, give short reason.

Selenium:
${seleniumCode}

Playwright:
${playwrightCode}
`;

  const result = await model.generateContent(prompt);

  return result.response?.candidates?.[0]?.content?.parts?.[0]?.text || "";
};


// 🔧 Clean AI output (VERY IMPORTANT)
function cleanCode(code) {
  return code
    .replace(/```[a-z]*\n?/gi, "")
    .replace(/```/g, "")
    .trim();
}