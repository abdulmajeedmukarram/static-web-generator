import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Leaf, AlertTriangle, History, BrainCircuit } from "lucide-react";
import { getCurrentUser } from "@/lib/session";
import { createAdminSupabase } from "@/lib/supabase-admin";
import type { Patient } from "@/types/database";
import TreatmentForm from "@/components/TreatmentForm";

export default async function ConsultationDetailPage({ params }: { params: { id: string } }) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const admin = createAdminSupabase();
  const { data: c } = await admin
    .from("consultations")
    .select("*, patient:patients(*)")
    .eq("id", params.id)
    .single();

  if (!c || (c.patient as any as Patient).created_by !== user.id) notFound();

  const patient = c.patient as any as Patient;
  const ai = c.ai_analysis as any;
  const dashavidha = ai.dashavidha_pariksha as Record<string, string> | undefined;
  const docs = (patient.medical_documents as any[]) || [];

  const { data: pastConsultations } = await admin
    .from("consultations")
    .select("id, created_at, ai_analysis, doctor_notes, treatment_plan")
    .eq("patient_id", patient.id)
    .neq("id", params.id)
    .order("created_at", { ascending: false })
    .limit(5);

  return (
    <main className="min-h-screen bg-stone-950 p-6 text-stone-100">
      <Link href="/doctor" className="mb-6 flex items-center gap-2 text-sm text-stone-400 hover:text-stone-100">
        <ArrowLeft className="h-4 w-4" /> Back to Queue
      </Link>

      <h1 className="mb-2 text-2xl font-bold">{patient.name}</h1>
      <p className="mb-6 text-stone-400">{ai.chief_complaint || ai.summary}</p>

      {ai.red_flags?.length > 0 && (
        <div className="mb-6 rounded-lg border border-red-900/50 bg-red-950/30 p-4">
          <h2 className="mb-2 flex items-center gap-2 font-semibold text-red-400">
            <AlertTriangle className="h-5 w-5" /> Red Flags
          </h2>
          <ul className="list-disc pl-5 text-red-200">
            {ai.red_flags.map((f: string, i: number) => <li key={i}>{f}</li>)}
          </ul>
        </div>
      )}

      <div className="mb-6 rounded-lg border border-stone-800 bg-stone-900 p-4">
        <h2 className="mb-3 flex items-center gap-2 font-semibold text-stone-100">
          <BrainCircuit className="h-5 w-5 text-emerald-400" /> AI Clinical Analysis
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

      {dashavidha && Object.keys(dashavidha).length > 0 && (
        <div className="mb-6 rounded-lg border border-dashed border-emerald-800/60 bg-emerald-950/10 p-4">
          <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold uppercase tracking-wider text-emerald-500/80">
            <Leaf className="h-4 w-4" /> Dashavidha Pariksha (AYUSH)
          </h2>
          <div className="grid grid-cols-2 gap-2 text-sm text-emerald-200/80">
            {Object.entries(dashavidha).map(([k, v]) =>
              v ? <p key={k}><span className="font-semibold capitalize text-emerald-400">{k.replace(/_/g, " ")}:</span> {v}</p> : null
            )}
          </div>
        </div>
      )}

      {docs.length > 0 && (
        <div className="mb-6 rounded-lg border border-stone-800 bg-stone-900 p-4">
          <h2 className="mb-2 font-semibold text-stone-200">Scanned Medical Documents</h2>
          <ul className="space-y-2 text-sm text-stone-400">
            {docs.map((d, i) => (
              <li key={i} className="rounded bg-stone-950 p-2">
                <span className="font-semibold text-stone-300">{d.file_name}:</span> {JSON.stringify(d.extracted)}
              </li>
            ))}
          </ul>
        </div>
      )}

      {pastConsultations && pastConsultations.length > 0 && (
        <div className="mb-6 rounded-lg border border-stone-800 bg-stone-900 p-4">
          <h2 className="mb-3 flex items-center gap-2 font-semibold text-stone-200">
            <History className="h-5 w-5" /> Past Consultations
          </h2>
          <div className="space-y-3">
            {pastConsultations.map((pc: any) => (
              <div key={pc.id} className="rounded border border-stone-800 bg-stone-950 p-3 text-sm">
                <p className="text-xs text-stone-500 mb-1">
                  {new Date(pc.created_at).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" })}
                </p>
                <p className="text-stone-300 mb-1"><span className="font-semibold">Suffered:</span> {pc.ai_analysis?.chief_complaint || pc.ai_analysis?.summary || "N/A"}</p>
                {pc.treatment_plan && <p className="text-stone-400"><span className="font-semibold">Treatment:</span> {pc.treatment_plan}</p>}
              </div>
            ))}
          </div>
        </div>
      )}

      <TreatmentForm
        consultationId={c.id}
        patientId={patient.id}
        complaint={ai.chief_complaint || ai.summary || "Visit"}
        notes={c.doctor_notes || ""}
        plan={c.treatment_plan || ""}
      />
    </main>
  );
}
