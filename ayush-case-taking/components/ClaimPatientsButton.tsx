"use client";

import { useTransition } from "react";
import { UserRoundPlus } from "lucide-react";
import { claimOrphanPatients } from "@/app/doctor/actions";

export default function ClaimPatientsButton() {
  const [pending, startTransition] = useTransition();

  return (
    <button
      type="button"
      disabled={pending}
      onClick={() => startTransition(async () => { await claimOrphanPatients(); })}
      className="flex items-center gap-2 rounded-md bg-emerald-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-emerald-500 disabled:opacity-40"
    >
      <UserRoundPlus className="h-4 w-4" />
      {pending ? "Claiming…" : "Claim unassigned demo patients"}
    </button>
  );
}
