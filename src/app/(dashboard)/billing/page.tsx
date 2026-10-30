export const dynamic = "force-dynamic";
// src/app/(dashboard)/billing/page.tsx
import { auth } from "@clerk/nextjs/server";
import { CheckCircle, Zap } from "lucide-react";
import prisma from "@/lib/prisma";
import { effectivePlan, formatNaira, getPlans, PLAN_KEYS } from "@/lib/plans";
import { configuredProviders, getProviders } from "@/lib/payments";
import { CheckoutButton } from "@/components/billing/checkout-button";
import { formatDate } from "@/lib/utils";

const PAYMENT_MESSAGES: Record<string, { text: string; tone: "ok" | "warn" | "bad" }> = {
  success: { text: "Payment received. Your plan is now active. Thank you!", tone: "ok" },
  pending: {
    text: "We haven't received confirmation of your payment yet. If you were charged, your plan will activate automatically within a few minutes.",
    tone: "warn",
  },
  failed: { text: "The payment didn't go through, and you haven't been charged. Please try again.", tone: "bad" },
  unknown: { text: "We couldn't find that payment. If you were charged, contact support.", tone: "warn" },
};

export default async function BillingPage({ searchParams }: { searchParams: { payment?: string } }) {
  let userId: string | null = null;
  try {
    userId = (await auth()).userId ?? null;
  } catch (error) {
    console.error("[BILLING] auth failed:", error);
  }

  const plans = await getPlans();
  const available = configuredProviders();
  const providerOptions = getProviders()
    .filter((p) => available.includes(p.key))
    .map((p) => ({ key: p.key, name: p.name }));

  let currentPlan: (typeof PLAN_KEYS)[number] = "FREE";
  let periodEnd: Date | null = null;
  let gifted = false;
  let loadError: string | null = null;

  if (!userId) {
    loadError = "We couldn't identify your account right now. Please refresh or sign in again.";
  } else {
    try {
      const sub = await prisma.subscription.findUnique({ where: { userId } });
      currentPlan = effectivePlan(sub);
      if (currentPlan !== "FREE" && sub) {
        periodEnd = sub.currentPeriodEnd;
        gifted = sub.gifted;
      }
    } catch (error) {
      console.error("[BILLING] Failed to load subscription:", error);
      loadError = "We couldn't load your billing data right now. Your account is signed in, but the billing data source is unavailable.";
    }
  }

  const message = searchParams.payment ? PAYMENT_MESSAGES[searchParams.payment] : undefined;
  const toneClass = {
    ok: "border-emerald-200 bg-emerald-50 text-emerald-900",
    warn: "border-amber-200 bg-amber-50 text-amber-900",
    bad: "border-red-200 bg-red-50 text-red-900",
  };

  return (
    <div className="space-y-8 max-w-4xl">
      <div>
        <h1 className="text-2xl font-bold text-stone-900">Billing & Plans</h1>
        <p className="text-sm text-stone-500 mt-1">
          Current plan: <span className="font-semibold text-[#0A2810]">{plans[currentPlan].name}</span>
          {gifted && <span className="ml-2 rounded-full bg-amber-100 px-2 py-0.5 text-xs font-semibold text-amber-800">Gift</span>}
          {currentPlan !== "FREE" && (
            <span className="ml-2 text-stone-500">
              {periodEnd ? `· active until ${formatDate(periodEnd)}` : "· no expiry"}
            </span>
          )}
        </p>
      </div>

      {message && (
        <div className={`rounded-xl border px-4 py-3 text-sm ${toneClass[message.tone]}`}>{message.text}</div>
      )}
      {loadError && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">{loadError}</div>
      )}

      <div className="grid gap-6 md:grid-cols-3">
        {PLAN_KEYS.map((key) => {
          const plan = plans[key];
          const isCurrent = key === currentPlan;
          const highlight = key === "PREMIUM";
          return (
            <div
              key={key}
              className={`rounded-2xl border p-6 relative ${
                highlight ? "border-[#0A2810] shadow-lg shadow-[#0A2810]/10" : "border-stone-200 bg-white"
              }`}
            >
              {highlight && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                  <span className="inline-flex items-center gap-1 rounded-full bg-[#0A2810] px-3 py-1 text-xs font-bold text-[#D4A843]">
                    <Zap className="h-3 w-3" /> Most Popular
                  </span>
                </div>
              )}

              <div className="mb-6">
                <h3 className="font-bold text-stone-900 text-lg">{plan.name}</h3>
                <div className="mt-4">
                  <span className="text-3xl font-bold text-stone-900">{formatNaira(plan.priceNgn)}</span>
                  <span className="text-stone-500 text-sm ml-1">{plan.priceNgn === 0 ? "/ forever" : "/ month"}</span>
                </div>
              </div>

              <ul className="space-y-2.5 mb-6">
                {plan.features.map((f) => (
                  <li key={f} className="flex items-start gap-2 text-sm text-stone-700">
                    <CheckCircle className="h-4 w-4 text-emerald-500 mt-0.5 shrink-0" />
                    {f}
                  </li>
                ))}
              </ul>

              {isCurrent ? (
                <button disabled className="w-full rounded-xl py-2.5 text-sm font-semibold bg-stone-100 text-stone-500 cursor-default">
                  Current Plan
                </button>
              ) : key === "FREE" ? null : providerOptions.length > 0 && userId ? (
                <CheckoutButton
                  plan={key}
                  label={currentPlan === "FREE" ? `Upgrade to ${plan.name}` : `Switch to ${plan.name}`}
                  providers={providerOptions}
                  highlight={highlight}
                />
              ) : (
                <button disabled className="w-full rounded-xl py-2.5 text-sm font-semibold bg-stone-100 text-stone-400 cursor-not-allowed">
                  Unavailable
                </button>
              )}
            </div>
          );
        })}
      </div>

      {providerOptions.length === 0 && (
        <div className="rounded-xl bg-stone-50 border border-stone-200 p-6">
          <h3 className="font-semibold text-stone-900 mb-2">Online payment isn't switched on yet</h3>
          <p className="text-sm text-stone-500">
            Contact us at{" "}
            <a href="mailto:billing@invitely.app" className="text-[#0A2810] underline">
              billing@invitely.app
            </a>{" "}
            to upgrade your plan.
          </p>
        </div>
      )}
    </div>
  );
}
