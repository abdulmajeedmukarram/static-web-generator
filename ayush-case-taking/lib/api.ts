import type { SupabaseClient } from "@supabase/supabase-js";
import { createAdminSupabase } from "./supabase-admin";
import type { Patient, Consultation, AiAnalysis } from "@/types/database";

async function withRetry<T>(fn: () => Promise<T>, retries = 3, delayMs = 1000): Promise<T> {
  try {
    return await fn();
  } catch (error: any) {
    const isNetworkError =
      error.name === "AbortError" ||
      error.message?.includes("Failed to fetch") ||
      error.message?.includes("NetworkError") ||
      error.message?.includes("timeout");
    if (retries > 0 && isNetworkError) {
      await new Promise((res) => setTimeout(res, delayMs));
      return withRetry(fn, retries - 1, delayMs * 2);
    }
    throw error;
  }
}

export async function getPatients(doctorId: string): Promise<Patient[]> {
  const sb = createAdminSupabase();
  try {
    return await withRetry(async () => {
      const { data, error } = await sb.from("patients").select("*").eq("created_by", doctorId).order("created_at", { ascending: false });
      if (error) throw error;
      return data || [];
    });
  } catch (error) {
    console.error("[API] Failed to fetch patients:", error);
    return [];
  }
}

export async function createConsultation(patientId: string, transcript: string, aiAnalysis: AiAnalysis, client?: SupabaseClient): Promise<Consultation | null> {
  const sb = client ?? createAdminSupabase();
  try {
    return await withRetry(async () => {
      const { data, error } = await sb.from("consultations").insert({ patient_id: patientId, raw_transcript: transcript, ai_analysis: aiAnalysis, is_reviewed: false }).select().single();
      if (error) throw error;
      return data;
    });
  } catch (error) {
    console.error("[API] Failed to create consultation:", error);
    return null;
  }
}

export type ConsultationWithPatient = Consultation & { patient: Patient };

export async function getConsultationsForDoctor(doctorId: string): Promise<ConsultationWithPatient[]> {
  const sb = createAdminSupabase();
  try {
    return await withRetry(async () => {
      const { data, error } = await sb
        .from("consultations")
        .select(`*, patient:patients ( id, created_by, name, age, gender, contact, past_history, patient_code, created_at )`)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return ((data || []) as any[]).filter((c) => c.patient !== null && c.patient.created_by === doctorId) as ConsultationWithPatient[];
    });
  } catch (error) {
    console.error("[API] Failed to fetch consultations:", error);
    return [];
  }
}
