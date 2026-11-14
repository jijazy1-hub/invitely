"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, UserCheck } from "lucide-react";

export function AdmitButton({ slug, code }: { slug: string; code: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  const admit = async () => {
    setBusy(true);
    setMsg(null);
    try {
      const res = await fetch("/api/checkin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ slug, code }),
      });
      const data = await res.json().catch(() => ({}));
      if (data.status === "success" || data.status === "already_checked_in") {
        if (navigator.vibrate) navigator.vibrate(120);
        router.refresh(); // turns the screen amber "Already checked in"
      } else {
        setMsg(data.message || "Couldn't check in. Try the scanner instead.");
      }
    } catch {
      setMsg("No connection. Try again.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="mt-6">
      <button
        onClick={admit}
        disabled={busy}
        className="flex w-full items-center justify-center gap-2 rounded-2xl bg-emerald-600 py-4 text-lg font-bold text-white shadow-lg hover:bg-emerald-700 disabled:opacity-60"
      >
        {busy ? <Loader2 className="h-5 w-5 animate-spin" /> : <UserCheck className="h-6 w-6" />} Admit &amp; check in
      </button>
      {msg && <p className="mt-2 text-sm text-red-600">{msg}</p>}
    </div>
  );
}
