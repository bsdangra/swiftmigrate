// services/pomResolver.js

// 🔍 Extract all methods from a POM
export function extractMethodsFromPOM(pomContent) {
  const methods = {};

  const methodRegex =
    /public\s+(?:\w+\s+)*(\w+)\s*\((.*?)\)\s*{([\s\S]*?)}\s*$/gm;

  let match;

  while ((match = methodRegex.exec(pomContent)) !== null) {
    const methodName = match[1];

    const params = match[2]
      .split(",")
      .map((p) => p.trim().split(" ").pop())
      .filter(Boolean);

    const body = match[3].trim();

    methods[methodName] = {
      params,
      body,
    };
  }

  return methods;
}


// 🧠 Decide if method is SAFE to inline
function isSafeToInline(body) {
  return (
    body.includes("driver.findElement") &&
    !body.includes("return") &&
    !body.includes("Assert")
  );
}


// 🔍 Detect unresolved method calls (filtered)
export function findUnresolvedCalls(code) {
  const regex = /\b(\w+)\.(\w+)\(.*?\);/g;

  const matches = [];
  let match;

  while ((match = regex.exec(code)) !== null) {
    const obj = match[1];

    // ignore known safe objects
    if (["driver", "By", "Assert", "Log"].includes(obj)) continue;

    matches.push(match[0]);
  }

  return matches;
}


// 🔥 MAIN RESOLVER (SELECTIVE)
export function resolvePOM(testContent, mappedPOMs = []) {
  let resolved = testContent;

  mappedPOMs.forEach((pom) => {
    const methods = extractMethodsFromPOM(pom.content);

    Object.entries(methods).forEach(([methodName, method]) => {

      const callRegex = new RegExp(
        `(\\w+\\s*=\\s*)?(\\w+)\\.${methodName}\\((.*?)\\);`,
        "g"
      );

      resolved = resolved.replace(
        callRegex,
        (match, assignment, objName, argsStr) => {

          // 🛑 STEP 1: Skip unsafe methods
          if (!isSafeToInline(method.body)) {
            return match;
          }

          // ✅ parse args safely
          const args =
            argsStr.match(/(".*?"|[^,]+)/g)?.map(a => a.trim()) || [];

          let body = method.body;

          // 🔁 Replace parameters
          method.params.forEach((param, index) => {
            const value = args[index] || param;

            const paramRegex = new RegExp(`\\b${param}\\b`, "g");
            body = body.replace(paramRegex, value);
          });

          // 🔥 Preserve object context (IMPORTANT)
          body = body.replace(/(\w+)\(/g, `${objName}.$1(`);

          // format output
          const formattedBody = body
            .split("\n")
            .map(line => "        " + line.trim())
            .join("\n");

          return `
${formattedBody}
`;
        }
      );
    });
  });

  return resolved;
}


// 🔥 RESOLVER WITH REPORT
export function resolvePOMWithReport(testContent, mappedPOMs = []) {
  const resolvedCode = resolvePOM(testContent, mappedPOMs);

  const unresolvedCalls = findUnresolvedCalls(resolvedCode);

  return {
    resolvedCode,
    unresolvedCalls,
  };
}