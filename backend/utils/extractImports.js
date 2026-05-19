import axios from "axios";

const IMPORT_REGEX =
  /from\s+['"]([^'"]+)['"]|require\(['"]([^'"]+)['"]\)|import\(['"]([^'"]+)['"]\)/g;

export function extractImports(code) {
  const imports = new Set();

  let match;

  while ((match = IMPORT_REGEX.exec(code)) !== null) {
    const rawImport =
      match[1] || match[2] || match[3];

    if (!rawImport) continue;

    // ignore local imports
    if (
      rawImport.startsWith(".") ||
      rawImport.startsWith("/")
    ) {
      continue;
    }

    imports.add(rawImport);
  }

  return [...imports];
}

export function normalizePackage(importPath) {
  // scoped packages
  if (importPath.startsWith("@")) {
    return importPath
      .split("/")
      .slice(0, 2)
      .join("/");
  }

  // normal packages
  return importPath.split("/")[0];
}

export async function validatePackage(pkg) {
  try {
    const response = await axios.get(
      `https://registry.npmjs.org/${pkg}`
    );

    const data = response.data;

    return {
      valid: true,
      package: pkg,
      version: `^${data["dist-tags"]?.latest}`,
    };
  } catch (error) {
    // npm returns 404 for invalid packages
    if (error.response?.status === 404) {
      return {
        valid: false,
        package: pkg,
        reason: "Package not found",
      };
    }

    return {
      valid: false,
      package: pkg,
      reason: error.message,
    };
  }
}

export async function resolvePackages(code) {
  const imports = extractImports(code);

  const normalizedPackages = [
    ...new Set(
      imports.map(normalizePackage)
    ),
  ];

  const validPackages = [];
  const invalidPackages = [];

  for (const pkg of normalizedPackages) {
    const result =
      await validatePackage(pkg);

    if (result.valid) {
      validPackages.push(result);
    } else {
      invalidPackages.push(result);
    }
  }

  return {
    validPackages,
    invalidPackages,
  };
}