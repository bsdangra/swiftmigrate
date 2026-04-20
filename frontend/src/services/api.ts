import axios from "axios";

const API_BASE = "http://localhost:3000";

export type PreprocessIssueDto = {
  type: string;
  message: string;
  severity: string;
  suggestion: string;
};

export type ConvertRunResponse = {
  success: boolean;
  playwrightCode: string;
  logs?: string;
  error?: string;
  attempts: number;
  healed: boolean;
  explanation?: string;
  preprocessIssues?: PreprocessIssueDto[];
  qualityScore?: number;
  intentCategories?: string[];
};

export type UploadAnalyzeResponse = {
  tests: Array<{ content: string; mappedPOMs?: unknown }>;
  sources?: Array<{
    name: string;
    relativePath: string;
    content: string;
  }>;
  error?: string;
};

// 🔥 Main API: Convert + Run + Self-Heal
export const convertRun = async (
  code: string,
  options?: { mappedPOMs?: unknown }
) => {
  const res = await axios.post(`${API_BASE}/convert-run`, {
    code,
    mappedPOMs: options?.mappedPOMs,
export const convertRun = async ({ test, mappedPOMs}: { test: string; mappedPOMs: any[];}) => {
  const res = await axios.post(`${API_BASE}/convert-run`, {
    test,
    mappedPOMs,
  });

  return res.data as ConvertRunResponse;
};
