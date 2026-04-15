export type Rule = {
  id: string;
  label: string;
  severity: "low" | "medium" | "high";
  test: (code: string) => boolean;
  suggestion: string;
};

export const RULES: Rule[] = [
  {
    id: "hardcoded_wait",
    label: "Hardcoded wait detected",
    severity: "high",
    test: (code) => /Thread\.sleep\s*\(/.test(code),
    suggestion: "Replace Thread.sleep with Playwright waits like waitForSelector"
  },
  {
    id: "xpath_locator",
    label: "XPath locator detected",
    severity: "medium",
    test: (code) => /By\.xpath\s*\(/.test(code),
    suggestion: "Prefer Playwright locators like getByRole or getByText"
  },
  {
    id: "no_assertions",
    label: "No assertions found",
    severity: "high",
    test: (code) => !/assert|verify/i.test(code),
    suggestion: "Add assertions to validate expected behavior"
  }
];