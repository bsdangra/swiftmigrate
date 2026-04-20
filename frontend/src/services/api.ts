import axios from "axios";

const API_BASE = "http://localhost:3000";

// 🔥 Main API: Convert + Run + Self-Heal
export const convertRun = async ({ test, mappedPOMs}: { test: string; mappedPOMs: any[];}) => {
  const res = await axios.post(`${API_BASE}/convert-run`, {
    test,
    mappedPOMs,
  });

  return res.data as {
    success: boolean;
    playwrightCode: string;
    logs?: string;
    error?: string;
    attempts: number;
    healed: boolean;
    explanation?: string;
  };
};