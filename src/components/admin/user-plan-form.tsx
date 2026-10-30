// src/components/admin/user-plan-form.tsx
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Gift, Loader2 } from "lucide-react";

const DURATIONS = [
  { label: "30 days", value: "30" },
  { label: "90 days", value: "90" },
  { label: "1 year", value: "365" },
  { label: "Never expires", value: "forever" },
];

export function UserPlanForm({
  userId,
  email,
  currentPlan,
  plans,
}: {
  userId: string;
  email: string;
  currentPlan: string;
  plans: { key: string; name: string }[];
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [plan, setPlan] = useState(currentPlan === "FREE" ? "PREMIUM" : currentPlan);
  const [duration, setDuration] = useState("30");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async () => {
    const isRevoke = plan === "FREE";
    const what = isRevoke
      ? `Move ${email} back to the Free plan?`
      : `Gift ${email} the ${plans.find((p) => p.key === plan)?.name ?? plan} plan (${
          DURATIONS.find((d) => d.value === duration)?.label.toLowerCase()
        })?`;
    if (!window.confirm(what)) return;

    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/admin/users/${encodeURIComponent(userId)}/plan`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ plan, days: isRevoke || duration === "forever" ? null : Number(duration) }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Failed");
      setOpen(false);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-1.5 rounded-lg border border-stone-200 px-2.5 py-1.5 text-xs font-medium text-stone-700 hover:border-[#0A2810] hover:text-[#0A2810]"
      >
        <Gift className="h-3.5 w-3.5" /> Gift / change plan
      </button>
    );
  }

  return (
    <div className="flex flex-wrap items-center justify-end gap-2">
      <select
        value={plan}
        onChange={(e) => setPlan(e.target.value)}
        className="rounded-lg border border-stone-200 bg-white px-2 py-1.5 text-xs"
      >
        {plans.map((p) => (
          <option key={p.key} value={p.key}>
            {p.key === "FREE" ? "Free (revoke)" : p.name}
          </option>
        ))}
      </select>
      {plan !== "FREE" && (
        <select
          value={duration}
          onChange={(e) => setDuration(e.target.value)}
          className="rounded-lg border border-stone-200 bg-white px-2 py-1.5 text-xs"
        >
          {DURATIONS.map((d) => (
            <option key={d.value} value={d.value}>
              {d.label}
            </option>
          ))}
        </select>
      )}
      <button
        onClick={submit}
        disabled={loading}
        className="inline-flex items-center gap-1.5 rounded-lg bg-[#0A2810] px-3 py-1.5 text-xs font-semibold text-white hover:bg-[#0f3515] disabled:opacity-60"
      >
        {loading && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
        Apply
      </button>
      <button onClick={() => setOpen(false)} className="text-xs text-stone-500 hover:text-stone-800">
        Cancel
      </button>
      {error && <p className="w-full text-right text-xs text-red-600">{error}</p>}
    </div>
  );
}
