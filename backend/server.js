import dotenv from "dotenv";
import express from "express";
import cors from "cors";
import bodyParser from "body-parser";
import fs from "fs";
import { exec } from "child_process";

import { convertWithAI, explainChanges, verifyIntent } from "./services/aiService.js";
import { preprocess } from "./preprocess.js";
import { extractSteps } from "./intentUtils.js";
import { detectFailureType } from "./failureDetector.js";

dotenv.config();

const app = express();
app.use(cors());
app.use(bodyParser.json());

const PORT = 3000;
const FILE_PATH = "./temp/test.spec.ts";


// 🏃 Run Playwright helper
async function runPlaywright(filePath) {
  return new Promise((resolve) => {
    exec(
      `npx playwright test ${filePath} --timeout=10000`,
      (error, stdout, stderr) => {
        if (error) {
          return resolve({
            success: false,
            error: stderr || stdout,
          });
        }

        resolve({
          success: true,
          output: stdout,
        });
      }
    );
  });
}


// 🔁 Self-Healing Engine (CORE)
async function selfHeal(seleniumCode) {
  let playwrightCode = "";
  let lastError = "";
  let attempts = 0;
  const maxAttempts = 3;

  // ✅ NEW: Preprocess once
  const preprocessResult = preprocess(seleniumCode);
  const steps = extractSteps(seleniumCode);
  console.log("Preprocess issues:", preprocessResult.issues);
  console.log("Extracted steps:", steps);

  const migrationDiagnostics = {
    preprocessIssues: preprocessResult.issues,
    qualityScore: preprocessResult.score,
    intentCategories: steps,
  };

  while (attempts < maxAttempts) {
    attempts++;

    // 1. Convert / Fix using AI
    playwrightCode = await convertWithAI(
      seleniumCode, 
      lastError, 
      preprocessResult, 
      playwrightCode,
      steps);

    // 2. Save file
    fs.writeFileSync(FILE_PATH, playwrightCode);

    // 3. Execute test
    const result = await runPlaywright(FILE_PATH);

    if (result.success) {
      const verification = await verifyIntent(seleniumCode, playwrightCode);
      if (!verification.toLowerCase().includes("yes")) {
        console.log("⚠️ Intent lost, retrying...");
        lastError = `The generated Playwright code does NOT preserve original Selenium intent.
        Reason:${verification} Fix the code while preserving full user journey and validations.`;
        continue; // retry loop
      }
      const explanation = await explainChanges(seleniumCode, playwrightCode);
      return {
        success: true,
        playwrightCode,
        attempts,
        healed: attempts > 1,
        logs: result.output,
        explanation,
        ...migrationDiagnostics,
      };
    }

    // 4. Prepare error for next retry
    const failure = detectFailureType(result.error);

    lastError = `
    Previous Playwright code failed.

    Failure Type: ${failure.type}
    Reason: ${failure.message}

    Error:
    ${result.error}

    Known issues in original Selenium script:
    ${preprocessResult.issues.map(i => `- ${i.message}`).join("\n")}

    Recommended Fix Strategy:
    ${failure.fix}

    Fix the code so it runs successfully.
    `;
  }

  return {
    success: false,
    playwrightCode,
    attempts,
    healed: false,
    error: lastError,
    ...migrationDiagnostics,
  };
}


// 🔥 MAIN FEATURE: Convert + Run + Self-Heal
app.post("/convert-run", async (req, res) => {
  try {
    const { code } = req.body;

    const result = await selfHeal(code);

    res.json(result);
  } catch (err) {
    console.error(err);
    res.status(500).send("Convert + Run failed");
  }
});


app.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
});