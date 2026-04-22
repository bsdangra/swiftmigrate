export function validatePlaywrightCode(code = "") {
  if (!code) {
    return {
      valid: false,
      error: "Empty code"
    };
  }

  if (!code.includes("test(") && !code.includes("class")) {
    return {
      valid: false,
      error: "Missing test or class structure"
    };
  }

  if (!code.includes("await")) {
    return {
      valid: false,
      error: "Missing async/await usage"
    };
  }

  if (!code.includes("page")) {
    return {
      valid: false,
      error: "Missing Playwright page usage"
    };
  }

  return { valid: true };
}