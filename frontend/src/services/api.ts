import axios from "axios";

const API_BASE = "http://localhost:3000";

// 🔥 Main API: Convert + Run + Self-Heal
export const convertRun = async (fileContent: string) => {
  const res = await axios.post(`${API_BASE}/convert-run`, {
    code: fileContent,
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