// src/components/admin/feature-settings.tsx
"use client";

import { useState } from "react";
import { Crown, Loader2 } from "lucide-react";

export function FeatureSettings({ initialPremiumDesigns }: { initialPremiumDesigns: "PAID" | "FREE" }) {
  const [value, setValue] = useState(initialPremiumDesigns);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  const change = async (next: "PAID" | "FREE") => {
    if (next === value) return;
    setBusy(true);
    setMsg(null);
    try {
      const res = await fetch("/api/admin/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ premiumDesigns: next }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Couldn't save.");
      setValue(next);
      setMsg({ ok: true, text: next === "FREE" ? "Premium card designs are now free for everyone." : "Premium card designs are now for paid plans only." });
    } catch (e: any) {
      setMsg({ ok: false, text: e.message });
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="rounded-2xl border border-stone-200 bg-white p-6">
      <div className="flex items-start gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-amber-50"><Crown className="h-5 w-5 text-amber-600" /></div>
        <div className="flex-1">
          <h2 className="font-semibold text-stone-900">Premium card designs</h2>
          <p className="mt-1 text-sm text-stone-500">
            The Card Designer&apos;s premium layouts (Elegant Photo, Royal, Modern, Minimal), background photos, fonts and decorations.
            The Classic card is always free.
          </p>
          <div className="mt-4 inline-flex rounded-lg bg-stone-100 p-1 text-sm">
            {([["PAID", "Paid plans only"], ["FREE", "Free for everyone"]] as const).map(([k, label]) => (
              <button
                key={k}
                onClick={() => change(k)}
                disabled={busy}
                className={`inline-flex items-center gap-2 rounded-md px-4 py-2 font-medium transition ${value === k ? "bg-white text-stone-900 shadow-sm" : "text-stone-600 hover:text-stone-900"}`}
              >
                {busy && value !== k ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : null}
                {label}
              </button>
            ))}
          </div>
          {msg && <p className={`mt-3 text-sm ${msg.ok ? "text-emerald-700" : "text-red-600"}`}>{msg.text}</p>}
          <p className="mt-3 text-xs text-stone-400">Designs people already saved keep working if you switch back to paid. They just can&apos;t make new premium changes without a plan.</p>
        </div>
      </div>
    </div>
  );
}
