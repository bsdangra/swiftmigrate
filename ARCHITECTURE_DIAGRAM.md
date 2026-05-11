# SwiftMigrate Architecture Diagram: `/upload` → `/process-project` Flow

## High-Level Flow Diagram

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                         CLIENT INITIATES CONVERSION                              │
│                     (Upload Selenium Test Project)                               │
└─────────────────────────────────────────┬───────────────────────────────────────┘
                                          │
                                          ▼
┌─────────────────────────────────────────────────────────────────────────────────┐
│                      ENDPOINT 1: POST /upload (Line 53)                         │
│                          File Upload & Analysis Phase                            │
├─────────────────────────────────────────────────────────────────────────────────┤
│                                                                                  │
│  ┌──────────────────────────────────────────────────────────────────────────┐   │
│  │ STEP 1: Extract & Parse Files (Lines 64-84)                            │   │
│  │  • Extract .zip files via uploadService.handleZip()                     │   │
│  │  • Extract individual .java files                                       │   │
│  │  • Build classIndex & methodContentMap (dependency tracking)            │   │
│  │                                                                          │   │
│  │  Output: allJavaFiles[] with extracted dependencies                     │   │
│  └──────────────────────────────────────────────────────────────────────────┘   │
│                                ▼                                                  │
│  ┌──────────────────────────────────────────────────────────────────────────┐   │
│  │ STEP 2: Framework Detection (Lines 91-96)                               │   │
│  │  • detectFramework(filteredFiles)                                       │   │
│  │  • classifyFiles(filteredFiles) → Separate into:                        │   │
│  │     - Test Files                                                        │   │
│  │     - Page Objects                                                      │   │
│  │     - Base Classes                                                      │   │
│  │     - Utility Classes                                                   │   │
│  │                                                                          │   │
│  │  Output: classified = {testFiles, pageObjects, baseClasses, utils}     │   │
│  └──────────────────────────────────────────────────────────────────────────┘   │
│                                ▼                                                  │
│  ┌──────────────────────────────────────────────────────────────────────────┐   │
│  │ STEP 3: Test → Page Object Mapping (Lines 99-103)                       │   │
│  │  • mapTestsToPOMs(testFiles, pageObjects)                               │   │
│  │  • Link each test to its dependent page objects                         │   │
│  │                                                                          │   │
│  │  Output: mappedTests[] with mapped POMs attached                        │   │
│  └──────────────────────────────────────────────────────────────────────────┘   │
│                                ▼                                                  │
│  ┌──────────────────────────────────────────────────────────────────────────┐   │
│  │ STEP 4: Build Dependency Graph (Lines 105-112)                          │   │
│  │  • buildDependencyGraphWithUtil()                                       │   │
│  │  • Resolve dependencies via imports & inheritance                       │   │
│  │  • Create execution flow: Test → POM → Base → Utils                     │   │
│  │                                                                          │   │
│  │  Output: dependencyGraph = {                                            │   │
│  │    fileName: {file, dependsOn[], type},                                 │   │
│  │    ...                                                                  │   │
│  │  }                                                                       │   │
│  └──────────────────────────────────────────────────────────────────────────┘   │
│                                ▼                                                  │
│  ┌──────────────────────────────────────────────────────────────────────────┐   │
│  │ RESPONSE: Return structured analysis (Lines 116-130)                    │   │
│  │  {                                                                       │   │
│  │    framework,           // e.g., "TestNG", "JUnit"                      │   │
│  │    summary,             // File counts                                   │   │
│  │    classified,          // Categorized files                            │   │
│  │    mappedTests,         // Test→POM mappings                            │   │
│  │    dependencyGraph,     // ← KEY for /process-project                   │   │
│  │    methodContentMap     // ← KEY for /process-project                   │   │
│  │  }                                                                       │   │
│  └──────────────────────────────────────────────────────────────────────────┘   │
│                                                                                  │
└─────────────────────────────────────────┬───────────────────────────────────────┘
                                          │
                        CLIENT STORES RESPONSE & CALLS
                        /process-project WITH RESPONSE DATA
                                          │
                                          ▼
┌─────────────────────────────────────────────────────────────────────────────────┐
│                   ENDPOINT 2: POST /process-project (Line 138)                  │
│                    Conversion, Build & Execution Phase                          │
├─────────────────────────────────────────────────────────────────────────────────┤
│                                                                                  │
│  Request Body: { dependencyGraph, methodContentMap, startTime }                │
│                                                                                  │
│  ┌──────────────────────────────────────────────────────────────────────────┐   │
│  │ STEP 1: Topological Sort (Lines 142-149)                                │   │
│  │  • topoSortWithBuckets(dependencyGraph)                                  │   │
│  │  • Determine execution order respecting dependencies                     │   │
│  │  • Identify circular deps (unordered files)                              │   │
│  │                                                                          │   │
│  │  Output: {ordered[], unordered[]}                                       │   │
│  │  Example order:                                                         │   │
│  │    1. Utils & Base Classes (no deps)                                    │   │
│  │    2. Page Objects (depends on Utils/Base)                              │   │
│  │    3. Test Files (depends on everything)                                │   │
│  └──────────────────────────────────────────────────────────────────────────┘   │
│                                ▼                                                  │
│  ┌──────────────────────────────────────────────────────────────────────────┐   │
│  │ STEP 2: Convert Files to Playwright (Lines 160-167)                     │   │
│  │  • processFiles(ordered[], dependencyGraph, methodContentMap)            │   │
│  │                                                                          │   │
│  │  FOR EACH file in ordered[]:                                            │   │
│  │    ├─ buildContext() → Get file's dependencies                          │   │
│  │    ├─ preprocess() → Analyze Selenium code structure                    │   │
│  │    ├─ convertWithAI() → Call Gemini API (max 3 retries):                │   │
│  │    │   • Generates Playwright equivalent                                │   │
│  │    │   • Uses dependency context for imports                            │   │
│  │    ├─ AccuracyPipeline.analyzeFile() → Verify structural parity        │   │
│  │    ├─ CriticAgent.analyze() → Reasoning validation                     │   │
│  │    └─ Store converted code in memory                                    │   │
│  │                                                                          │   │
│  │  Output: memory = {fileName: {content, type}, ...}                      │   │
│  └──────────────────────────────────────────────────────────────────────────┘   │
│                                ▼                                                  │
│  ┌──────────────────────────────────────────────────────────────────────────┐   │
│  │ STEP 3: Build Playwright Project (Line 172)                             │   │
│  │  • buildProject(convertedFiles)                                         │   │
│  │  • Generate:                                                            │   │
│  │    - playwright.config.ts                                               │   │
│  │    - package.json with Playwright deps                                  │   │
│  │    - tests/*.spec.ts (converted test files)                             │   │
│  │    - pages/*.ts (converted POMs)                                        │   │
│  │    - utils/*.ts (converted utilities)                                   │   │
│  │                                                                          │   │
│  │  Output: projectPath (physical directory on disk)                       │   │
│  └──────────────────────────────────────────────────────────────────────────┘   │
│                                ▼                                                  │
│  ┌──────────────────────────────────────────────────────────────────────────┐   │
│  │ STEP 4: Execute Project (Line 175)                                      │   │
│  │  • executeProject(projectPath)                                          │   │
│  │    ├─ npm install                                                       │   │
│  │    ├─ npx playwright install                                            │   │
│  │    └─ npx playwright test                                               │   │
│  │  • Capture stdout/stderr                                                │   │
│  │  • Generate Allure report                                               │   │
│  │                                                                          │   │
│  │  Output: executionResult = {success, logs, resultJsonCount}            │   │
│  └──────────────────────────────────────────────────────────────────────────┘   │
│                                ▼                                                  │
│  ┌──────────────────────────────────────────────────────────────────────────┐   │
│  │ STEP 5: Package & Return (Lines 179-203)                                │   │
│  │  • zipProject(projectPath) → Exclude node_modules, .git, dist           │   │
│  │  • Calculate total execution time                                       │   │
│  │  • Generate summary statistics                                          │   │
│  │                                                                          │   │
│  │  Response: {                                                            │   │
│  │    success: boolean,                                                    │   │
│  │    logs: string,                                                        │   │
│  │    projectPath: string,                                                 │   │
│  │    zipPath: string,          // ← Download via /download/:zipName       │   │
│  │    reportPath: "/report",    // ← View via /report                      │   │
│  │    ordered: [],              // Execution order                         │   │
│  │    unordered: [],            // Problematic files (if any)              │   │
│  │    convertedCount: number,   // How many files converted                │   │
│  │    totalTime: string,        // Elapsed time in seconds                 │   │
│  │    totalTokenUsed: number,   // Gemini API tokens                       │   │
│  │    structuralAccuracySummary // Accuracy metrics per file               │   │
│  │  }                                                                       │   │
│  └──────────────────────────────────────────────────────────────────────────┘   │
│                                                                                  │
└─────────────────────────────────────────┬───────────────────────────────────────┘
                                          │
                                          ▼
┌─────────────────────────────────────────────────────────────────────────────────┐
│                            CLIENT RECEIVES RESULT                               │
│                                                                                  │
│  ├─ Download converted project: GET /download/:zipName                         │
│  ├─ View test report: GET /report                                              │
│  └─ Review accuracy metrics & conversion logs                                  │
│                                                                                  │
└─────────────────────────────────────────────────────────────────────────────────┘
```

---

## Key Data Flow Between Endpoints

```
╔═══════════════════════════════════════════════════════════════════════╗
║                     /upload RESPONSE → /process-project REQUEST      ║
╠═══════════════════════════════════════════════════════════════════════╣
║                                                                       ║
║  /upload returns:                                                     ║
║  ┌─────────────────────────────────────────────────────────────┐    ║
║  │ dependencyGraph {                                           │    ║
║  │   "TestLogin.java": {                                       │    ║
║  │     dependsOn: ["LoginPage.java", "BaseTest.java"],        │    ║
║  │     type: "test"                                            │    ║
║  │   },                                                         │    ║
║  │   "LoginPage.java": {                                       │    ║
║  │     dependsOn: ["BaseClass.java"],                          │    ║
║  │     type: "pageObject"                                      │    ║
║  │   },                                                         │    ║
║  │   "BaseClass.java": {                                       │    ║
║  │     dependsOn: [],                                          │    ║
║  │     type: "base"                                            │    ║
║  │   }                                                          │    ║
║  │ }                                                            │    ║
║  │                                                              │    ║
║  │ methodContentMap {                                          │    ║
║  │   "Config.loadProperties": "public static Properties...",   │    ║
║  │   "LoginPage.login": "public void login(String u, p)..."    │    ║
║  │ }                                                            │    ║
║  └─────────────────────────────────────────────────────────────┘    ║
║                           ↓ CLIENT PASSES ↓                          ║
║  /process-project receives same data in request body                 ║
║                                                                       ║
╚═══════════════════════════════════════════════════════════════════════╝
```

---

## Critical Services & Functions Reference

| Service | Function | Purpose | File |
|---------|----------|---------|------|
| **uploadService.js** | `handleZip()` | Extract & parse .zip files | `backend/services/uploadService.js` |
| **fileAnalyzer.js** | `detectFramework()` | Identify Selenium framework (JUnit/TestNG) | `backend/utils/fileAnalyzer.js` |
| **fileAnalyzer.js** | `classifyFiles()` | Categorize files into test/page/base/utils | `backend/utils/fileAnalyzer.js` |
| **fileAnalyzer.js** | `mapTestsToPOMs()` | Link tests to their page objects | `backend/utils/fileAnalyzer.js` |
| **dependencyResolver.js** | `buildDependencyGraphWithUtil()` | Build execution dependency graph | `backend/services/dependencyResolver.js` |
| **dependencyResolver.js** | `topoSortWithBuckets()` | Order files respecting dependencies | `backend/services/dependencyResolver.js` |
| **dependencyResolver.js** | `buildContext()` | Extract dependencies for conversion context | `backend/services/dependencyResolver.js` |
| **conversionOrchestrator.js** | `processFiles()` | Convert each file via AI with validation | `backend/services/conversionOrchestrator.js` |
| **aiService.js** | `convertWithAI()` | Gemini API call to convert Selenium → Playwright | `backend/services/aiService.js` |
| **AccuracyPipeline** | `analyzeFile()` | Verify structural parity in conversion | `backend/utils/AccuracyPipeline.js` |
| **CriticAgent** | `analyze()` | Validate reasoning & logic correctness | `backend/services/criticAiService.js` |
| **projectBuilder.js** | `buildProject()` | Generate physical Playwright project | `backend/services/projectBuilder.js` |
| **executionService.js** | `executeProject()` | Run tests & generate Allure report | `backend/services/executionService.js` |
| **executionService.js** | `runPlaywrightProject()` | Execute npm install, Playwright test | `backend/services/executionService.js` |

---

## Workflow Summary

### Phase 1: Analysis (`/upload` endpoint)
1. **Extract**: Unzip files and extract Java code
2. **Classify**: Identify test files, POMs, base classes, utilities
3. **Map**: Link tests to page objects
4. **Analyze**: Build dependency graph showing which files depend on what

### Phase 2: Conversion (`/process-project` endpoint)
1. **Order**: Use topological sort to determine optimal conversion order
2. **Convert**: Convert each file Selenium → Playwright (with AI validation)
3. **Build**: Generate complete Playwright project structure
4. **Execute**: Run tests to verify conversion success
5. **Package**: Zip project for download

---

## Data Structures

### dependencyGraph
```javascript
{
  "TestLogin.java": {
    file: { /* full file object */ },
    dependsOn: ["LoginPage.java", "BaseTest.java"],
    type: "test"
  },
  "LoginPage.java": {
    file: { /* full file object */ },
    dependsOn: ["BaseClass.java"],
    type: "pageObject"
  },
  "BaseClass.java": {
    file: { /* full file object */ },
    dependsOn: [],
    type: "base"
  }
}
```

### methodContentMap
```javascript
{
  "Config.loadProperties": "public static Properties load() { ... }",
  "LoginPage.login": "public void login(String username, String password) { ... }",
  "BaseTest.setUp": "public void setUp() { ... }"
}
```

### classified (File Classification)
```javascript
{
  testFiles: [ /* TestLogin.java, TestDashboard.java, ... */ ],
  pageObjects: [ /* LoginPage.java, DashboardPage.java, ... */ ],
  baseClasses: [ /* BaseTest.java, BasePage.java, ... */ ],
  utils: [ /* Config.java, Utils.java, ... */ ]
}
```

---

## Key Integration Points

### Between `/upload` and `/process-project`
- **dependencyGraph**: Determines conversion order and context
- **methodContentMap**: Provides method implementations for code generation
- **classified**: Tracks file types for conversion strategy

### Within `/process-project`
- **topoSort** output feeds into **processFiles** (tells which order to convert)
- **buildContext** uses **dependencyGraph** to gather required imports
- **convertWithAI** receives context from **buildContext**
- **AccuracyPipeline** validates each AI-generated file
- **CriticAgent** approves or rejects conversion for retry

---

## Technology Stack

- **Backend**: Node.js + Express.js
- **Conversion Engine**: Google Gemini API
- **Validation**: AST Analysis + Behavioral Testing
- **Testing**: Playwright Test Framework
- **Reporting**: Allure Reports
- **Rate Limiting**: Bottleneck library
- **File Handling**: multer, adm-zip, fs-extra

---

*Generated for SwiftMigrate Documentation*
*Branch: seema_Analyzer*
*Repository: bsdangra/swiftmigrate*
