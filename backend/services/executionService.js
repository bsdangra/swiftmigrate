import { exec } from "child_process";
import util from "util";
import path from "path";
import { detectFailureType } from "../failureDetector.js";
import { convertWithAI } from "./aiService.js";
import { emitProgress } from "./progressEmitter.js";
import { SocketMessageCategory } from "../socket.js";
import fs from "fs-extra";

const execAsync = util.promisify(exec);

/** Runs a command and always resolves with exitCode (Playwright nonzero = test failures). */
function execWithExit(command, options = {}) {
  return new Promise((resolve) => {
    exec(command, options, (error, stdout, stderr) => {
      const code = error?.code;
      const exitCode = typeof code === "number" ? code : error ? 1 : 0;
      resolve({
        exitCode,
        stdout: String(stdout ?? ""),
        stderr: String(stderr ?? ""),
      });
    });
  });
}

async function generateAllureReport(projectPath) {
  try {
    await execAsync("npx allure generate ./allure-results --clean -o ./allure-report", {
      cwd: projectPath,
      maxBuffer: 1024 * 1024 * 10,
    });
  } catch (e) {
    console.warn("⚠️ Allure HTML report could not be generated:", e.stderr || e.message);
  }
}

// 🏃 Run Playwright project (results → Allure instead of HTML reporter)
export async function runPlaywrightProject(projectPath) {
  try {
    console.log("🚀 Installing dependencies...");

    await execAsync("npm install", { cwd: projectPath });

    await execAsync("npx playwright install", { cwd: projectPath });

    const resultsDir = path.join(projectPath, "allure-results");
    await fs.remove(resultsDir).catch(() => {});

    console.log("▶️ Running tests...");

    const { exitCode, stdout, stderr } = await execWithExit("npx playwright test", {
      cwd: projectPath,
      maxBuffer: 1024 * 1024 * 10,
    });

    await generateAllureReport(projectPath);

    const logs = [stdout, stderr].filter(Boolean).join("\n");

    if (exitCode === 0) {
      return { success: true, logs };
    }

    return {
      success: false,
      error: logs || stderr || `Playwright exited with code ${exitCode}`,
    };
  } catch (error) {
    return {
      success: false,
      error: error.stderr || error.stdout || error.message,
    };
  }
}

export async function runtimeSelfHeal(projectPath, totalTokenUsed, maxAttempts = 2) {
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

async function fixTestFiles(projectPath, errorContext, totalTokenUsed = 0) {
  const testsDir = path.join(projectPath, "tests");

  const files = await fs.readdir(testsDir);

  for (const file of files) {
    const filePath = path.join(testsDir, file);

    const content = await fs.readFile(filePath, "utf-8");

    console.log(`🛠 Fixing ${file}`);

    const generationOutput = await convertWithAI(
      content,
      "",               // no dependency code needed here
      errorContext,     // 🔥 runtime error
      null,
      content
    );
    const fixedCode = generationOutput.playwrightCode;
    totalTokenUsed += generationOutput.tokenUsed || 0;

    emitProgress('convert', `${totalTokenUsed}`, SocketMessageCategory.INFO);

    await fs.writeFile(filePath, fixedCode, "utf-8");
  }
}
