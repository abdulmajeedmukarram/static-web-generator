"use client";

import { LogOut } from "lucide-react";
import { logoutDoctor } from "@/lib/auth-actions";

export default function LogoutButton() {
  return (
    <form action={logoutDoctor}>
      <button type="submit" className="flex items-center gap-1 text-xs text-stone-400 transition-colors hover:text-stone-100">
        <LogOut className="h-3.5 w-3.5" />
        Logout
      </button>
    </form>
  );
}
