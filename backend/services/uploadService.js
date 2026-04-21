import AdmZip from "adm-zip";
import fsExtra from "fs-extra";
import path from "path";
import { extractDependencies } from "../dependencyExtractor.js";

// 🔍 Detect file type
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

// 📦 Handle ZIP
export async function handleZip(zipPath) {
  const zip = new AdmZip(zipPath);

  const extractPath = path.join(
    "uploads",
    "extracted_" + Date.now()
  );

  zip.extractAllTo(extractPath, true);

  const javaFiles = getAllJavaFiles(extractPath);

  const results = [];
  const classIndex = {};   // shared map of class and path
  const dependenyJson = [];      // depedency json

  for (const filePath of javaFiles) {
    const content = await fsExtra.readFile(filePath, "utf-8");
    const classAnalysis = extractDependencies(filePath, classIndex);
    dependenyJson.push(classAnalysis);

    results.push({
      fileName: path.basename(filePath),
      content,
      type: detectFileType(content),
    });
  }
  console.log("handleZip - classIndex", { classIndex });
  console.dir(dependenyJson, { depth: null });

  return results;
}

// 🔁 Recursive scan
function getAllJavaFiles(dir) {
  let results = [];

  const list = fsExtra.readdirSync(dir);

  list.forEach((file) => {
    const filePath = path.join(dir, file);
    const stat = fsExtra.statSync(filePath);

    if (stat.isDirectory()) {
      results = results.concat(getAllJavaFiles(filePath));
    } else if (file.endsWith(".java")) {
      results.push(filePath);
    }
  });

  return results;
}
