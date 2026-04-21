// dependencyExtractor.js

import fs from "fs";



// -------- Extract Package --------
function extractPackage(content) {
  const match = content.match(/package\s+([\w\.]+);/);
  return match ? match[1] : null;
}

// -------- Extract Imports --------
function extractImports(content) {
  return [...content.matchAll(/import\s+([\w\.]+);/g)].map(m => m[1]);
}

// -------- Extract Class + Extends --------
/*function extractClassInfo(content) {
  const classMatch = content.match(/class\s+(\w+)/);
  const extendsMatch = content.match(/extends\s+(\w+)/);

  return {
    className: classMatch ? classMatch[1] : null,
    extends: extendsMatch ? { class: extendsMatch[1] } : null
  };
}*/

function extractExtends(content){
  const match = content.match(/class\s+\w+\s+extends\s+(\w+)/);
  return match ? { class: match[1] } : null;
}

// -------- Extract Variables --------
function extractVariables(content) {
  const vars = [];

  // Matches: LoginPage loginPage = new LoginPage(...)
  const regex = /(\w+)\s+(\w+)\s*=\s*new\s+(\w+)\s*\(/g;

  for (const m of content.matchAll(regex)) {
    vars.push({
      name: m[2],
      type: m[1],
      initializedWith: "new"
    });
  }

  return vars;
}

// -------- Extract 'new' calls --------
/*function extractNew(content) {
  return [...content.matchAll(/new\s+(\w+)\s*\(([^)]*)\)/g)].map(m => ({
    class: m[1],
    arguments: m[2] ? m[2].split(",").map(a => a.trim()) : []
  }));
}*/

// -------- Extract Methods --------
function extractMethods(content, variables) {
  const methods = [];

  // Simple method regex (MVP)
  const methodRegex = /public\s+void\s+(\w+)\s*\([^)]*\)\s*\{([\s\S]*?)\}/g;

  for (const m of content.matchAll(methodRegex)) {
    const methodName = m[1];
    const body = m[2];

    // Build variable map
   /* const variableMap = {};
    variables.forEach(v => {
      variableMap[v.name] = v.type;
    });*/
     // 👉 Step 1: find variables USED in this method
    const variableMap = {};
    variables.forEach(v => {
      const usageRegex = new RegExp(`\\b${v.name}\\b`);

      if (usageRegex.test(body)) {
        variableMap[v.name] = v.type;
      }
    });

    // Extract method calls
    const calls = [];

    // 1. Constructor calls
    for (const c of body.matchAll(/new\s+(\w+)\s*\(/g)) {
      calls.push({
        type: "constructor",
        targetClass: c[1],
        via: "new",
        
      });
    }

    // 2. Object method calls
    for (const c of body.matchAll(/(\w+)\.(\w+)\s*\(/g)) {
      const caller = c[1];
      const method = c[2];

      if (variableMap[caller]) {
        calls.push({
          type: "method",
          caller,
          targetClass: variableMap[caller],
          targetMethod: method,
       
        });
      } else {
        // Could be static
        calls.push({
          type: "static",
          targetClass: caller,
          targetMethod: method,
         
        });
      }
    }

    methods.push({
      methodName,
      variableMap,
      calls
    });
  }

  return methods;
}

function buildClassIndex(content, classIndex, filePath) {
  
    const classMatch = content.match(/class\s+(\w+)/);
   
    if (classMatch) {
      const className = classMatch[1];
      classIndex[className] = {
        path: filePath
      };
    }

  return classIndex;
}

export function detectFileType(content) {
  if (content.includes("@Test")) return "test";

  if (
    content.includes("WebElement") ||
    content.includes("By.") ||
    content.includes("findElement")
  ) {
    return "pageObject";
  }

  return "unknown";
}


// -------- MAIN FUNCTION --------
export function extractDependencies(filePath, classIndex) {
  
  const content = fs.readFileSync(filePath, "utf-8");
    
  classIndex = buildClassIndex(content, classIndex, filePath);

  const fileNameMatch = filePath.match(/[^\\/]+$/);
  const fileName = fileNameMatch? fileNameMatch[0] : null;
  const pkg = extractPackage(content);
  const fileType = detectFileType(content);
  const imports = extractImports(content);
  const extend  = extractExtends(content);
  const variables = extractVariables(content);
  const methods = extractMethods(content, variables);
//console.log("classIndex", { classIndex });
//console.log("extractDependencies", { fileName, pkg, fileType, imports, extend, variables, methods });
  return {

    file: fileName,
    package: pkg,
    fileType: fileType,
    imports,
    extends: extend,
    variables,
    methods
  };
}

// -------- Example Run --------
//const result = extractDependencies("./LoginTest.java");
//console.log(JSON.stringify(result, null, 2));
