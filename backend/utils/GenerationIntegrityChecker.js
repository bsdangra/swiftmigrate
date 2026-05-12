// ─────────────────────────────────────────────────────────────────────────────
// GenerationIntegrityChecker.js
//
// Fix 2: Generation integrity gate.
//
// Validates the generated TypeScript file BEFORE AstAnalyzer.compare() runs.
// If the TS file is incomplete, truncated, or has stub methods, it is marked
// GENERATION_INCOMPLETE — so you get an actionable diagnosis instead of a
// misleading low accuracy score.
//
// Integration point (two lines in your orchestrator):
//   const integrity = GenerationIntegrityChecker.check(javaCode, tsCode, fileClass);
//   if (integrity.status !== 'OK') { ... handle re-generation ... }
//   else { const result = ScoringRouter.score(...); }
// ─────────────────────────────────────────────────────────────────────────────

// ── Java method extractor ─────────────────────────────────────────────────────
// Extracts public/protected method signatures from Java source.
// Returns array of { name, isPublic, lineNumber }
function extractJavaMethods(javaCode) {
  const lines = javaCode.split('\n');
  const methods = [];
  // Matches: [public|protected|private] [static] [returnType] methodName(
  const sig = /^\s*(public|protected|private)?\s*(static\s+)?\S+\s+(\w+)\s*\(/;
  const skip = new Set(['if', 'while', 'for', 'switch', 'catch', 'try', 'synchronized', 'class', 'interface', 'enum', 'new', 'return']);

  lines.forEach((line, i) => {
    const m = line.match(sig);
    if (m) {
      const name = m[3];
      if (!skip.has(name) && !/^\d/.test(name)) {
        methods.push({
          name,
          isPublic: m[1] === 'public' || m[1] === 'protected',
          lineNumber: i + 1,
        });
      }
    }
  });
  return methods;
}

// ── TypeScript method extractor ───────────────────────────────────────────────
// Extracts method/function names from TypeScript source.
function extractTsMethods(tsCode) {
  const lines = tsCode.split('\n');
  const methods = [];
  // Matches: async methodName( | methodName( | function methodName(
  const sig = /^\s*(?:public|private|protected|static|async|\s)*(?:async\s+)?(\w+)\s*(?:<[^>]*>)?\s*\(/;
  const skip = new Set(['if', 'while', 'for', 'switch', 'catch', 'try', 'new', 'return', 'constructor', 'describe', 'test', 'it', 'expect', 'import', 'export']);
  const fnDecl = /^\s*(?:export\s+)?(?:async\s+)?function\s+(\w+)\s*\(/;

  lines.forEach((line, i) => {
    // class methods
    const m = line.match(sig);
    if (m && !skip.has(m[1]) && !/^\d/.test(m[1])) {
      methods.push({ name: m[1], lineNumber: i + 1 });
    }
    // standalone functions
    const f = line.match(fnDecl);
    if (f && !skip.has(f[1])) {
      methods.push({ name: f[1], lineNumber: i + 1 });
    }
  });

  // deduplicate by name
  const seen = new Set();
  return methods.filter(m => seen.has(m.name) ? false : (seen.add(m.name), true));
}

function findPWStubMethods(javaCode, tsCode){
  const existingStubs = findJavaStubMethods(javaCode);
  console.log(`Existing Java stubs: ${JSON.stringify(existingStubs)}`)
  const existingStubNames = new Set(existingStubs.map(m => m.methodName.toLowerCase()));
  const pwStubs = findStubMethods(tsCode);
  const truePWStubs = pwStubs.filter(s => !existingStubNames.has(s.methodName.toLowerCase()));
  return truePWStubs;
}


// ── Stub method detector ──────────────────────────────────────────────────────
// A method body is a stub if its only content is:
//   - a comment (// ... or /* ... */)
//   - a TODO/placeholder string
//   - empty (just braces)
// Extracts method bodies by tracking brace depth.
function findStubMethods(tsCode) {
  const lines = tsCode.split('\n');
  const stubs = [];

  let inMethod = false;
  let methodName = '';
  let braceDepth = 0;
  let bodyLines = [];
  let methodStartLine = 0;

  const methodOpen = /^\s*(?:public|private|protected|static|async|\s)*(?:async\s+)?(\w+)\s*(?:<[^>]*>)?\s*\([^)]*\)[^{]*\{/;
  const skipNames = new Set(['constructor', 'if', 'for', 'while', 'switch', 'try', 'catch', 'class']);

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    if (!inMethod) {
      const m = line.match(methodOpen);
      if (m && !skipNames.has(m[1])) {
        inMethod = true;
        methodName = m[1];
        methodStartLine = i + 1;
        braceDepth = (line.match(/\{/g) || []).length - (line.match(/\}/g) || []).length;
        bodyLines = [];
        continue;
      }
    }

    if (inMethod) {
      braceDepth += (line.match(/\{/g) || []).length;
      braceDepth -= (line.match(/\}/g) || []).length;

      if (braceDepth <= 0) {
        // method body ended — analyse it
        const nonEmpty = bodyLines.map(l => l.trim()).filter(l => l.length > 0);
        const onlyComments = nonEmpty.every(l =>
          l.startsWith('//') || l.startsWith('*') || l.startsWith('/*') || l.startsWith('*/')
        );
        const hasTodo = nonEmpty.some(l =>
          /todo|fixme|placeholder|implementation|goes here|not implemented/i.test(l)
        );
        const isEmpty = nonEmpty.length === 0;

        if (isEmpty || onlyComments || hasTodo) {
          stubs.push({
            methodName,
            lineNumber: methodStartLine,
            reason: isEmpty ? 'empty body' : hasTodo ? 'placeholder comment' : 'comment-only body',
          });
        }

        inMethod = false;
        methodName = '';
        bodyLines = [];
        braceDepth = 0;
      } else {
        bodyLines.push(line);
      }
    }
  }

  return stubs;
}


/**
 * Identifies stub methods in Java code.
 * Optimized for legacy Selenium Java classes.
 */
function findJavaStubMethods(javaCode) {
  const lines = javaCode.split('\n');
  const stubs = [];

  let inMethod = false;
  let methodName = '';
  let braceDepth = 0;
  let bodyLines = [];
  let methodStartLine = 0;

  // Regex breakdown for Java:
  // 1. Optional modifiers (public, private, static, etc.)
  // 2. Return type (including generics like List<String>)
  // 3. Method Name (captured group)
  // 4. Parameters and optional 'throws' clause
  // 5. Opening brace
  const javaMethodOpen = /^\s*(?:(?:public|private|protected|static|final|synchronized)\s+)*[\w<>\[\].]+\s+(\w+)\s*\([^)]*\)(?:\s+throws\s+[\w.,\s]+)?\s*\{/;
  
  // Keywords to ignore to avoid matching control structures as methods
  const skipNames = new Set(['if', 'for', 'while', 'switch', 'try', 'catch', 'static', 'else', 'synchronized']);

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    if (!inMethod) {
      const m = line.match(javaMethodOpen);
      // Check if it's a method and not a class definition or control block
      if (m && !skipNames.has(m[1]) && !line.includes('class ')) {
        inMethod = true;
        methodName = m[1];
        methodStartLine = i + 1;
        // Calculate initial brace depth in case of same-line content
        braceDepth = (line.match(/\{/g) || []).length - (line.match(/\}/g) || []).length;
        bodyLines = [];
        continue;
      }
    }

    if (inMethod) {
      // Skip the line that opened the method for body analysis
      braceDepth += (line.match(/\{/g) || []).length;
      braceDepth -= (line.match(/\}/g) || []).length;

      if (braceDepth <= 0) {
        // Method ended, analyze content
        const nonEmpty = bodyLines.map(l => l.trim()).filter(l => l.length > 0);
        
        // Java specific comment checks (including Javadoc style)
        const onlyComments = nonEmpty.every(l =>
          l.startsWith('//') || l.startsWith('*') || l.startsWith('/*') || l.startsWith('*/')
        );

        // Common stub indicators in legacy Java code
        const hasTodo = nonEmpty.some(l =>
          /todo|fixme|placeholder|implementation|no-op|not implemented|auto-generated/i.test(l)
        );
        
        // Check for common Java dummy returns (e.g., return null; return 0;)
        const isDummyReturn = nonEmpty.length === 1 && 
          /^\s*return\s+(null|0|false|""|new\s+\w+\(\));/i.test(nonEmpty[0]);

        const isEmpty = nonEmpty.length === 0;

        if (isEmpty || onlyComments || hasTodo || isDummyReturn) {
          stubs.push({
            methodName,
            lineNumber: methodStartLine,
            reason: isEmpty ? 'empty body' : 
                    hasTodo ? 'placeholder comment' : 
                    isDummyReturn ? 'dummy return' : 'comment-only body',
          });
        }

        inMethod = false;
        methodName = '';
        bodyLines = [];
        braceDepth = 0;
      } else {
        bodyLines.push(line);
      }
    }
  }

  return stubs;
}

// ── Truncation detector ───────────────────────────────────────────────────────
// Checks if the TS file ends cleanly (last non-empty line closes a block)
// and whether the last Java public method name appears somewhere in the TS output.
function detectTruncation(javaCode, tsCode, javaMethods) {
  const issues = [];

  // 1. Does the TS file end with an unmatched brace context?
  const openBraces  = (tsCode.match(/\{/g) || []).length;
  const closeBraces = (tsCode.match(/\}/g) || []).length;
  if (openBraces !== closeBraces) {
    issues.push({
      type:   'UNBALANCED_BRACES',
      detail: `${openBraces} opening vs ${closeBraces} closing braces — file likely cut off mid-generation`,
    });
  }

  // 2. Does the last Java public method appear in TS?
  const publicMethods = javaMethods.filter(m => m.isPublic);
  if (publicMethods.length > 0) {
    const lastJavaMethod = publicMethods[publicMethods.length - 1].name.toLowerCase();
    if (!tsCode.toLowerCase().includes(lastJavaMethod)) {
      issues.push({
        type:       'LAST_METHOD_MISSING',
        detail:     `Last Java public method '${publicMethods[publicMethods.length - 1].name}' not found in TS output`,
        javaMethod: publicMethods[publicMethods.length - 1].name,
      });
    }
  }

  // 3. Does the file end with trailing text that looks like a cut-off prose sentence?
  const lastLines = tsCode.trimEnd().split('\n').slice(-3).join(' ');
  if (/[a-z]{10,}\s*$/.test(lastLines) && !lastLines.includes(';') && !lastLines.includes('}')) {
    issues.push({
      type:   'TRAILING_PROSE',
      detail: 'File ends with text that looks like a cut-off LLM explanation, not code',
    });
  }

  return issues;
}

// ── LLM prose leak detector ───────────────────────────────────────────────────
// Detects when LLM-generated commentary has been emitted into the source file
// as identifiers or raw text (the "THE `ASYNC`" / "RUN" / "THE" issue seen
// in MyInfo_EditContactDetailsTest).
function detectProseLeak(tsCode) {
  const leaks = [];

  // Pattern 1: backtick-enclosed words in non-template-literal context at line start
  const backtickWord = /^\s*`\w+`/gm;
  let m;
  while ((m = backtickWord.exec(tsCode)) !== null) {
    leaks.push({ type: 'BACKTICK_IDENTIFIER', detail: `Possible prose at: ${m[0].trim()}` });
  }

  // Pattern 2: lines that are English prose sentences (capital letter, multiple words, no code symbols)
  const proseLine = /^\s*(?:\/\/\s*)?[A-Z][a-z]+ [a-z]+ [a-z]+ [a-z]+.*[^;{},()]$/gm;
  while ((m = proseLine.exec(tsCode)) !== null) {
    const line = m[0].trim();
    if (!line.startsWith('//') && !line.startsWith('*') && !line.startsWith('import')) {
      leaks.push({ type: 'PROSE_LINE', detail: `Possible LLM explanation leaked into source: "${line.slice(0, 60)}"` });
    }
  }

  return leaks;
}

// ── Method count gap analyser ─────────────────────────────────────────────────
function analyseMethodCoverage(javaMethods, tsMethods) {
  const javaPublic = javaMethods.filter(m => m.isPublic);
  const tsNames    = new Set(tsMethods.map(m => m.name.toLowerCase()));

  const missing = javaPublic.filter(m => !tsNames.has(m.name.toLowerCase()));
  const coverageRate = javaPublic.length > 0
    ? ((javaPublic.length - missing.length) / javaPublic.length) * 100
    : 100;

  return {
    javaPublicMethodCount: javaPublic.length,
    tsMethodCount:         tsMethods.length,
    missingMethods:        missing.map(m => m.name),
    methodCoverageRate:    coverageRate.toFixed(1) + '%',
  };
}

// ─────────────────────────────────────────────────────────────────────────────
export class GenerationIntegrityChecker {

  // ── Main check entry point ─────────────────────────────────────────────────
  // javaCode  : raw Java source string
  // tsCode    : raw TypeScript source string
  // fileClass : 'test' | 'pageobject' | 'base' | 'util'
  //
  // Returns:
  //   status: 'OK' | 'GENERATION_INCOMPLETE' | 'GENERATION_DEGRADED'
  //   issues: array of issue objects (empty when OK)
  //   ... method coverage, stub list, truncation details
  //
  // 'GENERATION_INCOMPLETE' → do NOT score; trigger re-generation
  // 'GENERATION_DEGRADED'   → score but flag; human review required
  // 'OK'                    → proceed to ScoringRouter.score()
  static check(javaCode, tsCode, fileClass) {

    const javaMethods = extractJavaMethods(javaCode);
    const tsMethods   = extractTsMethods(tsCode);
    const coverage    = analyseMethodCoverage(javaMethods, tsMethods);
  //  const javaStubs   = findStubMethods(javaCode);
    const stubs       = findPWStubMethods(javaCode, tsCode);
    const truncation  = detectTruncation(javaCode, tsCode, javaMethods);
    const proseLeak   = detectProseLeak(tsCode);

    const issues  = [];
    let severity  = 'OK';  // escalates to DEGRADED or INCOMPLETE

    // ── Rule 1: Truncation (hard failure — re-generate) ──────────────────────
    for (const t of truncation) {
      issues.push({ severity: 'INCOMPLETE', category: 'TRUNCATION', ...t });
      severity = 'GENERATION_INCOMPLETE';
    }

    // ── Rule 2: Critical method coverage gap ─────────────────────────────────
    // If more than 30% of public Java methods are absent in TS → incomplete
    const coverageNum = parseFloat(coverage.methodCoverageRate);
    if (coverage.javaPublicMethodCount > 2 && coverageNum < 70) {
      issues.push({
        severity: 'INCOMPLETE',
        category: 'METHOD_COVERAGE',
        detail:   `Only ${coverage.methodCoverageRate} of Java public methods found in TS (${coverage.javaPublicMethodCount} Java → ${coverage.tsMethodCount} TS)`,
        missingMethods: coverage.missingMethods,
      });
      severity = 'GENERATION_INCOMPLETE';
    }

    // ── Rule 3: Stub methods present ─────────────────────────────────────────
    // Stubs that match Java method names are definitely incomplete generation
    const javaMethodNames = new Set(javaMethods.map(m => m.name.toLowerCase()));
    const criticalStubs = stubs.filter(s => javaMethodNames.has(s.methodName.toLowerCase()));
    const minorStubs    = stubs.filter(s => !javaMethodNames.has(s.methodName.toLowerCase()));

    if (criticalStubs.length > 0) {
      issues.push({
        severity: 'INCOMPLETE',
        category: 'STUB_METHODS',
        detail:   `${criticalStubs.length} Java method(s) translated as stub/placeholder in TS`,
        stubs:    criticalStubs,
      });
      // Only escalate to INCOMPLETE if not already; stubs alongside truncation = still INCOMPLETE
      if (severity === 'OK') severity = 'GENERATION_INCOMPLETE';
    }

    if (minorStubs.length > 0) {
      issues.push({
        severity: 'DEGRADED',
        category: 'STUB_METHODS_MINOR',
        detail:   `${minorStubs.length} TS-added method(s) are stubs (no Java equivalent — may be intentional)`,
        stubs:    minorStubs,
      });
      if (severity === 'OK') severity = 'GENERATION_DEGRADED';
    }

    // ── Rule 4: Prose leak ────────────────────────────────────────────────────
    if (proseLeak.length > 0) {
      issues.push({
        severity: 'DEGRADED',
        category: 'PROSE_LEAK',
        detail:   `${proseLeak.length} instance(s) of LLM prose possibly leaked into generated source`,
        instances: proseLeak.slice(0, 5),  // cap to first 5 for readability
      });
      if (severity === 'OK') severity = 'GENERATION_DEGRADED';
    }

    // ── Rule 5: TS file suspiciously short ───────────────────────────────────
    const javaLines = javaCode.split('\n').length;
    const tsLines   = tsCode.split('\n').length;
    // Playwright TS is typically 60–90% the length of equivalent Java (less boilerplate)
    // Flag if TS is less than 30% of Java line count for non-trivial files
    if (javaLines > 30 && tsLines < javaLines * 0.3) {
      issues.push({
        severity: 'INCOMPLETE',
        category: 'FILE_TOO_SHORT',
        detail:   `TS file (${tsLines} lines) is less than 30% of Java source (${javaLines} lines) — likely truncated`,
      });
      if (severity !== 'GENERATION_INCOMPLETE') severity = 'GENERATION_INCOMPLETE';
    }

    return {
      status:                 severity,
      issues,
      methodCoverage:         coverage,
      stubMethods:            stubs,
      truncationIssues:       truncation,
      proseLeakIssues:        proseLeak,
      // Convenience booleans for orchestrator if-checks
      shouldRegenerate:       severity === 'GENERATION_INCOMPLETE',
      shouldFlagForReview:    severity === 'GENERATION_DEGRADED',
      // Suggested retry strategy
      retryStrategy:          severity === 'GENERATION_INCOMPLETE'
        ? (coverage.missingMethods.length > 0
          ? `Chunk input: generate missing methods [${coverage.missingMethods.join(', ')}] separately`
          : 'Increase max_tokens and retry full file generation')
        : null,
    };
  }
}
