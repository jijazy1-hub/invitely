// src/lib/plans.ts
// Plan definitions. Defaults live here; admins can override them from /admin/plans
// (stored in the plan_configs table). Reads never throw: if the table is missing
// or the database is down, the defaults are used.
import prisma from "@/lib/prisma";

export type PlanKey = "FREE" | "BASIC" | "PREMIUM";
export const PLAN_KEYS: PlanKey[] = ["FREE", "BASIC", "PREMIUM"];

export type PlanDef = {
  key: PlanKey;
  name: string;
  priceNgn: number;
  maxEvents: number | null; // null = unlimited
  maxGuests: number | null; // null = unlimited (per event)
  features: string[];
};

export const DEFAULT_PLANS: Record<PlanKey, PlanDef> = {
  FREE: {
    key: "FREE",
    name: "Free",
    priceNgn: 0,
    maxEvents: 1,
    maxGuests: 50,
    features: ["1 event", "Up to 50 guests", "Basic invitation card", "QR check-in", "RSVP management"],
  },
  BASIC: {
    key: "BASIC",
    name: "Basic",
    priceNgn: 5000,
    maxEvents: 5,
    maxGuests: 500,
    features: [
      "Up to 5 events",
      "Up to 500 guests per event",
      "Custom branding colors",
      "Event logo & cover image",
      "Priority support",
      "Analytics dashboard",
    ],
  },
  PREMIUM: {
    key: "PREMIUM",
    name: "Premium",
    priceNgn: 15000,
    maxEvents: null,
    maxGuests: null,
    features: [
      "Unlimited events",
      "Unlimited guests",
      "Custom templates",
      "Advanced analytics",
      "White-label cards",
      "API access",
      "Dedicated support",
    ],
  },
};

export function isPlanKey(v: unknown): v is PlanKey {
  return v === "FREE" || v === "BASIC" || v === "PREMIUM";
}

export async function getPlans(): Promise<Record<PlanKey, PlanDef>> {
  const plans: Record<PlanKey, PlanDef> = {
    FREE: { ...DEFAULT_PLANS.FREE },
    BASIC: { ...DEFAULT_PLANS.BASIC },
    PREMIUM: { ...DEFAULT_PLANS.PREMIUM },
  };
  try {
    const rows = await prisma.planConfig.findMany();
    for (const row of rows) {
      if (!isPlanKey(row.key)) continue;
      plans[row.key] = {
        key: row.key,
        name: row.name,
        priceNgn: row.priceNgn,
        maxEvents: row.maxEvents,
        maxGuests: row.maxGuests,
        features: row.features.split("\n").map((f) => f.trim()).filter(Boolean),
      };
    }
  } catch (error) {
    console.error("[PLANS] Could not read plan_configs, using defaults:", error);
  }
  return plans;
}

type SubLike = {
  plan: string;
  status: string;
  currentPeriodEnd: Date | null;
} | null | undefined;

/**
 * The plan a user is actually entitled to right now.
 * A paid/gifted plan with an end date in the past, or a cancelled one, counts as FREE.
 * A plan with no end date never expires (used for lifetime gifts).
 */
export function effectivePlan(sub: SubLike, now: Date = new Date()): PlanKey {
  if (!sub || !isPlanKey(sub.plan) || sub.plan === "FREE") return "FREE";
  if (sub.status === "CANCELLED") return "FREE";
  if (sub.currentPeriodEnd && sub.currentPeriodEnd.getTime() < now.getTime()) return "FREE";
  return sub.plan;
}

export async function getUserPlan(userId: string): Promise<PlanDef> {
  const plans = await getPlans();
  const sub = await prisma.subscription.findUnique({ where: { userId } });
  return plans[effectivePlan(sub)];
}

export function formatNaira(amount: number): string {
  return `₦${amount.toLocaleString("en-NG")}`;
}
