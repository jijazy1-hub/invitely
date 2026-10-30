// src/app/api/admin/users/[userId]/plan/route.ts
// POST { plan: "FREE"|"BASIC"|"PREMIUM", days: number | null }
//   plan = FREE      -> revoke back to the free plan
//   plan = paid      -> gift that plan for `days` days (null = never expires)
import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { requireAdminApi } from "@/lib/admin";
import { isPlanKey } from "@/lib/plans";

export const dynamic = "force-dynamic";

export async function POST(req: Request, { params }: { params: { userId: string } }) {
  const gate = await requireAdminApi();
  if (!gate.ok) return gate.response;

  const body = await req.json().catch(() => null);
  const plan = body?.plan;
  const days = body?.days;

  if (!isPlanKey(plan)) return NextResponse.json({ error: "Invalid plan." }, { status: 400 });
  if (days !== null && days !== undefined && !(Number.isInteger(days) && days >= 1 && days <= 3650)) {
    return NextResponse.json({ error: "Days must be a whole number from 1 to 3650, or empty for no expiry." }, { status: 400 });
  }

  try {
    const user = await prisma.user.findUnique({ where: { id: params.userId } });
    if (!user) return NextResponse.json({ error: "User not found." }, { status: 404 });

    const now = new Date();
    const by = gate.admin.email ?? gate.admin.userId;

    if (plan === "FREE") {
      await prisma.subscription.upsert({
        where: { userId: user.id },
        create: { userId: user.id, plan: "FREE", status: "ACTIVE" },
        update: { plan: "FREE", status: "ACTIVE", currentPeriodStart: null, currentPeriodEnd: null, gifted: false, giftedBy: null },
      });
    } else {
      const end = typeof days === "number" ? new Date(now.getTime() + days * 86_400_000) : null;
      await prisma.subscription.upsert({
        where: { userId: user.id },
        create: { userId: user.id, plan, status: "ACTIVE", currentPeriodStart: now, currentPeriodEnd: end, gifted: true, giftedBy: by },
        update: { plan, status: "ACTIVE", currentPeriodStart: now, currentPeriodEnd: end, gifted: true, giftedBy: by },
      });
    }
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("[ADMIN][PLAN] Failed:", error);
    return NextResponse.json({ error: "Couldn't update the plan." }, { status: 500 });
  }
}
