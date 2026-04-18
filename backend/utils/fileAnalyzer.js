// utils/fileAnalyzer.js

export function detectFramework(files) {
  let framework = "unknown";

  for (const file of files) {
    const content = file.content;

    if (content.includes("org.testng")) {
      framework = "TestNG";
      break;
    }

    if (content.includes("org.junit")) {
      framework = "JUnit";
    }
  }

  return framework;
}


export function classifyFiles(files) {
  const result = {
    testFiles: [],
    pageObjects: [],
    baseClasses: [],
    utils: [],
  };

  files.forEach((file) => {
    const content = file.content;

    if (content.includes("@Test")) {
      result.testFiles.push(file);
    } 
    else if (
      content.includes("PageFactory") ||
      content.includes("WebElement")
    ) {
      result.pageObjects.push(file);
    } 
    else if (
      content.includes("WebDriver") &&
      content.includes("setup")
    ) {
      result.baseClasses.push(file);
    } 
    else {
      result.utils.push(file);
    }
  });

  return result;
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
    const usedClasses = extractUsedClasses(test.content);

    let mappedPOMs = pageObjects.filter(pom =>
      usedClasses.some(cls =>
        pom.fileName.toLowerCase().includes(cls.toLowerCase())
      )
    );

    // ⚠️ Fallback (important for hackathon)
    if (mappedPOMs.length === 0) {
      mappedPOMs = pageObjects;
    }

    return {
      ...test,
      mappedPOMs
    };
  });
}