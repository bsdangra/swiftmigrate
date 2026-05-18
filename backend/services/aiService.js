import { GoogleGenerativeAI } from "@google/generative-ai";
import dotenv from "dotenv";
import { emitProgress } from "./progressEmitter.js";
import { SocketMessageCategory } from "../socket.js";
import OpenAI from "openai";
import Anthropic from '@anthropic-ai/sdk';

dotenv.config();

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

const openAIClient = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const anthropic = new Anthropic({
  apiKey: KEY,
});

const openRouterAIClient = new OpenAI({
  baseURL: "https://openrouter.ai/api/v1",
//  baseURL: "https://dashscope-intl.aliyuncs.com/compatible-mode/v1",
  apiKey: Key, 
});



export const callLLM = async(prompt = '') => {
  const model = genAI.getGenerativeModel({
    model: "gemini-3.1-pro-preview",
  });
  const result = await model.generateContent(prompt);
  return result;
}

export const criticLLMGPT = {
  client: openAIClient,
  model: "gpt-5.4",

 async chat(messages) {
        try {
            const result = await this.client.chat.completions.create({
                model: this.model,
                messages: messages,
                temperature: 0.2, 
            });
           const responseContent =  result.choices?.[0]?.message?.content || result.response?.candidates?.[0]?.content?.parts?.[0]?.text || 
  result.output_text ||"";
            return responseContent;

        } catch (error) {
            console.error("LLM Error:", error.message);
            throw error;
        }
    }
  }

export const criticLLM = {
  // Use 'claude-3-5-sonnet-20240620' for high-accuracy migration tasks
  modelName: "claude-sonnet-4-6", 
//"claude-3-5-sonnet-latest",
  async chat(messages) {
    try {
      // 1. Extract the system message (Claude requires this as a separate param)
      const systemMessage = messages.find(m => m.role === 'system')?.content || "";
      
      // 2. Filter out system messages from the main conversation array
      const userMessages = messages.filter(m => m.role !== 'system');

      // 3. Call the Claude Messages API
      const response = await anthropic.messages.create({
        model: this.modelName,
        max_tokens: 4096,
        system: systemMessage, // Pass system instructions here
        messages: userMessages,
        temperature: 0.1,
      });

      // 4. Extract the text content
      // Claude returns an array of content blocks; we want the text block
      const responseContent = response.content.find(block => block.type === 'text')?.text || "";

      console.log(`Raw Claude Response: ${responseContent}`);
      return responseContent;

    } catch (error) {
      console.error("Claude LLM Error:", error.message);
      throw error;
    }
  }
};

export const convertWithAI = async (
  attempt,
  fileName,
  fileType,
  seleniumCode,
  dependencyCode = "",
  errorContext = "",
  preprocessResult = null,
  previousPlaywrightCode = "",
  criticReview,
  report
) => {
  const model = genAI.getGenerativeModel({
    model: "gemini-3.1-pro-preview",
    //model: "gemini-3.1-flash-lite-preview",
  });

  const normalizedDependencyCode = normalizeCodeInput(dependencyCode);
  
  let prompt ;
  if(attempt === 0){ 
    prompt = buildPrompt({
    fileName,
	fileType,
    seleniumCode,
    dependencyCode,
    errorContext,
    preprocessResult,
    previousPlaywrightCode,
  });
  } else {
  prompt = buildRefinementPrompt(seleniumCode, previousPlaywrightCode, criticReview,  report);
  console.log(`prompt for attempt ${attempt} is ${JSON.stringify(prompt)}`)
}


  const result =// await model.generateContent(prompt);
 /* await openAIClient.responses.create({
  model: "gpt-4o-mini",
  input: prompt
});*/
await openRouterAIClient.chat.completions.create({
    model: "openai/gpt-4.1-mini",
    messages: [{ role: "user", content: prompt }],
  });
//console.log(`generator response for attempt ${attempt} is ${JSON.stringify(result)}`)
  let text =
    result.choices?.[0]?.message?.content || result.response?.candidates?.[0]?.content?.parts?.[0]?.text || 
  result.output_text ||"";

  console.log(`file ${fileName} prompt details i/p token ${result.usage?.prompt_tokens || result.response?.usageMetadata?.promptTokenCount || result.usage?.input_tokens}
   o/p token ${result.usage?.completion_tokens || result.response?.usageMetadata?.candidatesTokenCount || result.usage?.output_tokens} 
  cached token ${result.usage?.prompt_tokens_details?.cached_tokens|| result.usage?.input_tokens_details?.cached_tokens} total cost ${result.usage?.cost}`);

  
  const inputToken = result.usage?.prompt_tokens || result.response?.usageMetadata?.promptTokenCount || result.usage?.input_tokens;
  const outputToken = result.usage?.completion_tokens || result.response?.usageMetadata?.candidatesTokenCount || result.usage?.output_tokens;
  let tokenUsed = inputToken + outputToken;

  emitProgress('done', `token utilization - ${tokenUsed}`, SocketMessageCategory.INFO);
  
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

function buildRefinementPrompt(java, lastTs, criticReview, report) {
    return `
    ### REVISE MIGRATION
    Your last attempt scored ${report.accuracyScore} accuracy. Logic is missing.
    
    SOURCE:
    ${java}
    
    LAST ATTEMPT:
    ${lastTs}
    
    REQUIRED FIXES:
    ${criticReview}
    
    MISSING SYMBOLS:
${report.missingFromTs || "None"}
    
    Please output the full corrected TypeScript file having only valid code.Do not add any explanations or apologies, do not include conersion at beigning or end of the code. The output should be in the exact format as required by the rules above.
    `;
}

function buildPrompt({
  fileName,
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
Convert Selenium-Java files into Playwright TypeScript.
================================
Files (SOURCE OF TRUTH)
================================
${seleniumCode} 
================================
PAGE OBJECTS (RELEVANT ONLY)
================================
${dependencyCode || "No dependencies provided"} 
================================
KNOWN Selenium Java to Playwright Typescript mappings
================================
${preprocessResult?.issues?.map(i => `- ${i.message}`).join("\n") || "None"}
================================
RULES (STRICT)
================================
- Preserve full test flow. All actions and assertions must be retained.
- Use locators ONLY from the Page Object classes. Do NOT invent new locators.
- Inline POM methods logically. 
- Include page.goto() only if the test involves opening the application or login flow.
- Always wait for elements before interacting (waitFor or expect).
- UTILITY CLASSIFICATION: If the input is a utility class(e.g., Retry, Log, Constants), generate ONLY a TypeScript class or exported constants.
- DO NOT wrap Utility/Helper classes in Playwright test(...) blocks. 
- DO NOT add page.goto(), locators, or browser interactions to Utility files.
- TEST FILES: Only use test(...) wrappers and async ({ page }) fixtures if the source is 
an actual test class or a suite (e.g., contains @Test).
- Preserve original method names, logic flow, and variable assignments exactly.
- Do NOT mock steps to fill a "test flow."
- The import of any class (within any page class or test class),
 which is required for completing the test flow, must happen from the root of the output project. 
 EXAMPLE 1- import { Log } from "../utils/Log"; Here "../utils" marks the true path 
 of the file from the root of the project. 
 EXAMPLE 2- import { RecruitmentPage } from '../pages/RecruitmentPage' NOT import { RecruitmentPage } from './RecruitmentPage'. All imports must 
 reflect the actual path from the root of the project, even if it means adding imports 
 for classes that were not originally imported in the Selenium code.
 - Keep the original test intact; any added cases must be additive and focused on complementary validations or missing assertions.  
================================
PLAYWRIGHT RULES
================================
- Use @playwright/test
- Wrap in test(...)
- Use async/await
- Prefer page.locator()
- Use expect() for assertions
- Page object class instance MUST contain appropriate fixtures. 
	EXAMPLE: CORRECT- loginPage = new LoginPage(page); NOT-  loginPage = new LoginPage();
- DON'T ADD Unnecessary arguments in any of the functions: 
	EXAMPLE:  
  EXPECTED- 
  loginPage = new LoginPage(page);
	expect(true).toBe(false);		
  NOT-
  await loginPage.loginToApp(page, username, password);
  expect(true).toBe(false, "Could not login."); Here "Could not login" is an extra argument which is NOT required.
- Convert the first letter of every function to small letter to avoid naming conflicts. 
 EXAMPLE:
 Convert ClickOnUserName(page) to clickOnUserName(page);
================================
OUTPUT
================================
Return ONLY Playwright code
`;}

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
