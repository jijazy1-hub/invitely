// src/components/billing/checkout-button.tsx
"use client";

import { useState } from "react";
import { Loader2 } from "lucide-react";

type Provider = { key: string; name: string };

export function CheckoutButton({
  plan,
  label,
  providers,
  highlight,
}: {
  plan: string;
  label: string;
  providers: Provider[];
  highlight: boolean;
}) {
  const [choosing, setChoosing] = useState(false);
  const [loading, setLoading] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const start = async (provider: string) => {
    setError(null);
    setLoading(provider);
    try {
      const res = await fetch("/api/billing/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ plan, provider }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.url) throw new Error(data.error || "Couldn't start the payment.");
      window.location.href = data.url;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
      setLoading(null);
    }
  };

  const onClick = () => {
    if (providers.length === 1) void start(providers[0].key);
    else setChoosing((c) => !c);
  };

  const btnClass = highlight
    ? "bg-[#0A2810] text-white hover:bg-[#0f3515]"
    : "border border-[#0A2810] text-[#0A2810] hover:bg-[#0A2810] hover:text-white";

  return (
    <div className="space-y-2">
      <button
        onClick={onClick}
        disabled={loading !== null}
        className={`w-full rounded-xl py-2.5 text-sm font-semibold transition-colors flex items-center justify-center gap-2 disabled:opacity-60 ${btnClass}`}
      >
        {loading && <Loader2 className="h-4 w-4 animate-spin" />}
        {label}
      </button>

      {choosing && providers.length > 1 && (
        <div className="rounded-xl border border-stone-200 bg-stone-50 p-2 space-y-1.5">
          <p className="px-1 text-xs text-stone-500">Pay with</p>
          {providers.map((p) => (
            <button
              key={p.key}
              onClick={() => start(p.key)}
              disabled={loading !== null}
              className="w-full rounded-lg bg-white border border-stone-200 px-3 py-2 text-sm font-medium text-stone-800 hover:border-[#0A2810] disabled:opacity-60"
            >
              {p.name}
            </button>
          ))}
        </div>
      )}

      {error && <p className="text-xs text-red-600">{error}</p>}
    </div>
  );
}
