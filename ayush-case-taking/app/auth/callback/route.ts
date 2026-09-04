import { NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { createAdminSupabase } from "@/lib/supabase-admin";
import { issueSession } from "@/lib/session";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const code = url.searchParams.get("code");

  if (code) {
    try {
      const cookieStore = cookies();
      const supabase = createServerClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        {
          cookies: {
            getAll: () => cookieStore.getAll(),
            setAll: (list) => {
              try { list.forEach((c) => cookieStore.set(c.name, c.value, c.options)); } catch {}
            },
          },
        }
      );
      const { data } = await supabase.auth.exchangeCodeForSession(code);
      const email = data.user?.email;
      if (email) {
        const admin = createAdminSupabase();
        let { data: doctor } = await admin.from("doctors").select("*").eq("email", email).single();
        if (!doctor) {
          const { data: created } = await admin
            .from("doctors")
            .insert({ email, name: email.split("@")[0], pass_hash: null })
            .select()
            .single();
          doctor = created;
        }
        if (doctor) await issueSession(doctor.id);
      }
    } catch (e) {
      console.error("[auth/callback]", e);
    }
  }
  return NextResponse.redirect(url.origin + "/doctor");
}
