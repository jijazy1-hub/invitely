// src/components/billing/upgrade-prompt.tsx
import Link from "next/link";
import { BarChart2, Lock, Check } from "lucide-react";

export function AnalyticsUpgradePrompt() {
  return (
    <div className="mx-auto max-w-xl py-10">
      <div className="rounded-2xl border border-stone-200 bg-white p-8 text-center shadow-sm">
        <div className="relative mx-auto h-14 w-14">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-[#0A2810]/10">
            <BarChart2 className="h-7 w-7 text-[#0A2810]" />
          </div>
          <div className="absolute -bottom-1 -right-1 flex h-6 w-6 items-center justify-center rounded-full bg-[#B8860B]">
            <Lock className="h-3 w-3 text-white" />
          </div>
        </div>
        <h1 className="mt-5 text-2xl font-bold text-stone-900">Analytics is a paid feature</h1>
        <p className="mt-2 text-sm text-stone-500">Upgrade to Basic or Premium to see how your events are doing.</p>
        <ul className="mx-auto mt-6 max-w-xs space-y-2 text-left text-sm text-stone-700">
          {["RSVP trends over time", "Confirmed, declined and pending breakdown", "Live check-in rate on event day", "Numbers across all your events"].map((f) => (
            <li key={f} className="flex items-start gap-2"><Check className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />{f}</li>
          ))}
        </ul>
        <Link href="/billing" className="mt-7 inline-flex items-center justify-center rounded-lg bg-[#0A2810] px-6 py-3 text-sm font-semibold text-white hover:bg-[#0f3515]">
          See plans
        </Link>
        <p className="mt-4 text-xs text-stone-400">Your guest list, RSVPs and check-in keep working on the Free plan.</p>
      </div>
    </div>
  );
}
