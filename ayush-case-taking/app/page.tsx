import Link from "next/link";
import { Stethoscope, UserRound } from "lucide-react";

export default function HomePage() {
  return (
    <main className="flex min-h-dvh w-full flex-col items-center justify-center bg-[#FAF6EE] px-6 py-10">
      <div className="flex w-full max-w-sm flex-col items-center gap-8 text-center">
        <h1 className="text-3xl font-bold text-[#2B2620]">MediKiosk</h1>
        <p className="text-lg text-[#6E6555]">AI clinical history for AYUSH clinics.</p>
        <div className="flex w-full flex-col gap-4">
          <Link href="/login" className="flex items-center justify-center gap-3 rounded-2xl bg-[#2F5233] py-5 text-xl font-semibold text-white shadow-md transition-colors active:bg-[#25401F]">
            <Stethoscope className="h-6 w-6" />
            Doctor Login
          </Link>
          <Link href="/patient" className="flex items-center justify-center gap-3 rounded-2xl border-2 border-[#2F5233] py-5 text-xl font-semibold text-[#2F5233] transition-colors active:bg-[#2F5233]/10">
            <UserRound className="h-6 w-6" />
            I am a Patient
          </Link>
        </div>
      </div>
    </main>
  );
}
