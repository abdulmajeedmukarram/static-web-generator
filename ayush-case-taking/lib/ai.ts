import { GoogleGenerativeAI } from "@google/generative-ai";

export const MODEL_NAME = process.env.GEMINI_MODEL || "gemini-2.5-flash";

// Quality-first (analysis): best reasoning models first.
const QUALITY_LIST = [
  process.env.GEMINI_MODEL,
  "gemini-2.5-flash",
  "gemini-3.5-flash",
  "gemini-3.6-flash",
  "gemini-3.8-flash",
  "gemini-flash-latest",
].filter((m): m is string => !!m);

// Generous-first (transcription): lite models have the biggest free quotas.
const GENEROUS_LIST = [
  "gemini-2.5-flash-lite",
  "gemini-3.1-flash-lite",
  "gemini-3.5-flash-lite",
  "gemini-flash-lite-latest",
  "gemini-2.5-flash",
  "gemini-3.5-flash",
  "gemini-3.6-flash",
].filter((m): m is string => !!m);

function keys(): string[] {
  return [
    process.env.GEMINI_API_KEY,
    process.env.GEMINI_API_KEY_2,
    process.env.GEMINI_API_KEY_3,
  ].filter((k): k is string => !!k);
}

export async function withAI<T>(
  fn: (g: GoogleGenerativeAI, modelName: string) => Promise<T>,
  prefer: "quality" | "generous" = "quality"
): Promise<T> {
  const ks = keys();
  if (ks.length === 0) throw new Error("No GEMINI_API_KEY configured.");
  const list = prefer === "generous" ? GENEROUS_LIST : QUALITY_LIST;
  let lastErr: unknown = null;
  for (const k of ks) {
    for (const m of list) {
      try {
        return await fn(new GoogleGenerativeAI(k), m);
      } catch (e: any) {
        lastErr = e;
        const msg = String(e?.message ?? e);
        const retryable =
          msg.includes("429") || msg.includes("404") ||
          msg.toLowerCase().includes("quota") || msg.toLowerCase().includes("not found");
        if (retryable) continue;
        throw e;
      }
    }
  }
  throw lastErr;
}
