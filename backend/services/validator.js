export function validatePlaywrightCode(code = "", type = "test") {
  const issues = [];
 
  if (!code || code.trim().length === 0) {
    return { valid: false, issues: ["Empty code"] };
  }
 
  const normalized = code.replace(/\s+/g, " ");
 
  // =========================
  // 🔥 GLOBAL ANTI-PATTERNS
  // =========================
 
  if (code.includes("driver.")) {
    issues.push("Selenium driver usage detected (should be removed)");
  }
 
  if (code.includes("Thread.sleep")) {
    issues.push("Thread.sleep detected (should use Playwright waits)");
  }
 
  if (code.includes("findElement")) {
    issues.push("Selenium locator (findElement) detected");
  }
 
  if (code.includes("By.")) {
    issues.push("Selenium 'By' locator detected");
  }
 
  // =========================
  // 🔥 TYPE-SPECIFIC HEURISTICS
  // =========================
 
  if (type === "test") {
    // ⚠️ Should not miss async when using page
    if (code.includes("page.") && !code.includes("await")) {
      issues.push("Playwright actions without await");
    }
 
    // ⚠️ Should not use sync test
    if (/test\s*\(/.test(normalized) && !code.includes("async")) {
      issues.push("Test block is not async");
    }
 
    // ⚠️ Should not miss test block entirely
    if (!/test\s*\(/.test(normalized)) {
      issues.push("No Playwright test() block detected");
    }
  }
 
  if (type === "pageObject") {
    // ⚠️ Should not miss class structure
    if (!/class\s+\w+/.test(normalized)) {
      issues.push("Page object missing class structure");
    }
 
    // ⚠️ Should not contain test blocks
    if (/@Test\s*\(/.test(normalized)) {
      issues.push("Page object should not contain test()");
    }
  }
 
  if (type === "base") {
    // ⚠️ Should not contain test blocks
    if (/@Test\s*\(/.test(normalized)) {
      issues.push("Base class should not contain test()");
    }
  }
 
  // =========================
  // 🔥 STRUCTURAL SANITY
  // =========================
 
  const openBraces = (code.match(/{/g) || []).length;
  const closeBraces = (code.match(/}/g) || []).length;
 
  if (openBraces !== closeBraces) {
    issues.push("Unbalanced curly braces");
  }
 
  const openParens = (code.match(/\(/g) || []).length;
  const closeParens = (code.match(/\)/g) || []).length;
 
  if (openParens !== closeParens) {
    issues.push("Unbalanced parentheses");
  }
 
  // =========================
  // 🎯 FINAL RESULT
  // =========================
  
  return {
    valid: issues.length === 0,
    error: issues
  };
}
 
