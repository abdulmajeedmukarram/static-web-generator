"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Search } from "lucide-react";

export default function CodeLookup() {
  const router = useRouter();
  const [code, setCode] = useState("");

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        const c = code.trim();
        if (c) router.push(`/doctor/lookup?code=${encodeURIComponent(c)}`);
      }}
      className="flex items-center gap-2"
    >
      <input
        value={code}
        onChange={(e) => setCode(e.target.value)}
        placeholder="Patient code, e.g. MK-A1B2"
        className="w-56 rounded-md border border-stone-700 bg-stone-950 px-3 py-1.5 text-sm text-stone-100 focus:border-emerald-500 focus:outline-none"
      />
      <button type="submit" className="flex items-center gap-1 rounded-md bg-stone-800 px-3 py-1.5 text-sm font-semibold text-stone-100 hover:bg-stone-700">
        <Search className="h-4 w-4" />
        Open chart
      </button>
    </form>
  );
}
