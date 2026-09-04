import Link from "next/link";
import { Leaf, Mic } from "lucide-react";
import { createAdminSupabase } from "@/lib/supabase-admin";
import type { Patient } from "@/types/database";

export default async function PatientHomePage({ searchParams }: { searchParams: { code?: string } }) {
  const code = (searchParams.code || "").trim().toUpperCase();
  const admin = createAdminSupabase();

  let patient: Patient | null = null;
  if (code) {
    const { data } = await admin.from("patients").select("*").eq("patient_code", code).single();
    patient = (data as Patient) ?? null;
  }

  if (!patient) {
    return (
      <main className="flex min-h-dvh w-full flex-col items-center justify-center bg-[#FAF6EE] px-6 py-10">
        <form method="GET" action="/patient" className="flex w-full max-w-sm flex-col items-center gap-6 rounded-3xl border border-[#E4DCC8] bg-[#FFFDF9] p-8 shadow-sm">
          <p className="text-2xl font-semibold text-[#2B2620]">Patient Area</p>
          <p className="text-lg text-[#6E6555]">Enter the code you received after a visit, or that the doctor gave you.</p>
          <input name="code" required placeholder="e.g. MK-A1B2" className="w-full rounded-2xl border border-[#E4DCC8] bg-white p-4 text-center text-2xl font-bold uppercase tracking-widest text-[#2B2620] focus:outline focus:outline-4 focus:outline-[#2F5233]" />
          <button type="submit" className="w-full rounded-2xl bg-[#2F5233] py-4 text-xl font-semibold text-white shadow-md active:bg-[#25401F]">Open my record</button>
          {code && <p className="text-base text-[#8f1e18]">No record found for {code}. Check the code with the doctor.</p>}
        </form>
      </main>
    );
  }

  const { data: rows } = await admin.from("consultations").select("*").eq("patient_id", patient.id).order("created_at", { ascending: false });
  const latest = (rows || [])[0] as any;
  const ai = (latest?.ai_analysis ?? {}) as any;

  return (
    <main className="flex min-h-dvh w-full flex-col items-center justify-center bg-[#FAF6EE] px-6 py-10">
      <div className="flex w-full max-w-sm flex-col items-center gap-6 text-center">
        <p className="text-2xl font-semibold text-[#2B2620]">Namaste, {patient.name}</p>
        <p className="rounded-2xl border-2 border-dashed border-[#2F5233] bg-white px-6 py-2 font-mono text-xl font-bold tracking-widest text-[#2F5233]">{patient.patient_code}</p>
        {latest ? (
          <div className="w-full rounded-3xl border border-[#E4DCC8] bg-[#FFFDF9] p-5 text-left">
            <p className="text-sm uppercase tracking-wide text-[#6E6555]">Latest visit summary</p>
            <p className="mt-1 text-lg text-[#2B2620]">{ai.summary || ai.chief_complaint || "Summary coming soon."}</p>
            {(ai.ayush_recommendations ?? []).length > 0 && (
              <div className="mt-3 rounded-2xl border border-dashed border-emerald-700/50 bg-emerald-50 p-3">
                <p className="mb-1 flex items-center gap-1 text-sm font-semibold text-emerald-800"><Leaf className="h-4 w-4" /> AYUSH advice</p>
                <ul className="list-disc pl-5 text-sm text-emerald-900">{(ai.ayush_recommendations as string[]).map((r, i) => <li key={i}>{r}</li>)}</ul>
              </div>
            )}
          </div>
        ) : (
          <p className="text-lg text-[#6E6555]">No visits yet. Start your first voice intake below.</p>
        )}
        <Link href={`/patient/${patient.id}`} className="flex w-full items-center justify-center gap-3 rounded-2xl bg-[#2F5233] py-5 text-xl font-semibold text-white shadow-md active:bg-[#25401F]">
          <Mic className="h-6 w-6" />
          Start voice intake
        </Link>
      </div>
    </main>
  );
}
