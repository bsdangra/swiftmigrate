import dotenv from "dotenv";
import express from "express";
import cors from "cors";
import bodyParser from "body-parser";
import fs from "fs";
import { exec } from "child_process";
import multer from "multer";
import fsExtra from "fs-extra";
import AdmZip from "adm-zip";

import { convertWithAI, explainChanges, verifyIntent } from "./services/aiService.js";
import { preprocess } from "./preprocess.js";
import { extractSteps } from "./intentUtils.js";
import { detectFailureType } from "./failureDetector.js";
import { detectFramework, classifyFiles, mapTestsToPOMs, filterRelevantFiles } from "./utils/fileAnalyzer.js";
import { handleZip, detectFileType } from "./services/uploadService.js";
import { resolvePOMWithReport } from "./services/pomResolver.js";
import { buildDependencyGraph, topoSortWithBuckets, buildDependencyGraphWithUtil } from './services/dependencyResolver.js';
import { processFiles } from './services/conversionOrchestrator.js';
import { runtimeSelfHeal } from './services/executionService.js';
import { buildProject } from './services/projectBuilder.js'
import { validatePlaywrightCode } from "./services/validator.js";

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ limit: "50mb", extended: true }));

// Serve static files for reports
app.use("/report", express.static("./output/playwright-report"));

const upload = multer({ dest: "uploads/" });

const PORT = 3000;
const FILE_PATH = "./temp/test.spec.ts";
const ZIP_OUTPUT_DIR = "./zips";

// Ensure zip directory exists
if (!fs.existsSync(ZIP_OUTPUT_DIR)) {
  fs.mkdirSync(ZIP_OUTPUT_DIR, { recursive: true });
}


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
    if (!validatePlaywrightCode(playwrightCode)) {
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

//not being use currently
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
    const classIndex = {};   // shared map of class and path
    const methodContentMap = {};

    // 🔥 1. Extract ALL files first
    for (const file of uploadedFiles) {
      const { originalname, path: filePath } = file;

      // Skip macOS metadata files
      if (originalname.startsWith("._")) {
        continue;
      }

      if (originalname.endsWith(".zip")) {
        const extracted = await handleZip(filePath, classIndex, methodContentMap);
        // Filter out macOS metadata files from extracted files
        const filtered = extracted.filter(f => !f.fileName.startsWith("._"));
        allJavaFiles.push(...filtered);
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

    // 🔥 2. FILTER (after extraction)
    //const filteredFiles = filterRelevantFiles(allJavaFiles);
    const filteredFiles = allJavaFiles;

    // 🔥 3. Analyze
    const framework = detectFramework(filteredFiles);

    const classified = classifyFiles(filteredFiles);

    // 🔥 4. Map tests → POMs
    const mappedTests = mapTestsToPOMs(
      classified.testFiles,
      classified.pageObjects
    );

    // 🔥 5. Build dependency graph
    const dependencyGraph = buildDependencyGraph(
      mappedTests,
      classified.pageObjects,
      classified.baseClasses,
      classified.utils
    );

    // 🔥 6. Return structured response
    res.json({
      framework,
      summary: {
        totalFiles: filteredFiles.length,
        tests: classified.testFiles.length,
        pages: classified.pageObjects.length,
        base: classified.baseClasses.length,
        utils: classified.utils.length,
      },
      classified,
      mappedTests,
      dependencyGraph,   // 👈 IMPORTANT
      methodContentMap
    });

  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Upload failed" });
  }
});

app.post("/process-project", async (req, res) => {
  try {
    const { dependencyGraph, methodContentMap } = req.body;

    // 🔥 STEP 1 — ORDER FILES
    //const orderedFiles = topoSort(dependencyGraph);
    const { ordered, unordered } = topoSortWithBuckets(dependencyGraph);

    console.log("✅ Ordered:", ordered);
    console.log("⚠️ Unordered:", unordered);

    // 🚨 Guard: nothing to process
    if (ordered.length === 0) {
      return res.status(400).json({
        success: false,
        message: "No valid files to process",
        unordered
      });
    }

    //🔥 STEP 2 + 3 — CONVERT FILES
    const convertedFiles = await processFiles(
      ordered,
      dependencyGraph,
      methodContentMap
    );

    // 🔥 Generate project
    const projectPath = await buildProject(convertedFiles);

    // 🔥 Runtime execution + healing
    const executionResult = await runtimeSelfHeal(projectPath);

    // 🔥 Create zip of project
    const zipPath = await zipProject(projectPath);

    res.json({
      success: executionResult.success,
      attempts: executionResult.attempts,
      logs: executionResult.logs,
      error: executionResult.error,
      projectPath,
      zipPath,
      reportPath: "/report",
      ordered,
      unordered,
      convertedCount: Object.keys(convertedFiles).length
    });

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Processing failed" });
  }
});


// 🔥 Create zip of project
async function zipProject(projectPath) {
  // Generate unique filename with timestamp
  const timestamp = Date.now();
  const zipFilename = `project-${timestamp}.zip`;
  const zipPath = `${ZIP_OUTPUT_DIR}/${zipFilename}`;
  const zip = new AdmZip();

  try {
    // Add entire project directory to zip, excluding node_modules
    zip.addLocalFolder(projectPath, "", (file) => {
      // Skip node_modules and other unnecessary directories
      return !file.includes("node_modules") && 
             !file.includes(".git") && 
             !file.includes(".next") &&
             !file.includes("dist") &&
             !file.includes("build");
    });
    
    zip.writeZip(zipPath);
    console.log(`✅ Project zipped (excluded: node_modules, .git, .next, dist, build): ${zipPath}`);
    // Return only the filename, not the full path
    return zipFilename;
  } catch (error) {
    console.error("Zip error:", error);
    throw error;
  }
}

// 🔥 Download project zip
app.get("/download/:zipName", (req, res) => {
  // zipName should be just the filename (e.g., project-1234567890.zip)
  const zipPath = `${ZIP_OUTPUT_DIR}/${req.params.zipName}`;
  console.log(`Attempting to download: ${zipPath}`);

  if (!fs.existsSync(zipPath)) {
    return res.status(404).json({ error: `Zip file not found: ${zipPath}` });
  }

  res.download(zipPath, req.params.zipName, (err) => {
    if (err) {
      console.error("Download error:", err);
    }
  });
});

app.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
});
