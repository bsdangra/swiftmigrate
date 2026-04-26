import { exec } from "child_process";
import util from "util";
import path from "path";
import { detectFailureType } from "../failureDetector.js";
import { convertWithAI } from "./aiService.js";
import fs from "fs-extra";

const execAsync = util.promisify(exec);


// 🏃 Run Playwright project
export async function runPlaywrightProject(projectPath) {
  try {
    console.log("🚀 Installing dependencies...");

    await execAsync("npm install", { cwd: projectPath });

    await execAsync("npx playwright install", { cwd: projectPath });

    console.log("▶️ Running tests...");

    const { stdout } = await execAsync("npx playwright test --reporter=html", {
      cwd: projectPath,
      maxBuffer: 1024 * 1024 * 10
    });

    return {
      success: true,
      logs: stdout,
    };

  } catch (error) {
    return {
      success: false,
      error: error.stderr || error.stdout || error.message
    };
  }
}

export async function runtimeSelfHeal(projectPath, maxAttempts = 2) {
  let attempt = 0;
  let lastError = "";

  while (attempt < maxAttempts) {
    attempt++;

    console.log(`\n🔁 Runtime Attempt ${attempt}`);

    const result = await runPlaywrightProject(projectPath);

    if (result.success) {
      console.log("✅ Tests passed!");
      return {
        success: true,
        logs: result.logs,
        attempts: attempt
      };
    }

    console.log("❌ Test failed");

    const failure = detectFailureType(result.error);

    lastError = `
Failure Type: ${failure.type}
Reason: ${failure.message}

Error:
${result.error}

Fix Strategy:
${failure.fix}
`;

    console.log("🧠 Detected:", failure.type);

    // 🔥 Fix test files only (MVP)
    await fixTestFiles(projectPath, lastError);
  }

  return {
    success: false,
    error: lastError,
    attempts: maxAttempts
  };
}

async function fixTestFiles(projectPath, errorContext) {
  const testsDir = path.join(projectPath, "tests");

  const files = await fs.readdir(testsDir);

  for (const file of files) {
    const filePath = path.join(testsDir, file);

    const content = await fs.readFile(filePath, "utf-8");

    console.log(`🛠 Fixing ${file}`);

    const fixedCode = await convertWithAI(
      content,
      "",               // no dependency code needed here
      errorContext,     // 🔥 runtime error
      null,
      content
    );

    await fs.writeFile(filePath, fixedCode, "utf-8");
  }
}