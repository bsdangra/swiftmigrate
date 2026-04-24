//import RULES from "./utils/rules.js";

export const RULES = [
  {
    id: "hardcoded_wait",
    label: "Hardcoded wait detected",
    severity: "high",
    test: (code) => /Thread\.sleep\s*\(/.test(code),
    suggestion: "Replace Thread.sleep with proper Playwright waits like waitForSelector"
  },
  {
    id: "xpath_locator",
    label: "XPath locator detected",
    severity: "medium",
    test: (code) => /By\.xpath\s*\(/.test(code),
    suggestion: "Replace XPath with Playwright locators like getByRole or getByText"
  },
  {
    id: "no_assertions",
    label: "No assertions found",
    severity: "high",
    test: (code) => !/assert|verify/i.test(code),
    suggestion: "Add assertions to validate expected behavior"
  }
];

export function preprocess(code) {
  const issues = [];
  const promptHints = [];

  RULES.forEach((rule) => {
    if (rule.test(code)) {
      issues.push({
        type: rule.id,
        message: rule.label,
        severity: rule.severity,
        suggestion: rule.suggestion
      });

      promptHints.push(rule.suggestion);
    }
  });

  const penaltyMap = {
    low: 10,
    medium: 20,
    high: 30
  };

  const score = Math.max(
    100 - issues.reduce((acc, i) => acc + penaltyMap[i.severity], 0),
    0
  );

  return {
    cleanedCode: code,
    issues,
    score,
    promptHints
  };
}