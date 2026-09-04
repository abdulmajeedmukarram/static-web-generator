import { NextResponse } from "next/server";
import { withAI } from "@/lib/ai";
import { createAdminSupabase } from "@/lib/supabase-admin";
import {
  AI_ANALYSIS_RESPONSE_SCHEMA,
  CASE_TAKING_SYSTEM_PROMPT,
  FOLLOWUP_RESPONSE_SCHEMA,
  FOLLOWUP_SYSTEM_PROMPT,
} from "@/lib/case-taking-prompt";
import type { AiAnalysis } from "@/types/database";

const LANG_NAMES: Record<string, string> = {
  "en-IN": "English", "hi-IN": "Hindi", "te-IN": "Telugu", "ta-IN": "Tamil",
};

const FOLLOWUP_SCHEMA_EXT = {
  ...FOLLOWUP_RESPONSE_SCHEMA,
  properties: { ...FOLLOWUP_RESPONSE_SCHEMA.properties, confirmation: { type: "string" } },
};

const EXTENDED_SCHEMA = {
  ...AI_ANALYSIS_RESPONSE_SCHEMA,
  properties: {
    ...AI_ANALYSIS_RESPONSE_SCHEMA.properties,
    triage_priority: { type: "string" },
    dashavidha_pariksha: {
      type: "object",
      properties: {
        prakriti: { type: "string" }, vikriti: { type: "string" }, sara: { type: "string" },
        samhanana: { type: "string" }, pramana: { type: "string" }, satmya: { type: "string" },
        sattva: { type: "string" }, ahara_shakti: { type: "string" }, vyayama_shakti: { type: "string" }, vaya: { type: "string" },
      },
    },
  },
};

export async function POST(req: Request) {
  let body: { patientId?: string; raw_transcript?: string; lang?: string; stage?: string; ayush_mode?: boolean };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const { patientId, raw_transcript } = body;
  const lang = body.lang || "en-IN";
  const langName = LANG_NAMES[lang] ?? "English";
  const stage = body.stage === "followup" ? "followup" : "final";
  const ayushMode = body.ayush_mode === true;

  if (!patientId || !raw_transcript || typeof raw_transcript !== "string") {
    return NextResponse.json({ error: "Missing patientId or raw_transcript" }, { status: 400 });
  }

  const admin = createAdminSupabase();
  const { data: patient } = await admin.from("patients").select("past_history, medical_documents").eq("id", patientId).single();

  let historyContext = patient?.past_history ? `\n\nPATIENT PAST MEDICAL HISTORY: ${patient.past_history}` : "";
  const docs = (patient?.medical_documents as any[]) ?? [];
  if (docs.length > 0) historyContext += `\n\nEXTRACTED PRIOR DOCUMENTS: ${JSON.stringify(docs.map((d) => d.extracted))}`;

  try {
    if (stage === "followup") {
      const parsed = await withAI(async (genAI, modelName) => {
        const model = genAI.getGenerativeModel({ model: modelName, systemInstruction: FOLLOWUP_SYSTEM_PROMPT });
        const result = await model.generateContent({
          contents: [{ role: "user", parts: [{ text:
            `MANDATORY: write every question and the confirmation in ${langName}.\n` +
            `MULTI-ROUND RULES: you may be called several times with a growing conversation; read ALL of it each time.\n` +
            `- If key details are still missing, set sufficient false and ask up to 3 short simple questions.\n` +
            `- If complete, set sufficient true AND write "confirmation": a 2-4 sentence recap in simple ${langName}, ending with "Is this correct?".\n` +
            `- Chest pain with breathlessness, stroke signs, heavy bleeding or suicidal thoughts => sufficient true immediately.\n` +
            `Patient language code: ${lang}\nConversation so far:\n${raw_transcript}` + historyContext }] }],
          generationConfig: { responseMimeType: "application/json", responseSchema: FOLLOWUP_SCHEMA_EXT as any },
        });
        return JSON.parse(result.response.text());
      });
      return NextResponse.json(parsed);
    }

    const aiAnalysis = await withAI(async (genAI, modelName) => {
      const model = genAI.getGenerativeModel({ model: modelName, systemInstruction: CASE_TAKING_SYSTEM_PROMPT });
      const extraRules =
        `\n\nADDITIONAL REQUIRED FIELDS:\n` +
        `- triage_priority: "emergency" if red flags indicate immediate danger; "urgent" if any other red flag; otherwise "routine".\n` +
        (ayushMode ? `- Include dashavidha_pariksha inferred ONLY from what the transcript supports.` : `- Omit dashavidha_pariksha.`);
      const result = await model.generateContent({
        contents: [{ role: "user", parts: [{ text: raw_transcript + historyContext + extraRules }] }],
        generationConfig: { responseMimeType: "application/json", responseSchema: EXTENDED_SCHEMA as any },
      });
      return JSON.parse(result.response.text()) as AiAnalysis;
    });

    const { data: consultation, error: dbError } = await admin
      .from("consultations")
      .insert({ patient_id: patientId, raw_transcript: raw_transcript, ai_analysis: aiAnalysis, is_reviewed: false })
      .select().single();

    if (dbError || !consultation) {
      return NextResponse.json({ error: "Failed to save consultation" }, { status: 500 });
    }
    return NextResponse.json({ success: true, consultationId: consultation.id });
  } catch (error: any) {
    console.error("[API Analyze] Fatal error:", error?.message || error);
    return NextResponse.json({ error: "Failed to analyze consultation" }, { status: 500 });
  }
}
