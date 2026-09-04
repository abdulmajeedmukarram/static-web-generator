"use client";

import { useState, type FormEvent } from "react";
import { UserPlus, Copy, Check, X } from "lucide-react";
import { createBrowserSupabase } from "@/lib/supabase-client";

export default function RegisterPatientForm({ doctorId }: { doctorId: string }) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [age, setAge] = useState("");
  const [gender, setGender] = useState("");
  const [contact, setContact] = useState("");
  const [pastHistory, setPastHistory] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [newPatient, setNewPatient] = useState<{ id: string; code: string } | null>(null);
  const [copied, setCopied] = useState(false);

  async function handleCreate(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const supabase = createBrowserSupabase();
    const { data, error: dbError } = await supabase
      .from("patients")
      .insert({ name, age: age ? Number(age) : null, gender: gender || null, contact: contact || null, past_history: pastHistory, created_by: doctorId })
      .select()
      .single();
    if (dbError || !data) { setError("Could not register the patient."); setBusy(false); return; }
    setNewPatient({ id: data.id, code: data.patient_code || "" });
    setBusy(false);
    setName(""); setAge(""); setGender(""); setContact(""); setPastHistory("");
  }

  async function copyLink() {
    if (!newPatient) return;
    await navigator.clipboard.writeText(`${window.location.origin}/patient/${newPatient.id}`);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  if (!open) {
    return (
      <button type="button" onClick={() => setOpen(true)} className="flex items-center gap-2 rounded-md bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-emerald-500">
        <UserPlus className="h-4 w-4" />
        Register Patient
      </button>
    );
  }

  return (
    <form onSubmit={handleCreate} className="rounded-lg border border-stone-800 bg-stone-900 p-4">
      <div className="mb-3 flex items-center justify-between">
        <p className="text-sm font-semibold text-stone-100">Register Patient</p>
        <button type="button" onClick={() => setOpen(false)} className="text-stone-500 hover:text-stone-200"><X className="h-4 w-4" /></button>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <input required value={name} onChange={(e) => setName(e.target.value)} placeholder="Full name" className="col-span-2 rounded-md border border-stone-700 bg-stone-950 px-3 py-2 text-sm text-stone-100 focus:border-emerald-500 focus:outline-none" />
        <input value={age} onChange={(e) => setAge(e.target.value)} placeholder="Age" type="number" min={0} max={130} className="rounded-md border border-stone-700 bg-stone-950 px-3 py-2 text-sm text-stone-100 focus:border-emerald-500 focus:outline-none" />
        <input value={gender} onChange={(e) => setGender(e.target.value)} placeholder="Gender" className="rounded-md border border-stone-700 bg-stone-950 px-3 py-2 text-sm text-stone-100 focus:border-emerald-500 focus:outline-none" />
        <input value={contact} onChange={(e) => setContact(e.target.value)} placeholder="Phone / contact" className="col-span-2 rounded-md border border-stone-700 bg-stone-950 px-3 py-2 text-sm text-stone-100 focus:border-emerald-500 focus:outline-none" />
        <textarea value={pastHistory} onChange={(e) => setPastHistory(e.target.value)} placeholder="Past medical history (feeds AI context)" className="col-span-2 min-h-[4rem] rounded-md border border-stone-700 bg-stone-950 px-3 py-2 text-sm text-stone-100 focus:border-emerald-500 focus:outline-none" />
      </div>
      {error && <p className="mt-2 text-xs text-red-400">{error}</p>}
      <button type="submit" disabled={busy} className="mt-3 w-full rounded-md bg-emerald-600 py-2 text-sm font-semibold text-white disabled:opacity-40">
        {busy ? "Saving…" : "Save & get intake link"}
      </button>
      {newPatient && (
        <div className="mt-3 rounded-md border border-emerald-800 bg-emerald-950/30 p-3">
          <p className="text-xs text-emerald-300">Patient code: <span className="font-bold">{newPatient.code}</span> — tell it to the patient, or hand over this link:</p>
          <div className="mt-1 flex items-center gap-2">
            <code className="flex-1 truncate text-xs text-stone-300">{`/patient/${newPatient.id}`}</code>
            <button type="button" onClick={copyLink} className="flex items-center gap-1 rounded bg-emerald-700 px-2 py-1 text-xs text-white">
              {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
              {copied ? "Copied" : "Copy"}
            </button>
          </div>
        </div>
      )}
    </form>
  );
}
