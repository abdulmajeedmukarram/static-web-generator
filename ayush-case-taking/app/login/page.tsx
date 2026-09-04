"use client";

import { useState } from "react";
import { useFormState } from "react-dom";
import { Sparkles, Stethoscope, KeyRound, UserPlus } from "lucide-react";
import { demoLogin, loginDoctor, signupDoctor } from "@/lib/auth-actions";
import { createBrowserSupabase } from "@/lib/supabase-client";

export default function LoginPage() {
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [advMode, setAdvMode] = useState<"signin" | "signup">("signup");
  const [note, setNote] = useState<string | null>(null);
  const [loginState, loginAction] = useFormState(loginDoctor, null as { error?: string } | null);
  const [signupState, signupAction] = useFormState(signupDoctor, null as { error?: string } | null);
  const state = advMode === "signin" ? loginState : signupState;

  async function handleGoogle() {
    setNote(null);
    const supabase = createBrowserSupabase();
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: window.location.origin + "/auth/callback" },
    });
    if (error) {
      setNote("Google needs a one-time Cloud Console setup. Use Create account or Demo below — they always work.");
    }
  }

  return (
    <main className="flex min-h-dvh w-full flex-col items-center justify-center bg-[#FAF6EE] px-6 py-10">
      <div className="flex w-full max-w-sm flex-col items-center gap-5 rounded-3xl border border-[#E4DCC8] bg-[#FFFDF9] p-8 shadow-sm">
        <Stethoscope className="h-12 w-12 text-[#2F5233]" strokeWidth={1.5} />
        <p className="text-2xl font-semibold text-[#2B2620]">Doctor Login</p>

        <button type="button" onClick={handleGoogle} className="flex w-full items-center justify-center gap-3 rounded-2xl border-2 border-stone-300 bg-white py-4 text-xl font-semibold text-stone-700 transition-colors hover:bg-stone-50">
          Continue with Google
        </button>

        <form action={demoLogin} className="w-full">
          <button type="submit" className="flex w-full items-center justify-center gap-3 rounded-2xl bg-amber-600 py-4 text-xl font-semibold text-white shadow-md transition-colors hover:bg-amber-500">
            <Sparkles className="h-6 w-6" />
            One-tap Demo Doctor
          </button>
        </form>

        {note && <p role="alert" className="text-center text-sm text-[#8f1e18]">{note}</p>}

        <button type="button" onClick={() => setShowAdvanced(!showAdvanced)} className="text-sm text-[#6E6555] underline underline-offset-4">
          {showAdvanced ? "Hide" : "Email + password (create your own doctor ID)"}
        </button>

        {showAdvanced && (
          <div className="flex w-full flex-col gap-3">
            <div className="flex w-full rounded-2xl border border-[#E4DCC8] bg-white p-1">
              <button type="button" onClick={() => setAdvMode("signin")} className={`flex-1 rounded-xl py-2 text-base font-semibold ${advMode === "signin" ? "bg-[#2F5233] text-white" : "text-[#6E6555]"}`}>Sign in</button>
              <button type="button" onClick={() => setAdvMode("signup")} className={`flex-1 rounded-xl py-2 text-base font-semibold ${advMode === "signup" ? "bg-[#2F5233] text-white" : "text-[#6E6555]"}`}>Create account</button>
            </div>
            <form action={advMode === "signin" ? loginAction : signupAction} className="flex w-full flex-col gap-3">
              <input name="email" type="email" required placeholder="you@hospital.gov.in" className="w-full rounded-2xl border border-[#E4DCC8] bg-white p-3 text-base text-[#2B2620] focus:outline focus:outline-4 focus:outline-[#2F5233]" />
              <input name="password" type="password" required placeholder="Password (6+ chars)" className="w-full rounded-2xl border border-[#E4DCC8] bg-white p-3 text-base text-[#2B2620] focus:outline focus:outline-4 focus:outline-[#2F5233]" />
              {advMode === "signup" && (
                <input name="confirm" type="password" required placeholder="Re-type password" className="w-full rounded-2xl border border-[#E4DCC8] bg-white p-3 text-base text-[#2B2620] focus:outline focus:outline-4 focus:outline-[#2F5233]" />
              )}
              {state?.error && <p role="alert" className="text-center text-sm text-[#8f1e18]">{state.error}</p>}
              <button type="submit" className="flex items-center justify-center gap-2 rounded-2xl bg-[#2F5233] py-3 text-lg font-semibold text-white">
                {advMode === "signin" ? <KeyRound className="h-5 w-5" /> : <UserPlus className="h-5 w-5" />}
                {advMode === "signin" ? "Sign in" : "Create account — instant, no email check"}
              </button>
            </form>
          </div>
        )}

        <p className="text-center text-xs text-[#6E6555]">
          Passwords stored as salted SHA-256 hashes. Prototype auth — production would use hospital SSO.
        </p>
      </div>
    </main>
  );
}
