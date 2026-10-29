import prisma from "@/lib/prisma";

export type Plan = "FREE" | "BASIC" | "PREMIUM";

/**
 * Plan limits are OFF by default so you can test freely while Stripe billing is
 * not wired up. Set ENFORCE_PLAN_LIMITS=true in Vercel to turn them on
 * (FREE: 1 event / 50 guests, BASIC: 5 events / 500 guests).
 */
export const limitsEnforced = () => process.env.ENFORCE_PLAN_LIMITS === "true";

export async function getPlan(userId: string): Promise<Plan> {
  const sub = await prisma.subscription.findUnique({ where: { userId } });
  if (sub?.plan === "BASIC" || sub?.plan === "PREMIUM") return sub.plan;
  return "FREE";
}

export function eventLimit(plan: Plan): number {
  return plan === "FREE" ? 1 : plan === "BASIC" ? 5 : Infinity;
}

export function guestLimit(plan: Plan): number {
  return plan === "FREE" ? 50 : plan === "BASIC" ? 500 : Infinity;
}

/** Turns a Prisma/DB error into a message a human can act on. */
export function describeDbError(err: unknown): string {
  const e = err as { code?: string; message?: string; name?: string };
  const msg = e?.message ?? "";
  if (e?.code === "P2021" || /does not exist/i.test(msg)) {
    return "Database tables are missing. Run supabase/schema.sql in the Supabase SQL Editor (see SETUP.md).";
  }
  if (e?.code === "P1001" || e?.code === "P1000" || e?.name === "PrismaClientInitializationError") {
    return "Cannot reach the database. Check the POSTGRES_PRISMA_URL environment variable and password (see SETUP.md).";
  }
  if (e?.code === "P2003") {
    return "Your account record is not in the database yet. Refresh and try again.";
  }
  return "Database error. Check the server logs for details.";
}
