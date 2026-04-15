export function extractSteps(code) {
  const steps = [];

  if (/click|submit/i.test(code)) {
    steps.push("User interactions (click/submit actions)");
  }

  if (/sendKeys|type/i.test(code)) {
    steps.push("User input (typing into fields)");
  }

  if (/get|navigate|url/i.test(code)) {
    steps.push("Navigation (page load / URL visit)");
  }

  if (/assert|verify/i.test(code)) {
    steps.push("Validation (assertions / expected results)");
  }

  return steps;
}