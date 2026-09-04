import { CheckCircle2 } from "lucide-react";
import { createAdminSupabase } from "@/lib/supabase-admin";

export default async function SubmissionSuccessPage({ params }: { params: { patientId: string } }) {
  const admin = createAdminSupabase();
  const { data: patient } = await admin.from("patients").select("patient_code").eq("id", params.patientId).single();

  return (
    <main className="flex min-h-dvh w-full flex-col items-center justify-center bg-[#FAF6EE] px-6 py-10">
      <div className="flex w-full max-w-sm flex-col items-center gap-6 text-center">
        <CheckCircle2 className="h-20 w-20 text-[#2F5233]" strokeWidth={1.5} />
        <div className="space-y-3">
          <p className="text-3xl font-semibold text-[#2B2620]">Got it</p>
          <p className="text-xl leading-relaxed text-[#6E6555]">
            Please take a seat. The doctor has received your answers and will call you in shortly.
          </p>
        </div>
        {patient?.patient_code && (
          <div className="rounded-2xl border-2 border-dashed border-[#2F5233] bg-white px-8 py-4">
            <p className="text-sm text-[#6E6555]">Your patient code — tell it to the doctor:</p>
            <p className="text-4xl font-bold tracking-widest text-[#2F5233]">{patient.patient_code}</p>
          </div>
        )}
      </div>
    </main>
  );
}
