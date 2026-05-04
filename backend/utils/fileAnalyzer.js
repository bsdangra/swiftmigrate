// utils/fileAnalyzer.js

import { extractUsedClassesV2 } from "./fileClassifierV2.js";



export function detectFramework(files) {
  let isTestNG = false;
  let isJUnit4 = false;
  let isJUnit5 = false;

  for (const file of files) {
    const content = file.content || "";

    if (
      content.includes("org.testng") ||
      content.includes("@Test") && content.includes("TestNG")
    ) {
      isTestNG = true;
    }

    if (content.includes("org.junit.") && !content.includes("org.junit.jupiter")) {
      isJUnit4 = true;
    }

    if (content.includes("org.junit.jupiter")) {
      isJUnit5 = true;
    }
  }

  // 🔥 Priority logic
  if (isTestNG) return "TestNG";
  if (isJUnit5) return "JUnit5";
  if (isJUnit4) return "JUnit4";

  return "unknown";
}


export function classifyFiles(files) {
  const result = {
    testFiles: [],
    pageObjects: [],
    baseClasses: [],
    utils: []
  };

  files.forEach((file) => {
    const name = file.fileName.toLowerCase();
    const content = file.content || "";

    const fileType = detectFileType(name, content);
    // ✅ 1. TEST (STRICT)
    if (fileType === ("test") 
    ) {
      result.testFiles.push(file);
      return;
    }

    // ✅ 2. PAGE OBJECT
    if (
      fileType === ("pageObject")
    ) {
      result.pageObjects.push(file);
      return;
    }

    // ✅ 3. BASE CLASS
    if (
      fileType === ("base")
    ) {
      result.baseClasses.push(file);
      return;
    }

    // ✅ 4. UTILS / SUPPORT FILES
    if (fileType === ("utility")) {
      result.utils.push(file);
      return;
    }
  });

  return result;
}

export function detectFileType(fileName, content){
  const isTestByAnnotation = /@Test\b/.test(content);
    const hasLifecycleAnnotation = /@(BeforeClass|AfterClass|BeforeMethod|AfterMethod|BeforeTest|AfterTest|BeforeSuite|AfterSuite|BeforeGroups|AfterGroups|Before|After)\b/.test(content);
    const isPageByContent =
      content.includes("WebElement") ||
      content.includes("PageFactory") ||
      content.includes("@FindBy") ||
      content.includes("@FindBys") ||
      content.includes("@FindAll") ||
      content.includes("By ") ||
      content.includes("findElement") ||
      content.includes("findElements");
    const isBaseByContent =
      content.includes("WebDriver") &&
      (content.includes("setup") ||
        content.includes("initialize") ||
        content.includes("driver =") ||
        content.includes("tearDown") ||
        content.includes("quit") ||
        content.includes("close") ||
        content.includes("new ChromeDriver") ||
        content.includes("new FirefoxDriver") ||
        content.includes("new RemoteWebDriver") ||
        hasLifecycleAnnotation);
    const isUtilityByName =
      fileName.includes("util") ||
      fileName.includes("helper") ||
      fileName.includes("manager") ||
      fileName.includes("logger") ||
      fileName.includes("listener") ||
      fileName.includes("config") ||
      fileName.includes("constant") ||
      fileName.includes("properties");

    // ✅ 1. TEST (STRICT)
    if (
      fileName.endsWith("test.java") ||   // 🔥 stricter
      isTestByAnnotation
    ) {
      return "test";
    }

  // ✅ 2. BASE CLASS
    if (
      fileName.includes("base") ||
      isBaseByContent
    ) {
      return "base";
    }

    // ✅ 3. PAGE OBJECT
    if (
      fileName.endsWith("page.java") ||   // 🔥 stricter
      isPageByContent
    ) {
      return "pageObject";
    }

    // ✅ 4. UTILS / SUPPORT FILES
    if (isUtilityByName) {
      return "utility";
    }

    // ❗ fallback
    return "utility";
}

export function extractUsedClasses(testContent) {
  const regex = /new\s+(\w+)/g;
  const classes = new Set();

  let match;
  while ((match = regex.exec(testContent)) !== null) {
    classes.add(match[1]);
  }

  return Array.from(classes);
}

export function mapTestsToPOMs(testFiles, pageObjects) {
  return testFiles.map(test => {
    const usedClasses = extractUsedClassesV2(test.content);

    const normalize = (name) => name.toLowerCase();

    const pageObjectNames = pageObjects.map(p =>
      p.fileName.replace(".java", "").toLowerCase()
    );

    // ✅ Only Page Objects → for dependency graph
    const mappedPOMs = pageObjects.filter(pom =>
      usedClasses.some(cls =>
        normalize(cls) === normalize(pom.fileName.replace(".java", ""))
      )
    );

    // 🔥 Separate non-POM classes
    const nonPOMClasses = usedClasses.filter(cls =>
      !pageObjectNames.includes(normalize(cls))
    );

    return {
      ...test,
      mappedPOMs,

      // 🔥 IMPORTANT separation
      helperClasses: nonPOMClasses.filter(cls =>
        cls.endsWith("Util") ||
        cls.endsWith("Manager") ||
        cls.endsWith("Logger") ||
        cls.endsWith("Listener") ||
        cls.endsWith("Helper") ||
        cls.endsWith("Config") ||
        cls.endsWith("Constant")
      ),

      externalClasses: nonPOMClasses.filter(cls =>
        cls === "ChromeDriver" ||
        cls === "FirefoxDriver" ||
        cls === "EdgeDriver" ||
        cls === "RemoteWebDriver" ||
        cls === "Logger" ||
        cls === "SoftAssert" ||
        cls === "WebDriverWait" ||
        cls === "Actions" ||
        cls === "Assert" ||
        cls === "JavascriptExecutor" ||
        cls === "ChromeOptions" ||
        cls === "DesiredCapabilities" ||
        cls === "EventFiringWebDriver" ||
        cls === "Select" ||
        cls === "Alert"
      )
    };
  });
}

export function filterRelevantFiles(files) {
  return files.filter(file => {
    const name = file.fileName.toLowerCase();
    const content = file.content || "";
    const hasLifecycleAnnotation = /@(BeforeClass|AfterClass|BeforeMethod|AfterMethod|BeforeTest|AfterTest|BeforeSuite|AfterSuite|BeforeGroups|AfterGroups|Before|After)\b/.test(content);

    if (!name.endsWith(".java")) return false;

    // ✅ Keep core files
    if (
      name.includes("test") ||
      name.includes("page") ||
      name.includes("base")
    ) {
      return true;
    }

    // 🔥 NEW: include support files (important)
    if (
      name.includes("util") ||
      name.includes("helper") ||
      name.includes("listener") ||
      name.includes("logger") ||
      name.includes("manager") ||
      name.includes("config") ||
      name.includes("constant") ||
      name.includes("properties")
    ) {
      return true;
    }

    // ✅ fallback
    if (
      /@Test\b/.test(content) ||
      content.includes("WebElement") ||
      content.includes("PageFactory") ||
      content.includes("@FindBy") ||
      content.includes("@FindBys") ||
      content.includes("@FindAll") ||
      content.includes("By ") ||
      content.includes("findElement") ||
      content.includes("findElements") ||
      content.includes("WebDriver") ||
      hasLifecycleAnnotation
    ) {
      return true;
    }

    return false;
  });
}
