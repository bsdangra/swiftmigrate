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

/**
 * Modified confidence calculation with "Critic Rescue" logic.
 * The Critic's approval can override low AST scores if logic parity is confirmed.
 */
function calculateConfidence(accuracyReport, iterationCount, criticReview = null) {
    const baseAccuracy = getSafeAccuracyScore(accuracyReport);
    
    let finalScore = baseAccuracy;
    let overrideActive = false;

    // 1. Handle EXEMPT status (Constants/Empty)
    if (accuracyReport.pipelineStatus === 'EXEMPT') {
        return { score: 100, label: "EXEMPT", detail: "Structural parity not applicable." };
    }

    // 2. CRITIC RESCUE LOGIC (The "Weightage" shift)
    // If AST says incomplete but Critic approves, we 'rescue' the score.
    if (criticReview?.isApproved) {
        if (accuracyReport.pipelineStatus === 'GENERATION_INCOMPLETE' || baseAccuracy < 70) {
            // Boost the score to a "Passing" baseline because the human-like agent verified it
            finalScore = Math.max(baseAccuracy, 80); 
            overrideActive = true;
        } else {
            // Standard boost for already high scores
            finalScore += 10;
        }
    } else if (criticReview && !criticReview.isApproved) {
        // Harsh penalty for Critic rejection regardless of AST
        finalScore -= 40;
    }

    // 3. Handle Critical Gaps (Only if Critic also didn't approve)
    if (accuracyReport.pipelineStatus === 'GENERATION_INCOMPLETE' && (!criticReview || !criticReview.isApproved)) {
        return { score: 0, label: "FAILED", detail: "Structural gaps detected and not cleared by Critic." };
    }

    // 4. Apply standard penalties to the (potentially rescued) score
    const iterationPenalty = (iterationCount - 1) * 5; // Reduced penalty to favor successful retries
    finalScore -= iterationPenalty;

    if (accuracyReport.scoringMode === 'BEHAVIORAL_ONLY') {
        finalScore -= 5;
    }

    // Ensure bounds
    const clampedScore = Math.max(0, Math.min(100, finalScore));
    finalScore = Number(clampedScore.toFixed(4));

    // 5. Dynamic Labeling
    let label;
    let detailPrefix = overrideActive ? "Critic Override (Logic Verified): " : `Verified via ${accuracyReport.scoringMode}: `;

    if (finalScore >= 85) {
        label = "HIGH";
    } else if (finalScore >= 60) {
        label = "MEDIUM";
    } else {
        label = "MANUAL REVIEW REQUIRED";
    }

    // Force Manual Review if Critic explicitly rejected, even if score is okay
    if (criticReview && !criticReview.isApproved) {
        label = "MANUAL REVIEW REQUIRED (Critic rejected logic)";
    }

    console.log(`Final Confidence: ${finalScore} (Rescued: ${overrideActive}, Base AST: ${baseAccuracy})`);

    return {
        score: finalScore,
        label,
        detail: `${detailPrefix}${criticReview?.feedback || ''}`
    };
}

export async function processFiles(orderedFiles, dependencyGraph, methodContentMap) {
  const memory = {};
  const maxAttempts = 4;
  let totalTokenUsed = 0;
  const allReports = [];
  const fileConversionConfidence = new Map();

  for (const fileName of orderedFiles) {
    const node = dependencyGraph[fileName];
    const file = node.file;
    let review = null;

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
      console.log(`AccuracyPipeline result for file ${file.fileName} for attempt ${attempt} accuracyScore is ${result.accuracyScore}, due to ${result.scoringMode} with status ${result.pipelineStatus}`);
      // 3. CRITIC: Reasoning check
    const review = await criticAgent.analyze(file.content, playwrightCode, result);
    console.log(`Critic feedback isApproved: ${review.isApproved}`);
    if (review.isApproved) {
        console.log("✅ Migration Approved!");
        break;
    } else {
        console.log(`❌ Attempt ${attempt} Rejected.`);
        feedback = review.feedback; // Pass critic's comments back to generator
        attempt++;
    }

    }

allReports.push(result)
fileConversionConfidence.set(file.fileName, calculateConfidence(result, attempt, review));
    // 🔥 Store result
    memory[fileName] = {
      content: playwrightCode,
      type: context.type
    };
  }


const structuralAccuracySummary = AccuracyPipeline.summarize(allReports);

console.log('\n══════════════════════════════════════════');
console.log('  PROJECT ACCURACY SUMMARY');
console.log('══════════════════════════════════════════');
console.log(`Project accuracy:  ${structuralAccuracySummary.projectAccuracy}  [${structuralAccuracySummary.confidence}]`);
console.log(`Total files:       ${structuralAccuracySummary.totalFiles}`);
console.log(`Scored files:      ${structuralAccuracySummary.scoredFiles}`);
console.log(`Exempted files:    ${structuralAccuracySummary.exemptedFiles}`);
console.log(`Status breakdown:  ${JSON.stringify(structuralAccuracySummary.statusBreakdown, null, 2)}`);

if (structuralAccuracySummary.incompleteGenerations.length > 0) {
  console.log('\n❌ Files needing re-generation:');
  for (const f of structuralAccuracySummary.incompleteGenerations) {
    console.log(`   ${f.fileName} → ${f.retryStrategy}`);
  }
}

if (structuralAccuracySummary.failedAccuracyFiles.length > 0) {
  console.log('\n⚠️  Files failing accuracy threshold:');
  for (const f of structuralAccuracySummary.failedAccuracyFiles) {
    console.log(`   ${f.fileName} (${f.score}) — missing: ${f.missingFromTs?.join(', ')}`);
  }
}

if (structuralAccuracySummary.behavioralReviewRequired.length > 0) {
  console.log('\n🔬 Files requiring behavioral (runtime) review:');
  for (const f of structuralAccuracySummary.behavioralReviewRequired) {
    console.log(`   ${f.fileName} — ${f.reason}`);
  }
}


  return {memory, totalTokenUsed, structuralAccuracySummary, fileConversionConfidence};
}


function getSafeAccuracyScore(report) {
    console.log(`getSafeAccuracyScore called with report: ${JSON.stringify(report.accuracyScore)}`);

// If it's a string (like "30%"), extract the digits and decimal point
    const numericValue = parseFloat(report.accuracyScore.toString().replace(/[^0-9.]/g, ''));

    // Return the number, or 0 if the parsing failed (NaN)
    const accuracyScoreNumber = isNaN(numericValue) ? 0 : numericValue;

if (!accuracyScoreNumber || accuracyScoreNumber === 'N/A') {
    // Handle 'N/A' scenarios based on Pipeline Status and Scoring Mode
    switch (report.pipelineStatus) {
        case 'EXEMPT':
            // Constants or Empty files are "accurate" by default because there is nothing to miss
            return 100; 

        case 'BEHAVIORAL_REVIEW_REQUIRED':
            // Library substitutions (e.g., POI to ExcelJS) can't be mapped 1:1 via AST
            // We give it a passing baseline but flag it for review
            return 70; 

        case 'GENERATION_INCOMPLETE':
            // Truncation or critical gaps mean the logic is broken
            return 0;

        default:
            return 0; // Default safety net
    }
  }
  // If accuracy is a valid number, return it
  return accuracyScoreNumber;
}
