// ─────────────────────────────────────────────────────────────────────────────
// AccuracyPipeline.js
//
// The single entry point that wires together:
//   AstAnalyzer              → intent extraction + structural comparison
//   GenerationIntegrityChecker → validates TS output BEFORE scoring
//   ScoringRouter            → routes each file to the right scoring mode
//
// Your existing pipeline calls one function per file:
//   const report = await AccuracyPipeline.analyzeFile({ fileClass, fileName, javaCode, tsCode });
//
// And one function at the end for the project roll-up:
//   const summary = AccuracyPipeline.summarize(allFileReports);
// ─────────────────────────────────────────────────────────────────────────────

import { AstAnalyzer }                from './AstAnalyzer.js';
import { GenerationIntegrityChecker } from './GenerationIntegrityChecker.js';
import { ScoringRouter }              from './ScoringRouter.js';

// One shared parser instance — parsers are expensive to create
const analyzer = new AstAnalyzer();

export class AccuracyPipeline {

  // ── Per-file entry point ───────────────────────────────────────────────────
  // Call this once per file pair in your existing loop.
  //
  // params:
  //   fileClass : 'test' | 'pageobject' | 'base' | 'util'   ← from your classifier
  //   fileName  : string                                      ← for reporting
  //   javaCode  : string (raw Java source)
  //   tsCode    : string (raw generated TypeScript source)
  //
  // returns: AccuracyReport object (see shape below)
  static analyzeFile( fileClass, fileName, javaCode, tsCode ) {
//console.log(`fileClass ${fileClass}, fileName ${fileName}, javaCode ${JSON.stringify(javaCode)}, tsCode ${JSON.stringify(tsCode)}`)
    // ── Step 1: Generation integrity gate ─────────────────────────────────
    // Runs BEFORE scoring. If the TS output is truncated or has stub methods,
    // return GENERATION_INCOMPLETE immediately — do not score.
    const integrity = GenerationIntegrityChecker.check(javaCode, tsCode, fileClass);

    if (integrity.shouldRegenerate) {
      return {
        fileName,
        fileClass,
        // Pipeline decision
        pipelineStatus:   'GENERATION_INCOMPLETE',
        shouldRegenerate: true,
        retryStrategy:    integrity.retryStrategy,
        // Integrity detail for the report UI
        integrityIssues:  integrity.issues,
        methodCoverage:   integrity.methodCoverage,
        stubMethods:      integrity.stubMethods,
        // No accuracy score — generation is incomplete
        scoringMode:      'SKIPPED',
        accuracyScore:    'N/A',
        confidence:       'N/A',
        // Raw sequences still extracted so you can see what WAS generated
        javaSequence:     [],
        tsSequence:       [],
      };
    }

    // ── Step 2: Route to the right scoring mode ────────────────────────────
    // ScoringRouter checks your file classification + library substitution
    // patterns to decide whether to run STRUCTURAL, PARTIAL, BEHAVIORAL_ONLY,
    // CONSTANTS, or EXEMPT scoring.
    const scoringResult = ScoringRouter.score(
      fileClass,
      fileName,
      javaCode,
      tsCode,
      analyzer
    );

    // ── Step 3: Merge integrity warnings into final report ─────────────────
    // Even if generation passed the integrity gate (status = OK or DEGRADED),
    // we still surface prose leaks and minor stubs as warnings.
    const warnings = [];
    if (integrity.shouldFlagForReview) {
      for (const issue of integrity.issues) {
        warnings.push({ category: issue.category, detail: issue.detail });
      }
    }

    // ── Step 4: Derive pipeline status from score + integrity ──────────────
    const rawScore = parseFloat(scoringResult.accuracyScore);
    let pipelineStatus;

    if (scoringResult.scoringMode === 'BEHAVIORAL_ONLY') {
      pipelineStatus = 'BEHAVIORAL_REVIEW_REQUIRED';
    } else if (scoringResult.scoringMode === 'EXEMPT' || scoringResult.scoringMode === 'CONSTANTS') {
      pipelineStatus = 'EXEMPT';
    } else if (isNaN(rawScore)) {
      pipelineStatus = 'EXEMPT';
    } else if (rawScore >= 85) {
      pipelineStatus = warnings.length > 0 ? 'GOOD_WITH_WARNINGS' : 'PASS';
    } else if (rawScore >= 70) {
      pipelineStatus = 'PARTIAL';
    } else {
      pipelineStatus = 'FAIL';
    }

    return {
      fileName,
      fileClass,
      pipelineStatus,
      shouldRegenerate: false,
      retryStrategy:    null,
      warnings,
      integrityIssues:  integrity.issues,
      methodCoverage:   integrity.methodCoverage,
      stubMethods:      integrity.stubMethods,
      // All fields from ScoringRouter (includes all AstAnalyzer fields)
      ...scoringResult,
    };
  }

  // ── Project-level roll-up ─────────────────────────────────────────────────
  // Pass the array of AccuracyReport objects from analyzeFile() calls.
  // Returns a summary suitable for your pipeline dashboard / Allure report.
  static summarize(fileReports) {
    const rollup = ScoringRouter.computeProjectAccuracy(fileReports);

    const byStatus = {};
    for (const r of fileReports) {
      byStatus[r.pipelineStatus] = (byStatus[r.pipelineStatus] || 0) + 1;
    }

    const incompleteFiles = fileReports
      .filter(r => r.pipelineStatus === 'GENERATION_INCOMPLETE')
      .map(r => ({ fileName: r.fileName, retryStrategy: r.retryStrategy }));

    const failedFiles = fileReports
      .filter(r => r.pipelineStatus === 'FAIL')
      .map(r => ({ fileName: r.fileName, score: r.accuracyScore, missingFromTs: r.missingFromTs }));

    const behavioralFiles = fileReports
      .filter(r => r.pipelineStatus === 'BEHAVIORAL_REVIEW_REQUIRED')
      .map(r => ({ fileName: r.fileName, reason: r.routingReason }));

    return {
      ...rollup,
      statusBreakdown:          byStatus,
      incompleteGenerations:    incompleteFiles,
      failedAccuracyFiles:      failedFiles,
      behavioralReviewRequired: behavioralFiles,
    };
  }
}
