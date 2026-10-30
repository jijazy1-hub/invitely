// src/components/admin/plan-editor.tsx
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";

export type EditablePlan = {
  key: string;
  name: string;
  priceNgn: number;
  maxEvents: number | null;
  maxGuests: number | null;
  features: string[];
};

type Draft = {
  key: string;
  name: string;
  price: string;
  maxEvents: string;
  maxGuests: string;
  features: string;
};

const toDraft = (p: EditablePlan): Draft => ({
  key: p.key,
  name: p.name,
  price: String(p.priceNgn),
  maxEvents: p.maxEvents === null ? "" : String(p.maxEvents),
  maxGuests: p.maxGuests === null ? "" : String(p.maxGuests),
  features: p.features.join("\n"),
});

export function PlanEditor({ initial }: { initial: EditablePlan[] }) {
  const router = useRouter();
  const [drafts, setDrafts] = useState<Draft[]>(initial.map(toDraft));
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ text: string; error: boolean } | null>(null);

  const set = (key: string, field: keyof Draft, value: string) =>
    setDrafts((ds) => ds.map((d) => (d.key === key ? { ...d, [field]: value } : d)));

  const save = async () => {
    setSaving(true);
    setMessage(null);
    try {
      const plans = drafts.map((d) => ({
        key: d.key,
        name: d.name,
        priceNgn: d.key === "FREE" ? 0 : Number(d.price),
        maxEvents: d.maxEvents.trim() === "" ? null : Number(d.maxEvents),
        maxGuests: d.maxGuests.trim() === "" ? null : Number(d.maxGuests),
        features: d.features.split("\n"),
      }));
      const res = await fetch("/api/admin/plans", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ plans }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Couldn't save");
      setMessage({ text: "Saved. Customers see the new prices and limits straight away.", error: false });
      router.refresh();
    } catch (err) {
      setMessage({ text: err instanceof Error ? err.message : "Couldn't save", error: true });
    } finally {
      setSaving(false);
    }
  };

  const input = "w-full rounded-lg border border-stone-200 bg-white px-3 py-2 text-sm focus:border-[#0A2810] focus:outline-none";

  return (
    <div className="space-y-6">
      <div className="grid gap-5 lg:grid-cols-3">
        {drafts.map((d) => (
          <div key={d.key} className="rounded-xl border border-stone-200 bg-white p-5 space-y-4">
            <p className="text-xs font-bold uppercase tracking-wide text-stone-400">{d.key}</p>

            <label className="block space-y-1">
              <span className="text-xs font-medium text-stone-600">Display name</span>
              <input className={input} value={d.name} onChange={(e) => set(d.key, "name", e.target.value)} />
            </label>

            <label className="block space-y-1">
              <span className="text-xs font-medium text-stone-600">Price per month (₦)</span>
              <input
                className={input}
                inputMode="numeric"
                value={d.key === "FREE" ? "0" : d.price}
                disabled={d.key === "FREE"}
                onChange={(e) => set(d.key, "price", e.target.value.replace(/[^0-9]/g, ""))}
              />
            </label>

            <div className="grid grid-cols-2 gap-3">
              <label className="block space-y-1">
                <span className="text-xs font-medium text-stone-600">Max events</span>
                <input
                  className={input}
                  inputMode="numeric"
                  placeholder="Unlimited"
                  value={d.maxEvents}
                  onChange={(e) => set(d.key, "maxEvents", e.target.value.replace(/[^0-9]/g, ""))}
                />
              </label>
              <label className="block space-y-1">
                <span className="text-xs font-medium text-stone-600">Guests / event</span>
                <input
                  className={input}
                  inputMode="numeric"
                  placeholder="Unlimited"
                  value={d.maxGuests}
                  onChange={(e) => set(d.key, "maxGuests", e.target.value.replace(/[^0-9]/g, ""))}
                />
              </label>
            </div>

            <label className="block space-y-1">
              <span className="text-xs font-medium text-stone-600">Features (one per line)</span>
              <textarea
                className={`${input} min-h-[140px]`}
                value={d.features}
                onChange={(e) => set(d.key, "features", e.target.value)}
              />
            </label>
          </div>
        ))}
      </div>

      <div className="flex items-center gap-4">
        <button
          onClick={save}
          disabled={saving}
          className="inline-flex items-center gap-2 rounded-lg bg-[#0A2810] px-5 py-2.5 text-sm font-semibold text-white hover:bg-[#0f3515] disabled:opacity-60"
        >
          {saving && <Loader2 className="h-4 w-4 animate-spin" />}
          Save plans
        </button>
        {message && <span className={`text-sm ${message.error ? "text-red-600" : "text-emerald-700"}`}>{message.text}</span>}
      </div>
    </div>
  );
}
