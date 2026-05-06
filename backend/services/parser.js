import * as Parser from 'web-tree-sitter';
//import Java from 'tree-sitter-java';
import fs from "fs";
import path from "path";

//const parser = new Parser();
//const parser = new Parser.default();
//parser.setLanguage(Java);

async function initParser() {
   // ✅ In newer versions, this may not be required
 /* if (Parser.init) {
    await Parser.init();
  }
*/
 await Parser.Parser.init();

  const parser = new Parser.Parser();

  // ✅ IMPORTANT: use Java grammar wasm, NOT core wasm
  const Java = await Parser.Language.load(
    './node_modules/tree-sitter-java/tree-sitter-java.wasm'
  );

  parser.setLanguage(Java);

  return parser;
}
let parser;
(async () => {
  parser = await initParser();
  console.log("Parser initialized ✅");
})();

export async function analyzeJavaFile(filePath) {

    let code = fs.readFileSync(filePath, "utf-8");
    code = code
  .replace(/\/\/.*$/gm, '')       // remove single-line comments
  .replace(/\/\*[\s\S]*?\*\//g, ''); // remove block comments
    console.log(`filePath ${filePath}`)
  const tree = parser.parse(code);
  const root = tree.rootNode;
 // console.log(`root ${JSON.stringify(root)}`)

  const data = {
    fileName: null,
    dependencies: new Set(),
    methodCalls: [],
    testMethods: [],
    annotations: [],
    imports: [],
    fieldTypes: [],
    objectMap: {}
  };

  function walk(node) {
   // console.log(`============inside walk ${node.type}`)
    // 📌 Class name
    if (node.type === 'class_declaration') {
      const nameNode = node.childForFieldName('name');
      if (nameNode) data.fileName = nameNode.text;
 //     console.log(`data.fileName ${JSON.stringify(data.fileName)}`)
    }

    // 📌 Imports
    if (node.type === 'import_declaration') {
      data.imports.push(node.text);
    }
//    console.log(`data.imports ${JSON.stringify(data.imports)}`)

    // 📌 Annotations
    if (node.type === 'marker_annotation') {
      data.annotations.push(node.text);
    }

    // 📌 Field declarations (class-level)
    if (node.type === 'field_declaration') {
      const typeNode = node.childForFieldName('type');
      const declarator = node.descendantsOfType('variable_declarator')[0];

      if (typeNode) {
        data.fieldTypes.push(typeNode.text);
        data.dependencies.add(typeNode.text);
      }

      if (declarator) {
        const nameNode = declarator.childForFieldName('name');
        if (nameNode && typeNode) {
          data.objectMap[nameNode.text] = typeNode.text;
        }
      }
    }

    // 📌 Local variable declarations
    if (node.type === 'local_variable_declaration') {
      const typeNode = node.childForFieldName('type');
      const declarator = node.descendantsOfType('variable_declarator')[0];

      if (typeNode) {
        data.dependencies.add(typeNode.text);
      }

      if (declarator) {
        const nameNode = declarator.childForFieldName('name');
        if (nameNode && typeNode) {
          data.objectMap[nameNode.text] = typeNode.text;
        }
      }
    }

    // 📌 Method calls
    if (node.type === 'method_invocation') {
      const objectNode = node.childForFieldName('object');
      const methodNode = node.childForFieldName('name');

      if (methodNode) {
        if (objectNode) {
          data.methodCalls.push(`${objectNode.text}.${methodNode.text}`);
        } else {
          data.methodCalls.push(methodNode.text);
        }
      }
    }

    // 📌 Test methods
    if (node.type === 'method_declaration') {
      const methodName = node.childForFieldName('name')?.text;

      const hasTestAnnotation = node.children.some(
        child =>
          child.type === 'modifiers' &&
          child.text.includes('@Test')
      );

      if (hasTestAnnotation && methodName) {
        data.testMethods.push(methodName);
      }
    }

    node.children.forEach(walk);
  }

  walk(root);
 // return data;

  // 🔥 Convert dependencies set → array
  const dependencies = [...data.dependencies];

  // 🔥 Detect file type
  const fileType = classifyFile({
    annotations: data.annotations,
    imports: data.imports,
    methodCalls: data.methodCalls,
    fieldTypes: data.fieldTypes,
    testMethods: data.testMethods
  });

let outdata = {
    fileName: data.fileName,
    fileType,
    dependencies,
    methodCalls: data.methodCalls,
    testMethods: data.testMethods,
    imports: data.imports
  };

console.log(`parsing data.fileName :::: fileType: ${JSON.stringify(data)} `)
  return outdata;
}


// 🧠 File Type Classification (Integrated)

function classifyFile({ annotations, imports, methodCalls, fieldTypes, testMethods }) {
  let score = {
    test: 0,
    pageObject: 0,
    config: 0,
    utility: 0
  };

  // ✅ TEST signals
  if (annotations.some(a => a.includes('@Test'))) score.test += 5;
  if (imports.some(i => i.includes('testng') || i.includes('junit'))) score.test += 3;
  if (testMethods.length > 0) score.test += 5;

  // ✅ PAGE OBJECT signals
  if (fieldTypes.includes('WebElement')) score.pageObject += 5;
  if (annotations.some(a => a.includes('@FindBy'))) score.pageObject += 3;
  if (methodCalls.some(m => ['click', 'sendKeys'].some(k => m.includes(k)))) score.pageObject += 2;

  // ✅ CONFIG signals
  if (methodCalls.length === 0 && fieldTypes.length > 0) score.config += 3;

  // ✅ UTILITY fallback
  score.utility = 1;
console.log(`classifyFile score : ${JSON.stringify(score)}`)
  return Object.entries(score).sort((a, b) => b[1] - a[1])[0][0];
}

//module.exports = { analyzeJavaFile };
