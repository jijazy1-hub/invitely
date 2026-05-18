export const dynamic = "force-dynamic";
// src/app/(dashboard)/billing/page.tsx
import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { CheckCircle, Zap } from "lucide-react";
import prisma from "@/lib/prisma";

const PLANS = [
  {
    key: "FREE",
    name: "Free",
    price: "₦0",
    period: "forever",
    description: "Perfect for trying it out",
    features: [
      "1 event",
      "Up to 50 guests",
      "Basic invitation card",
      "QR check-in",
      "RSVP management",
    ],
    cta: "Current Plan",
    highlight: false,
  },
  {
    key: "BASIC",
    name: "Basic",
    price: "₦5,000",
    period: "per month",
    description: "For small to medium events",
    features: [
      "Up to 5 events",
      "Up to 500 guests per event",
      "Custom branding colors",
      "Event logo & cover image",
      "Priority support",
      "Analytics dashboard",
    ],
    cta: "Upgrade to Basic",
    highlight: false,
  },
  {
    key: "PREMIUM",
    name: "Premium",
    price: "₦15,000",
    period: "per month",
    description: "For event professionals",
    features: [
      "Unlimited events",
      "Unlimited guests",
      "Custom templates",
      "Advanced analytics",
      "White-label cards",
      "API access",
      "Dedicated support",
    ],
    cta: "Upgrade to Premium",
    highlight: true,
  },
];

export default async function BillingPage() {
  const { userId } = await auth();
  if (!userId) redirect("/sign-in");

  const sub = await prisma.subscription.findUnique({ where: { userId } });
  const currentPlan = sub?.plan ?? "FREE";

  return (
    <div className="space-y-8 max-w-4xl">
      <div>
        <h1 className="text-2xl font-bold text-stone-900">Billing & Plans</h1>
        <p className="text-sm text-stone-500 mt-1">
          Current plan: <span className="font-semibold text-[#0A2810]">{currentPlan}</span>
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        {PLANS.map((plan) => {
          const isCurrent = plan.key === currentPlan;
          return (
            <div
              key={plan.key}
              className={`rounded-2xl border p-6 relative ${
                plan.highlight
                  ? "border-[#0A2810] shadow-lg shadow-[#0A2810]/10"
                  : "border-stone-200 bg-white"
              }`}
            >
              {plan.highlight && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                  <span className="inline-flex items-center gap-1 rounded-full bg-[#0A2810] px-3 py-1 text-xs font-bold text-[#D4A843]">
                    <Zap className="h-3 w-3" /> Most Popular
                  </span>
                </div>
              )}

              <div className="mb-6">
                <h3 className="font-bold text-stone-900 text-lg">{plan.name}</h3>
                <p className="text-stone-500 text-sm mt-1">{plan.description}</p>
                <div className="mt-4">
                  <span className="text-3xl font-bold text-stone-900">{plan.price}</span>
                  <span className="text-stone-500 text-sm ml-1">/ {plan.period}</span>
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

              <button
                disabled={isCurrent}
                className={`w-full rounded-xl py-2.5 text-sm font-semibold transition-colors ${
                  isCurrent
                    ? "bg-stone-100 text-stone-500 cursor-default"
                    : plan.highlight
                    ? "bg-[#0A2810] text-white hover:bg-[#0f3515]"
                    : "border border-[#0A2810] text-[#0A2810] hover:bg-[#0A2810] hover:text-white"
                }`}
              >
                {isCurrent ? "Current Plan" : plan.cta}
              </button>
            </div>
          );
        })}
      </div>

      <div className="rounded-xl bg-stone-50 border border-stone-200 p-6">
        <h3 className="font-semibold text-stone-900 mb-2">Payment Coming Soon</h3>
        <p className="text-sm text-stone-500">
          Stripe payment integration will be enabled soon. Contact us at{" "}
          <a href="mailto:billing@invitely.app" className="text-[#0A2810] underline">
            billing@invitely.app
          </a>{" "}
          to upgrade your plan manually.
        </p>
      </div>
    </div>
  );
}
