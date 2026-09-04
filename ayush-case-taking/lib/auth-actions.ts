"use server";

import { createHash } from "node:crypto";
import { redirect } from "next/navigation";
import { createAdminSupabase } from "@/lib/supabase-admin";
import { issueSession, destroySession } from "@/lib/session";

function hashPassword(password: string) {
  return createHash("sha256").update("mk:" + password).digest("hex");
}

export async function demoLogin() {
  const admin = createAdminSupabase();
  const { data: found } = await admin.from("doctors").select("*").eq("email", "demo@medikiosk.app").single();
  let doctor = found;
  if (!doctor) {
    const { data: created, error: createErr } = await admin
      .from("doctors")
      .insert({ email: "demo@medikiosk.app", name: "Demo Doctor", pass_hash: hashPassword("demo1234") })
      .select()
      .single();
    if (createErr) throw new Error("Demo setup failed: " + createErr.message);
    doctor = created;
  }
  if (!doctor) throw new Error("Demo doctor missing.");
  await issueSession(doctor.id);
  redirect("/doctor");
}

export async function loginDoctor(_prev: unknown, formData: FormData) {
  const email = ((formData.get("email") as string) || "").trim().toLowerCase();
  const password = (formData.get("password") as string) || "";
  const admin = createAdminSupabase();
  const { data: doctor } = await admin.from("doctors").select("*").eq("email", email).single();
  if (!doctor || !doctor.pass_hash || doctor.pass_hash !== hashPassword(password)) {
    return { error: "Wrong email or password. New here? Use Create account." };
  }
  await issueSession(doctor.id);
  redirect("/doctor");
}

export async function signupDoctor(_prev: unknown, formData: FormData) {
  const email = ((formData.get("email") as string) || "").trim().toLowerCase();
  const password = (formData.get("password") as string) || "";
  const confirm = (formData.get("confirm") as string) || "";
  if (!email.includes("@")) return { error: "Enter a valid email." };
  if (password.length < 6) return { error: "Password must be at least 6 characters." };
  if (password !== confirm) return { error: "Passwords do not match." };
  const admin = createAdminSupabase();
  const { error } = await admin
    .from("doctors")
    .insert({ email, name: email.split("@")[0], pass_hash: hashPassword(password) });
  if (error) return { error: "This email is already registered — use Sign in." };
  const { data: doctor } = await admin.from("doctors").select("*").eq("email", email).single();
  if (!doctor) return { error: "Could not create the account." };
  await issueSession(doctor.id);
  redirect("/doctor");
}

export async function logoutDoctor() {
  await destroySession();
  redirect("/");
}
