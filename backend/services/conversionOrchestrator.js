import { buildContext } from "./dependencyResolver.js";
import { convertWithAI } from "./aiService.js";
import { validatePlaywrightCode } from "./validator.js";
import { emitProgress } from "./progressEmitter.js";
import { preprocess } from "../preprocess.js";
import { SocketMessageCategory } from "../socket.js";
import { AstAnalyzer } from '../utils/AstAnalyzer.js';
import { AccuracyPipeline } from '../utils/AccuracyPipeline.js';
import { CriticAgent } from './criticAiService.js';

import Bottleneck from "bottleneck";

const limiter = new Bottleneck({
  maxConcurrent: 1,
  minTime: 5000 // ~17 requests/min safe for free tier
});

const criticAgent = new CriticAgent();
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
  const allReports = [];

  for (const fileName of orderedFiles) {
    const node = dependencyGraph[fileName];
    const file = node.file;

    emitProgress(
      'conversion',
      `Converting ${fileName} to Playwright format...`,
      SocketMessageCategory.INFO,
      { file: fileName }
    );

    let result;
    let feedback = "Initial generation.";
    const context = buildContext(fileName, dependencyGraph, memory, methodContentMap);

    const dependencyCode = context.dependencies;
   
    const preprocessResult = preprocess(file.content);

    let attempt = 0;
    let playwrightCode = "";
    let generationOutput = "";
    let lastError = "";

    while (attempt < maxAttempts) {

      emitProgress(
        'conversion',
        `Analyzing and generating Playwright code (attempt ${attempt})...`,
        SocketMessageCategory.WARN,
        { file: fileName, attempt }
      );

      // 🔥 Convert
      generationOutput = await convertWithAI(
        attempt,
        fileName,
        file.content,
        dependencyCode,
        lastError,
        preprocessResult,
        playwrightCode,
        feedback,
        result
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

       result = AccuracyPipeline.analyzeFile(file.type, file.fileName, file.content, playwrightCode);
      console.log(`AccuracyPipeline result: ${JSON.stringify(result)}`)
      // 3. CRITIC: Reasoning check
    const review = await criticAgent.analyze(file.content, playwrightCode, result);
    console.log(`Critic feedback: ${JSON.stringify(review)}`);
    if (review.isApproved) {
        console.log("✅ Migration Approved!");
        break;
    } else {
        console.log(`❌ Attempt ${attempt + 1} Rejected.`);
        feedback = review.feedback; // Pass critic's comments back to generator
        attempt++;
    }
      // 🔥 Validate
/*      const validation = validatePlaywrightCode(playwrightCode, file.type);

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
`;*/
    }
allReports.push(result)
    // 🔥 Store result
    memory[fileName] = {
      content: playwrightCode,
      type: context.type
    };
  }
const summary = AccuracyPipeline.summarize(allReports);

console.log('\n══════════════════════════════════════════');
console.log('  PROJECT ACCURACY SUMMARY');
console.log('══════════════════════════════════════════');
console.log(`Project accuracy:  ${summary.projectAccuracy}  [${summary.confidence}]`);
console.log(`Total files:       ${summary.totalFiles}`);
console.log(`Scored files:      ${summary.scoredFiles}`);
console.log(`Exempted files:    ${summary.exemptedFiles}`);
console.log(`Status breakdown:  ${JSON.stringify(summary.statusBreakdown, null, 2)}`);

if (summary.incompleteGenerations.length > 0) {
  console.log('\n❌ Files needing re-generation:');
  for (const f of summary.incompleteGenerations) {
    console.log(`   ${f.fileName} → ${f.retryStrategy}`);
  }
}

if (summary.failedAccuracyFiles.length > 0) {
  console.log('\n⚠️  Files failing accuracy threshold:');
  for (const f of summary.failedAccuracyFiles) {
    console.log(`   ${f.fileName} (${f.score}) — missing: ${f.missingFromTs?.join(', ')}`);
  }
}

if (summary.behavioralReviewRequired.length > 0) {
  console.log('\n🔬 Files requiring behavioral (runtime) review:');
  for (const f of summary.behavioralReviewRequired) {
    console.log(`   ${f.fileName} — ${f.reason}`);
  }
}

  return {memory, totalTokenUsed};
}
