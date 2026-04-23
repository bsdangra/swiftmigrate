import fs from "fs-extra";
import path from "path";

// 🔥 MAIN FUNCTION
export async function buildProject(convertedFiles) {
  const outputDir = path.join(process.cwd(), "output");

  // 1. Clean old output
  await fs.emptyDir(outputDir);

  // 2. Create folders
  const pagesDir = path.join(outputDir, "pages");
  const testsDir = path.join(outputDir, "tests");

  await fs.ensureDir(pagesDir);
  await fs.ensureDir(testsDir);

  // 3. Write converted files
  for (const [fileName, data] of Object.entries(convertedFiles)) {
    const baseName = fileName.replace(".java", "");

    let filePath;

    if (data.type === "test") {
      filePath = path.join(testsDir, `${baseName}.spec.ts`);
    } else {
      filePath = path.join(pagesDir, `${baseName}.ts`);
    }

    await fs.writeFile(filePath, data.content, "utf-8");
  }

  // 4. Generate package.json
  const packageJson = {
    name: "converted-playwright-project",
    version: "1.0.0",
    private: true,
    scripts: {
      test: "playwright test"
    },
    devDependencies: {
      "@playwright/test": "^1.45.0",
      "typescript": "^5.0.0"
    }
  };

  await fs.writeJson(
    path.join(outputDir, "package.json"),
    packageJson,
    { spaces: 2 }
  );

  // 5. Generate playwright.config.ts
  const playwrightConfig = `
import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './tests',
  use: {
    headless: true,
  },
});
`;

  await fs.writeFile(
    path.join(outputDir, "playwright.config.ts"),
    playwrightConfig,
    "utf-8"
  );

  // 6. Generate tsconfig.json
  const tsConfig = {
    compilerOptions: {
      target: "ESNext",
      module: "commonjs",
      strict: true,
      esModuleInterop: true,
      moduleResolution: "node",
      resolveJsonModule: true,
      outDir: "dist"
    },
    include: ["tests", "pages"]
  };

  await fs.writeJson(
    path.join(outputDir, "tsconfig.json"),
    tsConfig,
    { spaces: 2 }
  );

  console.log("✅ Playwright project generated at:", outputDir);

  return outputDir;
}