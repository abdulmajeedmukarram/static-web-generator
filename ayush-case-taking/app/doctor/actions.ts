"use server";

import { revalidatePath } from "next/cache";
import { getCurrentDoctor } from "@/lib/session";
import { createAdminSupabase } from "@/lib/supabase-admin";

export async function claimOrphanPatients() {
  const doctor = await getCurrentDoctor();
  if (!doctor) return { ok: false };
  const admin = createAdminSupabase();
  const { data: docs } = await admin.from("doctors").select("id");
  const ids = (docs || []).map((d) => d.id);
  let query = admin.from("patients").update({ created_by: doctor.id });
  if (ids.length > 0) query = query.not("created_by", "in", ids);
  const { error } = await query;
  if (error) return { ok: false };
  revalidatePath("/doctor");
  return { ok: true };
}

export async function saveTreatmentAction(args: {
  consultationId: string;
  patientId: string;
  complaint: string;
  notes: string;
  plan: string;
}) {
  const doctor = await getCurrentDoctor();
  if (!doctor) return { ok: false, error: "Not logged in." };
  const admin = createAdminSupabase();

  const { error: upErr } = await admin
    .from("consultations")
    .update({ doctor_notes: args.notes, treatment_plan: args.plan, is_reviewed: true })
    .eq("id", args.consultationId);
  if (upErr) return { ok: false, error: upErr.message };

  const entry = `[${new Date().toLocaleDateString()}] Complaint: ${args.complaint}. Treatment: ${args.plan}. Notes: ${args.notes}`;
  const { data: pat } = await admin.from("patients").select("past_history").eq("id", args.patientId).single();
  const updated = pat?.past_history ? `${pat.past_history}\n${entry}` : entry;
  await admin.from("patients").update({ past_history: updated }).eq("id", args.patientId);

  revalidatePath("/doctor");
  return { ok: true };
}
