import { NextResponse } from "next/server";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { createAdminSupabase } from "@/lib/supabase-admin";
import type { MedicalDocument } from "@/types/database";

const MODEL_NAME = process.env.GEMINI_MODEL || "gemini-3.6-flash";
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);

const DOC_SCHEMA = {
  type: "object",
  properties: {
    doc_type: { type: "string" },
    medications: { type: "array", items: { type: "string" } },
    diagnoses: { type: "array", items: { type: "string" } },
    lab_values: { type: "array", items: { type: "string" } },
    notes: { type: "string" },
  },
};

export async function POST(req: Request) {
  let body: { patientId?: string; fileBase64?: string; mimeType?: string; fileName?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const { patientId, fileBase64, mimeType, fileName } = body;
  if (!patientId || !fileBase64) {
    return NextResponse.json({ error: "Missing patientId or file data" }, { status: 400 });
  }

  try {
    const model = genAI.getGenerativeModel({ model: MODEL_NAME });
    const result = await model.generateContent({
      contents: [
        {
          role: "user",
          parts: [
            {
              text:
                "Extract structured medical information from this document (prescription, lab report or discharge summary). " +
                "Return JSON only. If illegible, say so in notes.",
            },
            { inlineData: { data: fileBase64, mimeType: mimeType || "image/jpeg" } },
          ],
        },
      ],
      generationConfig: {
        responseMimeType: "application/json",
        responseSchema: DOC_SCHEMA as any,
      },
    });

    const extracted = JSON.parse(result.response.text());

    const admin = createAdminSupabase();
    const { data: patient } = await admin
      .from("patients")
      .select("medical_documents")
      .eq("id", patientId)
      .single();

    const doc: MedicalDocument = {
      file_name: fileName || "document",
      doc_type: extracted.doc_type || "other",
      extracted,
      uploaded_at: new Date().toISOString(),
    };

    const docs = [...((patient?.medical_documents as MedicalDocument[]) ?? []), doc];
    const { error: dbError } = await admin
      .from("patients")
      .update({ medical_documents: docs })
      .eq("id", patientId);

    if (dbError) {
      console.error("[API Extract] DB error:", dbError);
      return NextResponse.json({ error: "Failed to save document" }, { status: 500 });
    }

    return NextResponse.json({ ok: true, extracted });
  } catch (error) {
    console.error("[API Extract] Fatal error:", error);
    return NextResponse.json({ error: "Extraction failed" }, { status: 500 });
  }
}
