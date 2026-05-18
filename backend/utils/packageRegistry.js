// utils/packageRegistry.js

import fs from "fs";
import path from "path";

const REGISTRY_PATH = path.join(
  process.cwd(),
  "cache",
  "packageRegistry.json"
);

function ensureRegistryExists() {
  const dir = path.dirname(REGISTRY_PATH);

  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  if (!fs.existsSync(REGISTRY_PATH)) {
    fs.writeFileSync(
      REGISTRY_PATH,
      JSON.stringify({}, null, 2)
    );
  }
}

export function loadPackageRegistry() {
  ensureRegistryExists();

  return JSON.parse(
    fs.readFileSync(REGISTRY_PATH, "utf-8")
  );
}

export function savePackageToRegistry(
  pkg,
  version
) {
  ensureRegistryExists();

  const registry = loadPackageRegistry();

  /**
   * DUPLICATE CHECK
   * Skip if already present
   */
  if (registry[pkg]) {
    console.log(
      `📦 Package already cached: ${pkg}@${registry[pkg]}`
    );

    return;
  }

  /**
   * STORE NEW PACKAGE
   */
  registry[pkg] = version;

  fs.writeFileSync(
    REGISTRY_PATH,
    JSON.stringify(registry, null, 2)
  );

  console.log(
    `✅ Stored new package ${pkg}@${version}`
  );
}

export function getRepairPrompt(invalidPackageList, playwrightCode) {
    const repairPrompt = `
        You generated Playwright TypeScript code containing invalid or hallucinated npm packages.

        Invalid npm packages:
        ${invalidPackageList}

        STRICT RULES:
        - ONLY replace invalid npm packages/imports
        - Do NOT change any other code
        - Do NOT change logic
        - Do NOT change selectors
        - Do NOT change assertions
        - Do NOT refactor
        - Use only real npm packages
        - Return ONLY raw Playwright TypeScript code
        - No markdown
        - No explanations
        - No comments
        - No extra text before or after the code
        - Please output the full corrected TypeScript file having only valid code.Do not add any explanations or apologies, do not include conersion at beigning or end of the code. The output should be in the exact format as required by the rules above

        Playwright code:
        ${playwrightCode}
    `;
    return repairPrompt;
}

export function getAllCachedPackages() {
  ensureRegistryExists();

  const registry = loadPackageRegistry();

  return Object.entries(registry).map(
    ([pkg, version]) => ({
      package: pkg,
      version,
    })
  );
}