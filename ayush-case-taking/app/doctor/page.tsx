import { redirect } from "next/navigation";
import Link from "next/link";
import { AlertTriangle, CheckCircle2, Clock } from "lucide-react";
import { getConsultationsForDoctor, type ConsultationWithPatient } from "@/lib/api";
import { getCurrentUser } from "@/lib/session";
import LogoutButton from "@/components/LogoutButton";
import RegisterPatientForm from "@/components/RegisterPatientForm";
import ClaimPatientsButton from "@/components/ClaimPatientsButton";
import CodeLookup from "@/components/CodeLookup";


function sortByTriage(list: ConsultationWithPatient[]) {
  return [...list].sort((a, b) => {
    const aFlags = a.ai_analysis.red_flags?.length ?? 0;
    const bFlags = b.ai_analysis.red_flags?.length ?? 0;
    if (aFlags > 0 && bFlags === 0) return -1;
    if (bFlags > 0 && aFlags === 0) return 1;
    return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
  });
}

function formatWait(createdAt: string) {
  const minutes = Math.max(0, Math.round((Date.now() - new Date(createdAt).getTime()) / 60000));
  if (minutes < 60) return `${minutes}m`;
  return `${Math.floor(minutes / 60)}h ${minutes % 60}m`;
}

export default async function DoctorDashboardPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const consultations = await getConsultationsForDoctor(user.id);
  const sorted = sortByTriage(consultations);
  const urgentCount = sorted.filter((c) => (c.ai_analysis.red_flags?.length ?? 0) > 0).length;

  return (
    <main className="min-h-screen bg-stone-950 text-stone-100">
      <header className="sticky top-0 z-10 flex items-center justify-between border-b border-stone-800 bg-stone-950/95 px-6 py-3 backdrop-blur">
        <div className="flex items-baseline gap-4">
          <h1 className="text-sm font-semibold uppercase tracking-wide text-stone-400">Today's Queue</h1>
          <p className="text-xs text-stone-500">
            {urgentCount > 0 && <span className="mr-3 font-semibold text-red-400">{urgentCount} urgent</span>}
            {sorted.length} patients
          </p>
        </div>
        <div className="flex items-center gap-4">
          <span className="hidden text-xs text-stone-500 sm:block">{user.email}</span>
          <CodeLookup />
          <RegisterPatientForm doctorId={user.id} />
          <LogoutButton />
        </div>
      </header>

      <div className="px-6 py-4">
        <CodeLookup />
          <RegisterPatientForm doctorId={user.id} />
      </div>

      {sorted.length === 0 ? (
        <div className="px-6 py-10"><p className="text-sm text-stone-500">No patients in the queue right now.</p><div className="mt-4"><ClaimPatientsButton /></div></div>
      ) : (
        <ul className="divide-y divide-stone-800">
          {sorted.map((c) => {
            const flags = c.ai_analysis.red_flags ?? [];
            const hasFlags = flags.length > 0;
            return (
              <li key={c.id}>
                <Link
                  href={`/doctor/consultation/${c.id}`}
                  className={`grid grid-cols-[1fr_auto] items-center gap-4 border-l-4 px-6 py-4 text-sm transition-colors md:grid-cols-[170px_1fr_auto_70px_90px] ${
                    hasFlags
                      ? "border-red-600 bg-red-950/30 hover:bg-red-950/50"
                      : "border-transparent hover:bg-stone-900/60"
                  }`}
                >
                  <div className="min-w-0">
                    <p className="truncate font-medium text-stone-100">{c.patient.name}</p>
                    <p className="text-xs text-stone-500">
                      {c.patient.age ?? "—"}
                      {c.patient.gender ? ` · ${c.patient.gender}` : ""}
                    </p>
                  </div>

                  <p className="hidden truncate text-stone-300 md:block">
                    {c.ai_analysis.chief_complaint ?? c.ai_analysis.summary ?? "No summary yet"}
                  </p>

                  <div className="flex flex-wrap justify-end gap-1">
                    {flags.map((flag, i) => (
                      <span
                        key={i}
                        className="inline-flex items-center gap-1 whitespace-nowrap rounded-md bg-red-600 px-2 py-0.5 text-xs font-semibold text-white motion-safe:animate-pulse [animation-duration:0.7s]"
                      >
                        <AlertTriangle className="h-3 w-3 shrink-0" />
                        {flag}
                      </span>
                    ))}
                  </div>

                  <div className="hidden items-center gap-1 text-xs text-stone-500 md:flex">
                    <Clock className="h-3.5 w-3.5" />
                    {formatWait(c.created_at)} · {new Date(c.created_at).toLocaleString("en-IN", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" })}
                  </div>

                  <div className="flex justify-end">
                    {c.is_reviewed ? (
                      <span className="inline-flex items-center gap-1 text-xs text-emerald-400">
                        <CheckCircle2 className="h-3.5 w-3.5" />
                        Done
                      </span>
                    ) : (
                      <span className="text-xs text-stone-500">Waiting</span>
                    )}
                  </div>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </main>
  );
}
