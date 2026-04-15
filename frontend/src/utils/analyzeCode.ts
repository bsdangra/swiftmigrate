import { RULES } from "../rules";

export type Issue = {
  id: string;
  label: string;
  severity: "low" | "medium" | "high";
  suggestion: string;
};

export type AnalysisResult = {
  issues: Issue[];
  score: number;
};

export function analyzeCode(code: string): AnalysisResult {
  const issues: Issue[] = [];

  RULES.forEach((rule) => {
    if (rule.test(code)) {
      issues.push({
        id: rule.id,
        label: rule.label,
        severity: rule.severity,
        suggestion: rule.suggestion
      });
    }
  });

  const score = Math.max(100 - issues.length * 20, 0);

  return { issues, score };
}