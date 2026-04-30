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
  const utilsDir = path.join(outputDir, "utils");
  const baseDir = path.join(outputDir, "base");
  const miscDir = path.join(outputDir, "misc");


  await fs.ensureDir(pagesDir);
  await fs.ensureDir(testsDir);
  await fs.ensureDir(utilsDir);
  await fs.ensureDir(baseDir);
  await fs.ensureDir(miscDir);


  // 3. Write converted files
  for (const [fileName, data] of Object.entries(convertedFiles)) {
    const baseName = fileName.replace(".java", "");

    let filePath;

    if (data.type === "test") {
      filePath = path.join(testsDir, `${baseName}.spec.ts`);
     data.content = data.content
    .replace(/(['"`])\.\/pages\//g, '$1../pages/')
    .replace(/(['"`])\.\/utils\//g, '$1../utils/')
    .replace(/(['"`])\.\/base\//g, '$1../base/');
     //content.replace(/(['"`])\.\/pages\//g, '$1../pages/');
    } else if (data.type === "pageObject") {
  filePath = path.join(pagesDir, `${baseName}.ts`);

} else if (data.type === "utility") {
  filePath = path.join(utilsDir, `${baseName}.ts`);

} else if (data.type === "base") {
  filePath = path.join(baseDir, `${baseName}.ts`);

} else {
  // fallback (avoid silently putting wrong files in pages)
  filePath = path.join(miscDir, `${baseName}.ts`);
}
    await fs.writeFile(filePath, data.content, "utf-8");
  }

  // 4. Generate package.json
  const packageJson = {
    name: "converted-playwright-project",
    version: "1.0.0",
    private: true,
    scripts: {
      test: "playwright test",
      "allure:report": "allure generate ./allure-results --clean -o ./allure-report",
    },
    devDependencies: {
      "@playwright/test": "^1.59.0",
      "allure-commandline": "^2.38.0",
      "allure-playwright": "^3.7.1",
      typescript: "^5.0.0",
    },
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
  reporter: [
    ['list'],
    ['allure-playwright', { outputFolder: 'allure-results' }],
  ],
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
