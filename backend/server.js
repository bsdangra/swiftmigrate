import dotenv from "dotenv";
import express from "express";
import cors from "cors";
import bodyParser from "body-parser";
import fs from "fs";
import { exec } from "child_process";
import multer from "multer";
import fsExtra from "fs-extra";

import { convertWithAI, explainChanges, verifyIntent } from "./services/aiService.js";
import { preprocess } from "./preprocess.js";
import { extractSteps } from "./intentUtils.js";
import { detectFailureType } from "./failureDetector.js";
import { detectFramework, classifyFiles, mapTestsToPOMs } from "./utils/fileAnalyzer.js";
import { handleZip, detectFileType } from "./services/uploadService.js";
import { resolvePOMWithReport } from "./services/pomResolver.js";

dotenv.config();

const app = express();
app.use(cors());
app.use(bodyParser.json());

const upload = multer({ dest: "uploads/" });

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
async function selfHeal(seleniumCode, pageObjects = []) {
  let playwrightCode = "";
  let lastError = "";
  let attempts = 0;
  const maxAttempts = 3;

  const seenErrors = new Set(); // 🔥 NEW

  const preprocessResult = preprocess(seleniumCode);
  const steps = extractSteps(seleniumCode);

  while (attempts < maxAttempts) {
    attempts++;

    console.log(`\n🔁 Attempt ${attempts}`);

    // 🔥 1. Avoid useless retry
    if (seenErrors.has(lastError)) {
      console.log("⚠️ Same error repeated. Stopping early.");
      break;
    }
    if (lastError) seenErrors.add(lastError);

    // 🔥 2. Convert / Fix using AI
    playwrightCode = await convertWithAI(
      seleniumCode,
      pageObjects,
      lastError,
      preprocessResult,
      playwrightCode,
      steps
    );

    // 🔥 3. Fast validation BEFORE running Playwright
    if (!isValidPlaywrightCode(playwrightCode)) {
      console.log("❌ Invalid Playwright code generated. Retrying...");
      lastError = "Generated code is invalid or incomplete.";
      continue;
    }

    // 4. Save file
    fs.writeFileSync(FILE_PATH, playwrightCode);

    // 5. Execute test
    const result = await runPlaywright(FILE_PATH);

    if (result.success) {
      // 🔥 6. Verify intent ONLY on final success
      const verification = await verifyIntent(seleniumCode, playwrightCode);

      if (!verification.toLowerCase().includes("yes")) {
        console.log("⚠️ Intent lost, retrying...");
        lastError = `Intent mismatch: ${verification}`;
        continue;
      }

      const explanation = await explainChanges(seleniumCode, playwrightCode);

      return {
        success: true,
        playwrightCode,
        attempts,
        healed: attempts > 1,
        logs: result.output,
        explanation
      };
    }

    // 🔥 7. Smarter failure handling
    const failure = detectFailureType(result.error);

    lastError = `
Failure Type: ${failure.type}
Reason: ${failure.message}

Error:
${result.error}

Fix Strategy:
${failure.fix}
`;
  }

  return {
    success: false,
    playwrightCode,
    attempts,
    healed: false,
    error: lastError,
  };
}


// 🔥 MAIN FEATURE: Convert + Run + Self-Heal
app.post("/convert-run", async (req, res) => {
  try {
    const { test, mappedPOMs } = req.body;

    // Send to AI
    const result = await selfHeal(test, mappedPOMs);

    res.json(result);
  } catch (err) {
    console.error(err);
    res.status(500).send("Convert + Run failed");
  }
});

app.post("/upload", upload.array("files"), async (req, res) => {
  try {
    const uploadedFiles = req.files;
    let allJavaFiles = [];

    for (const file of uploadedFiles) {
      const { originalname, path: filePath } = file;

      if (originalname.endsWith(".zip")) {
        const extracted = await handleZip(filePath);
        allJavaFiles.push(...extracted);
      } 
      else if (originalname.endsWith(".java")) {
        const content = await fsExtra.readFile(filePath, "utf-8");

        allJavaFiles.push({
          fileName: originalname,
          content,
          type: detectFileType(content),
        });
      }
    }

    // ✅ NEW: Analyze inside upload
    const framework = detectFramework(allJavaFiles);
    const classified = classifyFiles(allJavaFiles);

    const mappedTests = mapTestsToPOMs(
      classified.testFiles,
      classified.pageObjects
    );

    // ✅ Final response (CLEAN STRUCTURE)
    res.json({
      framework,
      tests: mappedTests,
    });

  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Upload failed" });
  }
});

function isValidPlaywrightCode(code) {
  if (!code) return false;

  return (
    code.includes("test(") &&
    code.includes("await") &&
    code.includes("page")
  );
}

app.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
});