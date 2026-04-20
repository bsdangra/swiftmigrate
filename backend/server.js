import dotenv from "dotenv";
import express from "express";
import cors from "cors";
import bodyParser from "body-parser";
import multer from "multer";
import JSZip from "jszip";
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

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 50 * 1024 * 1024 },
});

const PORT = 3000;
const FILE_PATH = "./temp/test.spec.ts";

function mergeJavaSourcesForUpload(files) {
  const sorted = [...files].sort((a, b) =>
    a.relativePath.localeCompare(b.relativePath, undefined, { sensitivity: "base" })
  );
  return sorted
    .map(
      (f) =>
        `// ========== FILE: ${f.relativePath} ==========\n${String(f.content).replace(/\s+$/, "")}\n`
    )
    .join("\n");
}

async function bufferToJavaParts(buffer, originalName) {
  const lower = String(originalName).toLowerCase();
  const out = [];
  if (lower.endsWith(".zip")) {
    const zip = await JSZip.loadAsync(buffer);
    for (const entry of Object.values(zip.files)) {
      if (entry.dir) continue;
      const path = entry.name.replace(/\\/g, "/");
      if (!path.toLowerCase().endsWith(".java")) continue;
      const content = await entry.async("string");
      out.push({ relativePath: path, content });
    }
    return out;
  }
  if (lower.endsWith(".java")) {
    out.push({
      relativePath: originalName,
      content: buffer.toString("utf8"),
    });
  }
  return out;
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
    const { code, test, mappedPOMs } = req.body;
    let seleniumCode = code ?? test ?? "";
    if (
      mappedPOMs !== undefined &&
      mappedPOMs !== null &&
      Array.isArray(mappedPOMs) &&
      mappedPOMs.length > 0
    ) {
      seleniumCode +=
        "\n\n// === Context: mapped POMs ===\n" +
        JSON.stringify(mappedPOMs, null, 2);
    }

    const result = await selfHeal(seleniumCode);

    res.json(result);
  } catch (err) {
    console.error(err);
    res.status(500).send("Convert + Run failed");
  }
});

// Multi-file / ZIP ingest (same merge semantics as frontend)
app.post("/upload", upload.array("files"), async (req, res) => {
  try {
    const files = req.files || [];
    const collected = [];

    for (const f of files) {
      const parts = await bufferToJavaParts(f.buffer, f.originalname);
      collected.push(...parts);
    }

    if (!collected.length) {
      return res.status(400).json({
        error: "No .java sources found",
        tests: [],
        sources: [],
      });
    }

    const seen = new Set();
    const deduped = [];
    for (const p of collected) {
      if (seen.has(p.relativePath)) continue;
      seen.add(p.relativePath);
      deduped.push(p);
    }

    const sources = deduped.map((p) => ({
      name: p.relativePath.split("/").pop() || p.relativePath,
      relativePath: p.relativePath,
      content: p.content,
    }));

    const merged = mergeJavaSourcesForUpload(sources);

    res.json({
      tests: [{ content: merged, mappedPOMs: [] }],
      sources,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Upload failed", tests: [], sources: [] });
  }
});

app.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
});