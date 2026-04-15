export function detectFailureType(error = "") {
  const e = error.toLowerCase();

  if (e.includes("waiting for locator") || e.includes("locator")) {
    return {
      type: "locator_issue",
      message: "Element not found in DOM",
      fix: `
- Locator may be incorrect or element not present
- Use better selectors (getByRole, getByText)
- Add safety check using locator.count()
`
    };
  }

  if (e.includes("timeout")) {
    return {
      type: "timeout_issue",
      message: "Operation timed out",
      fix: `
- Add proper waits (waitForSelector / expect)
- Ensure page is loaded before interaction
`
    };
  }

  if (e.includes("expect") || e.includes("assert")) {
    return {
      type: "assertion_issue",
      message: "Validation failed",
      fix: `
- Expected condition not met
- Update assertion or validate correct element/text
`
    };
  }

  return {
    type: "unknown",
    message: "Unknown failure",
    fix: `
- Analyze error and fix accordingly
`
  };
}