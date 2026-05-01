import { buildContext } from "./dependencyResolver.js";
import { convertWithAI } from "./aiService.js";
import { validatePlaywrightCode } from "./validator.js";
import { emitProgress } from "./progressEmitter.js";
import { preprocess } from "../preprocess.js";
import { SocketMessageCategory } from "../socket.js";

export async function processFiles(orderedFiles, dependencyGraph, methodContentMap) {
  const memory = {};
  const maxAttempts = 2;

  for (const fileName of orderedFiles) {
    const node = dependencyGraph[fileName];
    const file = node.file;
    let totalTokenUsed = 0;

    console.log(`\n🔄 Converting: ${fileName}`);
    emitProgress('conversion', `Converting: ${fileName}`, SocketMessageCategory.INFO, { file: fileName });

    const context = buildContext(fileName, dependencyGraph, memory, methodContentMap);

    const dependencyCode = context.dependencies;
   
    const preprocessResult = preprocess(file.content);

    let attempt = 0;
    let playwrightCode = "";
    let generationOutput = "";
    let lastError = "";

    while (attempt < maxAttempts) {
      attempt++;

      emitProgress('conversion', `Attempt ${attempt} for ${fileName}`, SocketMessageCategory.INFO, { file: fileName, attempt });

      // 🔥 Convert
      playwrightCode = await convertWithAI(
        fileName,
        file.content,
        dependencyCode,
        lastError,
        preprocessResult
      );

      playwrightCode = generationOutput.playwrightCode;
      totalTokenUsed += generationOutput.tokenUsed || 0;

      // 🔥 Validate
      const validation = validatePlaywrightCode(playwrightCode, file.type);

      if (validation.valid) {
        emitProgress('conversion', `Valid code for ${fileName}`,SocketMessageCategory.SUCCESS, { file: fileName });
        break;
      }

      emitProgress('conversion', `Validation failed: ${validation.error}`, SocketMessageCategory.ERROR, { file: fileName, attempt });

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

  return {memory, totalTokenUsed};
}
