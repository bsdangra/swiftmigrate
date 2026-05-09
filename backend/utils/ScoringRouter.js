// ─────────────────────────────────────────────────────────────────────────────
// ScoringRouter.js
//
// Fix 1: File-classification-aware scoring router.
//
// Your pipeline already classifies each file into one of:
//   'base' | 'pageobject' | 'util' | 'test'
//
// This module decides, per classification, which scoring strategy applies
// BEFORE AstAnalyzer.compare() is called — so infrastructure files never
// penalize your overall accuracy score with unfair structural comparisons.
//
// Integration point (single change in your orchestrator):
//   BEFORE:  const result = analyzer.compare(javaCode, tsCode);
//   AFTER:   const result = await ScoringRouter.score(fileClass, fileName, javaCode, tsCode, analyzer);
// ─────────────────────────────────────────────────────────────────────────────

import Parser from 'tree-sitter';
import Java from 'tree-sitter-java';
import TypeScript from 'tree-sitter-typescript';
import { AstAnalyzer } from './AstAnalyzer.js';

// ── Library substitution pairs ────────────────────────────────────────────────
// When a Java file uses LibA and the TS equivalent uses LibB, the call patterns
// are structurally incompatible even when behavior is preserved.
// Map: Java import fragment → { tsLibHint, scoringMode }
const LIBRARY_SUBSTITUTION_MAP = [
  {
    javaImport:  'org.apache.poi',
    tsLibHint:   'xlsx / exceljs',
    scoringMode: 'BEHAVIORAL_ONLY',
    reason:      'Apache POI → xlsx library: structurally incompatible call patterns'
  },
  {
    javaImport:  'com.aventstack.extentreports',
    tsLibHint:   'allure-playwright / custom reporter',
    scoringMode: 'BEHAVIORAL_ONLY',
    reason:      'ExtentReports Java API has no direct TS equivalent'
  },
  {
    javaImport:  'br.eti.kinoshita.testlinkjavaapi',
    tsLibHint:   'testlink API client',
    scoringMode: 'PARTIAL',
    reason:      'TestLink Java SDK vs generic TS HTTP client — partial structural overlap'
  },
  {
    javaImport:  'org.testng.ITestListener',
    tsLibHint:   'playwright test hooks',
    scoringMode: 'PARTIAL',
    reason:      'TestNG lifecycle interface maps loosely to Playwright beforeEach/afterEach'
  },
  {
    javaImport:  'io.github.bonigarcia.wdm',
    tsLibHint:   'playwright browser launch',
    scoringMode: 'PARTIAL',
    reason:      'WebDriverManager has no TS equivalent — browser setup is implicit in Playwright'
  },
];

// ── Scoring mode definitions ───────────────────────────────────────────────────
// STRUCTURAL   → full AstAnalyzer.compare() — multiset + LCS
// PARTIAL      → AstAnalyzer.compare() but with reduced weight in composite score
// CONSTANTS    → key-value completeness check only (no method calls to score)
// BEHAVIORAL_ONLY → skip structural score; note that behavioral (runtime) check is needed
// EXEMPT       → file has no scoreable content (empty seqs both sides)

const SCORING_MODES = {
  STRUCTURAL:      'STRUCTURAL',
  PARTIAL:         'PARTIAL',
  CONSTANTS:       'CONSTANTS',
  BEHAVIORAL_ONLY: 'BEHAVIORAL_ONLY',
  EXEMPT:          'EXEMPT',
};

// ── Classification → default scoring mode ─────────────────────────────────────
// Your classifier already produces these labels. This is the baseline before
// library-substitution detection overrides it.
const CLASS_DEFAULT_MODE = {
  test:       SCORING_MODES.STRUCTURAL,      // test files: full structural check
  pageobject: SCORING_MODES.STRUCTURAL,      // page objects: full structural check
  base:       SCORING_MODES.PARTIAL,         // base/infra: structural but lower weight
  util:       SCORING_MODES.PARTIAL,         // utilities: structural but flagged if lib-swap
};

// ── Constants-only file detector ─────────────────────────────────────────────
// Files where both sequences are empty are pure constant/config classes.
// AstAnalyzer already returns 0% for these — we reclassify as EXEMPT.
function isConstantsFile(javaSeq, tsSeq) {
  return javaSeq.length === 0 && tsSeq.length === 0;
}

// ── Library substitution detector ────────────────────────────────────────────
// Scans the raw Java source for known import fragments that signal a
// library-substitution scenario.
function detectLibrarySubstitution(javaCode) {
  for (const entry of LIBRARY_SUBSTITUTION_MAP) {
    if (javaCode.includes(entry.javaImport)) {
      return entry;
    }
  }
  return null;
}

// ── Constants completeness scorer ─────────────────────────────────────────────
// For files like TestConfig — count how many Java constant field names appear
// in the TS source. Field names are extracted from `public static final` declarations.
function scoreConstantsFile(javaCode, tsCode) {
  const fieldPattern = /public\s+static\s+final\s+\w+\s+(\w+)\s*=/g;
  const javaFields = [];
  let m;
  while ((m = fieldPattern.exec(javaCode)) !== null) {
    javaFields.push(m[1].toLowerCase());
  }

  if (javaFields.length === 0) {
    return { scoringMode: SCORING_MODES.EXEMPT, accuracyScore: 'N/A', note: 'No constants found' };
  }

  const tsLower = tsCode.toLowerCase();
  const present = javaFields.filter(f => tsLower.includes(f));
  const missing = javaFields.filter(f => !tsLower.includes(f));
  const score = (present.length / javaFields.length) * 100;

  return {
    scoringMode:        SCORING_MODES.CONSTANTS,
    accuracyScore:      score.toFixed(2) + '%',
    totalConstants:     javaFields.length,
    presentInTs:        present.length,
    missingConstants:   missing,
    confidence:         score >= 95 ? 'EXCELLENT' : score >= 80 ? 'GOOD' : 'PARTIAL',
    note:               'Constants completeness check — no method calls to score structurally',
  };
}

// ── Composite weight by scoring mode and classification ───────────────────────
// When you roll up a per-project accuracy number, files in PARTIAL or
// BEHAVIORAL_ONLY mode contribute less weight so they don't drag down the score
// for legitimate library-substitution cases.
const COMPOSITE_WEIGHTS = {
  [SCORING_MODES.STRUCTURAL]:      1.0,
  [SCORING_MODES.PARTIAL]:         0.5,
  [SCORING_MODES.CONSTANTS]:       0.3,
  [SCORING_MODES.BEHAVIORAL_ONLY]: 0.0,   // excluded from structural composite
  [SCORING_MODES.EXEMPT]:          0.0,
};

// ─────────────────────────────────────────────────────────────────────────────
export class ScoringRouter {

  // ── Main entry point ────────────────────────────────────────────────────────
  // fileClass  : 'test' | 'pageobject' | 'base' | 'util'  (from your classifier)
  // fileName   : string (for reporting)
  // javaCode   : raw Java source string
  // tsCode     : raw TypeScript source string
  // analyzer   : AstAnalyzer instance
  //
  // Returns a result object that is a superset of AstAnalyzer.compare() output,
  // with additional fields: scoringMode, compositeWeight, routingReason.
  static score(fileClass, fileName, javaCode, tsCode, analyzer) {

    // Step 1: get sequences to check for empty (constants) case
    const javaTree = analyzer.javaParser.parse(javaCode);
    const tsTree   = analyzer.tsParser.parse(tsCode);
    const javaSeq  = analyzer.extractLogicSequence(javaTree, 'java');
    const tsSeq    = analyzer.extractLogicSequence(tsTree,   'ts');

    // Step 2: constants file — both seqs empty
    if (isConstantsFile(javaSeq, tsSeq)) {
      return {
        fileName,
        fileClass,
        ...scoreConstantsFile(javaCode, tsCode),
        compositeWeight: COMPOSITE_WEIGHTS[SCORING_MODES.CONSTANTS],
        javaSequence: javaSeq,
        tsSequence:   tsSeq,
      };
    }

    // Step 3: library substitution detection (overrides class default)
    const libSub = detectLibrarySubstitution(javaCode);
    let scoringMode = CLASS_DEFAULT_MODE[fileClass] ?? SCORING_MODES.PARTIAL;
    let routingReason = `Default mode for class '${fileClass}'`;

    if (libSub) {
      scoringMode   = libSub.scoringMode;
      routingReason = libSub.reason;
    }

    // Step 4: BEHAVIORAL_ONLY — skip structural, just document it
    if (scoringMode === SCORING_MODES.BEHAVIORAL_ONLY) {
      return {
        fileName,
        fileClass,
        scoringMode,
        compositeWeight:  COMPOSITE_WEIGHTS[scoringMode],
        accuracyScore:    'N/A',
        confidence:       'BEHAVIORAL_ONLY',
        routingReason,
        note:             `Structural AST score not applicable. Library substitution detected: ${libSub.tsLibHint}. Validate via behavioral (runtime) test comparison instead.`,
        javaSequence:     javaSeq,
        tsSequence:       tsSeq,
        librarySubstitution: libSub,
      };
    }

    // Step 5: run structural comparison for STRUCTURAL and PARTIAL modes
    const structuralResult = analyzer.compare(javaCode, tsCode);

    return {
      fileName,
      fileClass,
      scoringMode,
      compositeWeight: COMPOSITE_WEIGHTS[scoringMode],
      routingReason,
      librarySubstitution: libSub || null,
      ...structuralResult,
    };
  }

  // ── Roll-up: compute composite project-level accuracy ─────────────────────
  // Pass the array of per-file results from score() to get a single number.
  static computeProjectAccuracy(fileResults) {
    let weightedSum = 0;
    let totalWeight = 0;
    const byMode = {};

    for (const report of fileResults) {
      console.log(`\nfile ${report.fileName} [${report.fileClass}]`);
  console.log(`javaSeq`, JSON.stringify(report.javaSequence));
  console.log(`tsSeq  `, JSON.stringify(report.tsSequence));
  console.log(`Scoring mode:        ${report.scoringMode}`);
  console.log(`Structural Accuracy: ${report.accuracyScore}`);
  console.log(`Order score:         ${report.orderScore}`);
  console.log(`Confidence:          ${report.confidence}`);

  // Generation incomplete — do not score, re-generate instead
  if (report.pipelineStatus === 'GENERATION_INCOMPLETE') {
    console.log(`❌ GENERATION INCOMPLETE — do not score this file`);
    console.log(`   Retry strategy: ${report.retryStrategy}`);
    for (const issue of report.integrityIssues) {
      console.log(`   [${issue.category}] ${issue.detail}`);
    }
    // Trigger re-generation here using report.retryStrategy
    // e.g. await regenerateFile(javaFile, report.retryStrategy);
    continue;
  }

  // Library substitution — structural score not applicable
  if (report.pipelineStatus === 'BEHAVIORAL_REVIEW_REQUIRED') {
    console.log(`🔬 BEHAVIORAL REVIEW REQUIRED — ${report.routingReason}`);
    console.log(`   Run both suites and compare pass/fail outcomes instead.`);
    continue;
  }

  // Constants / exempt file
  if (report.pipelineStatus === 'EXEMPT') {
    console.log(`⚪ EXEMPT — ${report.note}`);
    if (report.missingConstants?.length > 0) {
      console.log(`   Missing constants: ${report.missingConstants.join(', ')}`);
    }
    continue;
  }

  // Normal scored file — same threshold logic as before, now with category breakdown
  if (parseFloat(report.accuracyScore) >= 85) {
    console.log(`✅ Structural Integrity Verified.`);
  } else if (parseFloat(report.accuracyScore) >= 70) {
    console.log(`⚠️  Partial accuracy — review required.`);
    console.log(`   Missing from TS: ${report.missingFromTs?.join(', ')}`);
    console.log(`   Category scores: ${JSON.stringify(report.categoryScores)}`);
  } else {
    console.log(`❌ High risk of logic loss!`);
    console.log(`   Missing from TS: ${report.missingFromTs?.join(', ')}`);
  }

  // Surface any degraded-but-not-blocking warnings
  for (const w of report.warnings) {
    console.log(`   ⚠️  [${w.category}] ${w.detail}`);
  }




      const weight = report.compositeWeight ?? 0;
      const rawScore = parseFloat(report.accuracyScore);
      const modeKey = report.scoringMode ?? 'UNKNOWN';

      if (!byMode[modeKey]) byMode[modeKey] = { count: 0, scores: [] };
      byMode[modeKey].count++;

      if (!isNaN(rawScore) && weight > 0) {
        weightedSum += rawScore * weight;
        totalWeight += weight;
        byMode[modeKey].scores.push(rawScore);
      }
    }

    const projectScore = totalWeight > 0 ? weightedSum / totalWeight : 0;

    // per-mode averages for reporting
    const modeAverages = {};
    for (const [mode, data] of Object.entries(byMode)) {
      modeAverages[mode] = {
        fileCount: data.count,
        avgScore: data.scores.length
          ? (data.scores.reduce((a, b) => a + b, 0) / data.scores.length).toFixed(1) + '%'
          : 'N/A',
      };
    }

    return {
      projectAccuracy: projectScore.toFixed(2) + '%',
      confidence: projectScore >= 90 ? 'EXCELLENT' : projectScore >= 80 ? 'GOOD' : projectScore >= 70 ? 'PARTIAL' : 'POOR',
      totalFiles: fileResults.length,
      scoredFiles: fileResults.filter(r => !isNaN(parseFloat(r.accuracyScore))).length,
      exemptedFiles: fileResults.filter(r => r.scoringMode === SCORING_MODES.BEHAVIORAL_ONLY || r.scoringMode === SCORING_MODES.EXEMPT).length,
      modeAverages,
    };
  }
}
