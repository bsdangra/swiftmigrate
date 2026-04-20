function buildPrompt({
  seleniumCode,
  pageObjects,
  errorContext,
  preprocessResult,
  previousPlaywrightCode,
  steps
}) {
  return `
${baseBlock()}
${pomBlock(pageObjects)}
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

function pomBlock(pageObjects) {
  if (!pageObjects?.length) return "";

  return `
========================
🔹 PAGE OBJECTS (VERY IMPORTANT)
========================

These contain actual locators and logic.
Use them to understand and inline behavior.

${pageObjects.map(p => `
File: ${p.fileName}
--------------------
${p.content}
`).join("\n\n")}

RULES:
- DO NOT ignore Page Objects
- Use locators from these files
- Inline logic where needed
- DO NOT invent selectors
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