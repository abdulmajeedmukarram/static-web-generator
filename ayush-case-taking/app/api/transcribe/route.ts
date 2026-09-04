import { NextResponse } from "next/server";
import { withAI } from "@/lib/ai";

export async function POST(req: Request) {
  let body: { audioBase64?: string; mimeType?: string; lang?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const { audioBase64, mimeType, lang } = body;
  if (!audioBase64) return NextResponse.json({ error: "Missing audio" }, { status: 400 });

  try {
    const out = await withAI(async (genAI, modelName) => {
      const model = genAI.getGenerativeModel({ model: modelName });
      const result = await model.generateContent([
        {
          text:
            `Transcribe this patient audio exactly as spoken (language: ${lang || "en-IN"}). ` +
            `Return ONLY the transcription text — no commentary, no quotes.`,
        },
        { inlineData: { data: audioBase64, mimeType: mimeType || "audio/webm" } },
      ]);
      return result.response.text().trim();
    }, "generous");
    return NextResponse.json({ transcript: out });
  } catch (error: any) {
    console.error("[API Transcribe] Fatal error:", error?.message || error);
    return NextResponse.json({ error: "Transcription failed" }, { status: 500 });
  }
}
