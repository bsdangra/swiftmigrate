import { buildContext } from "./dependencyResolver.js";
import { convertWithAI } from "./aiService.js";
import { validatePlaywrightCode } from "./validator.js";
import { preprocess } from "../preprocess.js";

export async function processFiles(orderedFiles, dependencyGraph) {
  const memory = {};
  const maxAttempts = 2;

  for (const fileName of orderedFiles) {
    const node = dependencyGraph[fileName];
    const file = node.file;

    console.log(`\n🔄 Converting: ${fileName}`);

    const context = buildContext(fileName, dependencyGraph, memory);

    const dependencyCode = context.dependencies
      .map(dep => dep.content)
      .join("\n\n");

    const preprocessResult = preprocess(file.content);

    let attempt = 0;
    let playwrightCode = "";
    let lastError = "";

    while (attempt < maxAttempts) {
      attempt++;

      console.log(`Attempt ${attempt} for ${fileName}`);

      // 🔥 Convert
      playwrightCode = await convertWithAI(
        file.content,
        dependencyCode,
        lastError,
        preprocessResult
      );

      // 🔥 Validate
      const validation = validatePlaywrightCode(playwrightCode, file.type);

      if (validation.valid) {
        console.log(`✅ Valid code for ${fileName}`);
        break;
      }

      console.log(`❌ Validation failed: ${validation.error}`);

      // 🔥 Prepare error for next retry
      lastError = `
Validation Failed:
${validation.error}

Fix the code accordingly.
`;
    }

    // 🔥 Store result
    memory[fileName] = {
      content: playwrightCode,
      type: context.type
    };
  }

  return memory;
}