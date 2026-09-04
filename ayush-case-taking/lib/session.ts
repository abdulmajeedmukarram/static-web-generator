import { cookies } from "next/headers";
import { randomBytes } from "node:crypto";
import { createAdminSupabase } from "@/lib/supabase-admin";
import type { Doctor } from "@/types/database";

export async function getCurrentDoctor(): Promise<Doctor | null> {
  const token = cookies().get("mk_token")?.value;
  if (!token) return null;
  const admin = createAdminSupabase();
  const { data: session } = await admin.from("sessions").select("doctor_id, expires_at").eq("token", token).single();
  if (!session) return null;
  if (new Date(session.expires_at).getTime() < Date.now()) return null;
  const { data: doctor } = await admin.from("doctors").select("*").eq("id", session.doctor_id).single();
  return (doctor as Doctor) ?? null;
}

export async function getCurrentUser(): Promise<{ id: string; email: string } | null> {
  const d = await getCurrentDoctor();
  return d ? { id: d.id, email: d.email } : null;
}

export async function issueSession(doctorId: string) {
  const token = randomBytes(24).toString("hex");
  const admin = createAdminSupabase();
  await admin.from("sessions").insert({ token, doctor_id: doctorId });
  cookies().set("mk_token", token, { httpOnly: true, sameSite: "lax", path: "/", maxAge: 60 * 60 * 24 * 7 });
}

export async function destroySession() {
  const token = cookies().get("mk_token")?.value;
  if (token) {
    const admin = createAdminSupabase();
    await admin.from("sessions").delete().eq("token", token);
  }
  cookies().set("mk_token", "", { httpOnly: true, path: "/", maxAge: 0 });
}
