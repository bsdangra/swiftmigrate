import { buildContext } from "./dependencyResolver.js";
import { convertWithAI } from "./aiService.js";
import { validatePlaywrightCode } from "./validator.js";
import { emitProgress } from "./progressEmitter.js";
import { preprocess } from "../preprocess.js";
import { SocketMessageCategory } from "../socket.js";

import Bottleneck from "bottleneck";

const limiter = new Bottleneck({
  maxConcurrent: 1,
  minTime: 5000 // ~17 requests/min safe for free tier
});

// 🧠 Smart retry wrapper
async function safeConvert(fn, maxRetries = 3) {
  let attempt = 0;

  while (attempt < maxRetries) {
    try {
      return await fn();
    } catch (err) {
      attempt++;

      if (err.status === 429) {
        // 🔥 Extract retry delay from Gemini
        const retryInfo = err?.errorDetails?.find(e =>
          e["@type"]?.includes("RetryInfo")
        );

        let delay = 5000;

        if (retryInfo?.retryDelay) {
          delay = parseInt(retryInfo.retryDelay) * 1000;
        } else {
          delay = Math.pow(2, attempt) * 2000;
        }

        console.log(`⏳ Rate limited. Waiting ${delay}ms...`);
        await new Promise(res => setTimeout(res, delay));
      } else {
        throw err;
      }
    }
  }

  throw new Error("Max retries exceeded");
}


export async function processFiles(orderedFiles, dependencyGraph, methodContentMap) {
  const memory = {};
  const maxAttempts = 3;
  let totalTokenUsed = 0;

  for (const fileName of orderedFiles) {
    const node = dependencyGraph[fileName];
    const file = node.file;

    emitProgress(
      'conversion',
      `Converting ${fileName} to Playwright format...`,
      SocketMessageCategory.INFO,
      { file: fileName }
    );

    const context = buildContext(fileName, dependencyGraph, memory, methodContentMap);

    const dependencyCode = context.dependencies;
   
    const preprocessResult = preprocess(file.content);

    let attempt = 0;
    let playwrightCode = "";
    let generationOutput = "";
    let lastError = "";

    while (attempt < maxAttempts) {
      attempt++;

      emitProgress(
        'conversion',
        `Analyzing and generating Playwright code (attempt ${attempt})...`,
        SocketMessageCategory.WARN,
        { file: fileName, attempt }
      );

      // 🔥 Convert
      generationOutput = await convertWithAI(
        fileName,
        file.content,
        dependencyCode,
        lastError,
        preprocessResult
      );

      // generationOutput = await limiter.schedule(() =>
      //   safeConvert(() =>
      //     convertWithAI(
      //       fileName,
      //       file.content,
      //       dependencyCode,
      //       lastError,
      //       preprocessResult
      //     )
      //   )
      // );

      playwrightCode = generationOutput.playwrightCode;
      totalTokenUsed += generationOutput.tokenUsed || 0;

      // 🔥 Validate
      const validation = validatePlaywrightCode(playwrightCode, file.type);

      if (validation.valid) {
        emitProgress(
          'conversion',
          `${fileName} converted successfully`,
          SocketMessageCategory.SUCCESS,
          { file: fileName }
        );
        break;
      }

      emitProgress(
        'conversion',
        `Issue detected. Refining conversion...`,
        SocketMessageCategory.ERROR,
        { file: fileName, attempt, error: validation.error }
      );

      // 🔥 Prepare error for next retry
      lastError = `
Validation Failed:
${validation.error}

Fix the code accordingly.
`;
    }

    // 🔥 Store result
    memory[fileName] = {
      content: playwrightCode,
      type: context.type
    };
  }

  return {memory, totalTokenUsed};
}
