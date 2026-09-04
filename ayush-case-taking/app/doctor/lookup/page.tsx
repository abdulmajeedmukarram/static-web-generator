import { redirect } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, AlertTriangle, Leaf, History, BrainCircuit } from "lucide-react";
import { getCurrentUser } from "@/lib/session";
import { createAdminSupabase } from "@/lib/supabase-admin";
import type { Consultation, Patient } from "@/types/database";

export default async function LookupPage({ searchParams }: { searchParams: { code?: string } }) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const code = (searchParams.code || "").trim().toUpperCase();
  if (!code) redirect("/doctor");

  const admin = createAdminSupabase();
  const { data: patient } = await admin.from("patients").select("*").eq("patient_code", code).single();

  if (!patient || (patient as any as Patient).created_by !== user.id) {
    return (
      <main className="min-h-screen bg-stone-950 p-6 text-stone-100">
        <Link href="/doctor" className="mb-6 flex items-center gap-2 text-sm text-stone-400 hover:text-stone-100">
          <ArrowLeft className="h-4 w-4" /> Back to Queue
        </Link>
        <p className="text-lg text-stone-300">
          No patient with code <span className="font-bold text-stone-100">{code}</span> exists under your account.
        </p>
      </main>
    );
  }

  const p = patient as any as Patient;
  const { data: rows } = await admin.from("consultations").select("*").eq("patient_id", p.id).order("created_at", { ascending: false });
  const consultations = (rows || []) as Consultation[];
  const latest = consultations[0];
  const ai = (latest?.ai_analysis ?? {}) as any;
  const pastVisits = consultations.slice(1);

  return (
    <main className="min-h-screen bg-stone-950 p-6 text-stone-100">
      <Link href="/doctor" className="mb-6 flex items-center gap-2 text-sm text-stone-400 hover:text-stone-100">
        <ArrowLeft className="h-4 w-4" /> Back to Queue
      </Link>

      <div className="mb-6 flex flex-wrap items-baseline gap-4">
        <h1 className="text-2xl font-bold">{p.name}</h1>
        <p className="text-stone-400">{p.age ?? "—"}{p.gender ? ` · ${p.gender}` : ""}</p>
        <p className="rounded bg-stone-800 px-2 py-0.5 font-mono text-sm text-emerald-400">{p.patient_code}</p>
      </div>

      {!latest ? (
        <p className="text-stone-400">This patient has not completed a voice intake yet. No AI analysis exists.</p>
      ) : (
        <>
          {ai.red_flags?.length > 0 && (
            <div className="mb-6 rounded-lg border border-red-900/50 bg-red-950/30 p-4">
              <h2 className="mb-2 flex items-center gap-2 font-semibold text-red-400">
                <AlertTriangle className="h-5 w-5" /> AI Urgency Decision
              </h2>
              <ul className="list-disc pl-5 text-red-200">
                {ai.red_flags.map((f: string, i: number) => <li key={i}>{f}</li>)}
              </ul>
            </div>
          )}

          <div className="mb-6 rounded-lg border border-stone-800 bg-stone-900 p-4">
            <h2 className="mb-3 flex items-center gap-2 font-semibold text-stone-100">
              <BrainCircuit className="h-5 w-5 text-emerald-400" /> AI Decision & Prediction (draft — verify)
            </h2>
            <p className="mb-1 text-stone-300"><span className="font-semibold">Chief complaint:</span> {ai.chief_complaint || "—"}</p>
            <p className="mb-4 text-stone-400">{ai.summary}</p>
            
            {ai.clinical_notes_for_doctor && (
              <p className="mb-4 rounded border border-emerald-800/60 bg-emerald-950/20 p-3 text-sm text-emerald-200">
                {ai.clinical_notes_for_doctor}
              </p>
            )}

            {(ai.differential_diagnoses ?? []).length > 0 && (
              <div className="space-y-3">
                {ai.differential_diagnoses.map((dd: any, i: number) => {
                  const conf = Math.round((dd.confidence ?? 0) * 100);
                  return (
                    <div key={i}>
                      <div className="flex items-center justify-between text-sm">
                        <span className="font-medium text-stone-200">{dd.condition}</span>
                        <span className="text-stone-400">{conf}%</span>
                      </div>
                      <div className="mt-1 h-2 w-full rounded-full bg-stone-800">
                        <div className={`h-2 rounded-full ${conf >= 70 ? "bg-emerald-500" : conf >= 40 ? "bg-amber-500" : "bg-stone-500"}`} style={{ width: `${conf}%` }} />
                      </div>
                      {dd.rationale && <p className="mt-1 text-xs text-stone-500">{dd.rationale}</p>}
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {((ai.ayush_recommendations ?? []).length > 0 || ai.dashavidha_pariksha) && (
            <div className="mb-6 rounded-lg border border-dashed border-emerald-800/60 bg-emerald-950/10 p-4">
              <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold uppercase tracking-wider text-emerald-500/80">
                <Leaf className="h-4 w-4" /> AYUSH Context
              </h2>
              {ai.dashavidha_pariksha && (
                <div className="mb-3 grid grid-cols-2 gap-2 text-sm text-emerald-200/80">
                  {Object.entries(ai.dashavidha_pariksha as Record<string, string>).map(([k, v]) =>
                    v ? <p key={k}><span className="font-semibold capitalize text-emerald-400">{k.replace(/_/g, " ")}:</span> {v}</p> : null
                  )}
                </div>
              )}
              <ul className="space-y-1 text-sm text-emerald-200/80">
                {(ai.ayush_recommendations ?? []).map((r: string, i: number) => <li key={i}>• {r}</li>)}
              </ul>
            </div>
          )}
        </>
      )}

      <div className="rounded-lg border border-stone-800 bg-stone-900 p-4">
        <h2 className="mb-3 flex items-center gap-2 font-semibold text-stone-200">
          <History className="h-5 w-5" /> Past History
        </h2>
        {p.past_history ? (
          <p className="mb-4 whitespace-pre-wrap text-sm text-stone-400">{p.past_history}</p>
        ) : (
          <p className="mb-4 text-sm text-stone-500">No recorded past history.</p>
        )}
        {pastVisits.length > 0 && (
          <div className="space-y-3">
            {pastVisits.map((v) => {
              const vai = v.ai_analysis as any;
              return (
                <div key={v.id} className="rounded border border-stone-800 bg-stone-950 p-3 text-sm">
                  <p className="mb-1 text-xs text-stone-500">
                    {new Date(v.created_at).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" })}
                  </p>
                  <p className="text-stone-300"><span className="font-semibold">Suffered:</span> {vai?.chief_complaint || vai?.summary || "—"}</p>
                  {v.treatment_plan && <p className="text-stone-400"><span className="font-semibold">Treatment:</span> {v.treatment_plan}</p>}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </main>
  );
}
