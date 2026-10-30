// src/app/api/billing/checkout/route.ts
// POST { plan: "BASIC" | "PREMIUM", provider: "FLUTTERWAVE" | "PAYSTACK" } -> { url }
import { NextResponse } from "next/server";
import { auth, currentUser } from "@clerk/nextjs/server";
import prisma from "@/lib/prisma";
import { getPlans, isPlanKey } from "@/lib/plans";
import { configuredProviders, initializeCheckout, isProviderKey, newReference } from "@/lib/payments";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => null);
  const plan = body?.plan;
  const provider = body?.provider;

  if (!isPlanKey(plan) || plan === "FREE") {
    return NextResponse.json({ error: "Choose a paid plan." }, { status: 400 });
  }
  if (!isProviderKey(provider)) {
    return NextResponse.json({ error: "Choose a payment method." }, { status: 400 });
  }
  if (!configuredProviders().includes(provider)) {
    return NextResponse.json({ error: "That payment method isn't available right now." }, { status: 400 });
  }

  const plans = await getPlans();
  const amount = plans[plan].priceNgn;
  if (!Number.isInteger(amount) || amount <= 0) {
    return NextResponse.json({ error: "This plan has no price set yet." }, { status: 400 });
  }

  const clerkUser = await currentUser();
  const email =
    clerkUser?.primaryEmailAddress?.emailAddress ?? clerkUser?.emailAddresses[0]?.emailAddress ?? null;
  if (!email) {
    return NextResponse.json({ error: "Your account has no email address." }, { status: 400 });
  }
  const name = [clerkUser?.firstName, clerkUser?.lastName].filter(Boolean).join(" ") || null;

  const reference = newReference();
  try {
    // Make sure the user row exists (payments reference it by id).
    await prisma.user.upsert({
      where: { id: userId },
      update: {},
      create: { id: userId, email, name, imageUrl: clerkUser?.imageUrl ?? null },
    });

    await prisma.payment.create({
      data: { userId, provider, reference, plan, amount, currency: "NGN", status: "PENDING" },
    });

    const callbackUrl = `${new URL(req.url).origin}/api/billing/callback`;
    const { url } = await initializeCheckout({
      provider,
      reference,
      amount,
      email,
      name,
      plan,
      userId,
      callbackUrl,
    });
    return NextResponse.json({ url });
  } catch (error) {
    console.error("[BILLING][CHECKOUT] Failed:", error);
    await prisma.payment.updateMany({ where: { reference }, data: { status: "FAILED" } }).catch(() => null);
    return NextResponse.json({ error: "Couldn't start the payment. Please try again." }, { status: 502 });
  }
}
