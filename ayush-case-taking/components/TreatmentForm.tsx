"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Save } from "lucide-react";
import { saveTreatmentAction } from "@/app/doctor/actions";

export default function TreatmentForm(props: {
  consultationId: string;
  patientId: string;
  complaint: string;
  notes: string;
  plan: string;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [notes, setNotes] = useState(props.notes);
  const [plan, setPlan] = useState(props.plan);

  function submit() {
    setError(null);
    startTransition(async () => {
      const res = await saveTreatmentAction({
        consultationId: props.consultationId,
        patientId: props.patientId,
        complaint: props.complaint,
        notes,
        plan,
      });
      if (res.ok) {
        router.push("/doctor");
        router.refresh();
      } else {
        setError(res.error || "Save failed. Try again.");
      }
    });
  }

  return (
    <div className="mt-8 rounded-lg border border-stone-800 bg-stone-900 p-4">
      <h2 className="mb-4 text-lg font-semibold">Finalize Treatment Plan</h2>
      <label className="mb-2 block text-sm text-stone-400">Doctor's Clinical Notes</label>
      <textarea value={notes} onChange={(e) => setNotes(e.target.value)} className="mb-4 w-full rounded bg-stone-950 p-3 text-stone-100 focus:outline-none" rows={3} />
      <label className="mb-2 block text-sm text-stone-400">Prescription / Treatment Plan</label>
      <textarea value={plan} onChange={(e) => setPlan(e.target.value)} className="mb-4 w-full rounded bg-stone-950 p-3 text-stone-100 focus:outline-none" rows={3} />
      {error && <p className="mb-3 text-sm text-red-400">{error}</p>}
      <button type="button" onClick={submit} disabled={pending} className="flex w-full items-center justify-center gap-2 rounded bg-emerald-600 py-3 font-semibold text-white hover:bg-emerald-500 disabled:opacity-40">
        <Save className="h-5 w-5" />
        {pending ? "Saving…" : "Mark Reviewed & Save to History"}
      </button>
    </div>
  );
}
