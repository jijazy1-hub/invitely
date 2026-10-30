// src/lib/payments.ts
// Payment providers (Flutterwave, Paystack) behind one small interface.
//
// Flow: checkout route creates a PENDING Payment row -> user pays on the provider's
// hosted page -> provider redirects to /api/billing/callback AND sends a webhook ->
// both call settlePayment(), which re-verifies with the provider's API (we never trust
// the redirect or webhook body on its own) and activates the plan exactly once.
import crypto from "crypto";
import prisma from "@/lib/prisma";
import { isPlanKey, type PlanKey } from "@/lib/plans";

export type ProviderKey = "FLUTTERWAVE" | "PAYSTACK";
export const PLAN_PERIOD_DAYS = 30;
const CURRENCY = "NGN";

export type ProviderInfo = {
  key: ProviderKey;
  name: string;
  configured: boolean;
  envVars: { name: string; set: boolean }[];
  webhookPath: string;
  webhookNote: string;
};

function has(name: string): boolean {
  return !!process.env[name]?.trim();
}

export function isProviderKey(v: unknown): v is ProviderKey {
  return v === "FLUTTERWAVE" || v === "PAYSTACK";
}

/** Connection status for each provider. Never exposes secret values, only whether they are set. */
export function getProviders(): ProviderInfo[] {
  return [
    {
      key: "FLUTTERWAVE",
      name: "Flutterwave",
      configured: has("FLUTTERWAVE_SECRET_KEY"),
      envVars: [
        { name: "FLUTTERWAVE_SECRET_KEY", set: has("FLUTTERWAVE_SECRET_KEY") },
        { name: "FLUTTERWAVE_WEBHOOK_HASH", set: has("FLUTTERWAVE_WEBHOOK_HASH") },
      ],
      webhookPath: "/api/webhooks/flutterwave",
      webhookNote:
        "In Flutterwave: Settings > Webhooks. Paste the URL and set the 'Secret hash' to the same value as FLUTTERWAVE_WEBHOOK_HASH.",
    },
    {
      key: "PAYSTACK",
      name: "Paystack",
      configured: has("PAYSTACK_SECRET_KEY"),
      envVars: [{ name: "PAYSTACK_SECRET_KEY", set: has("PAYSTACK_SECRET_KEY") }],
      webhookPath: "/api/webhooks/paystack",
      webhookNote: "In Paystack: Settings > API Keys & Webhooks. Paste the URL as the Live/Test Webhook URL.",
    },
  ];
}

export function configuredProviders(): ProviderKey[] {
  return getProviders().filter((p) => p.configured).map((p) => p.key);
}

export function newReference(): string {
  return `INV-${Date.now().toString(36)}-${crypto.randomBytes(4).toString("hex")}`.toUpperCase();
}

// ─── Initialise a hosted checkout ────────────────────────────────────────────

type InitInput = {
  provider: ProviderKey;
  reference: string;
  amount: number; // whole naira
  email: string;
  name: string | null;
  plan: PlanKey;
  userId: string;
  callbackUrl: string;
};

async function readJson(res: Response): Promise<any> {
  const text = await res.text();
  try {
    return JSON.parse(text);
  } catch {
    return { message: text.slice(0, 200) };
  }
}

export async function initializeCheckout(input: InitInput): Promise<{ url: string }> {
  if (input.provider === "FLUTTERWAVE") {
    const res = await fetch("https://api.flutterwave.com/v3/payments", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.FLUTTERWAVE_SECRET_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        tx_ref: input.reference,
        amount: input.amount,
        currency: CURRENCY,
        redirect_url: input.callbackUrl,
        customer: { email: input.email, name: input.name ?? input.email },
        customizations: { title: "Invitely", description: `${input.plan} plan (${PLAN_PERIOD_DAYS} days)` },
        meta: { userId: input.userId, plan: input.plan },
      }),
    });
    const json = await readJson(res);
    const link = json?.data?.link;
    if (!res.ok || json?.status !== "success" || typeof link !== "string") {
      throw new Error(`Flutterwave: ${json?.message ?? `HTTP ${res.status}`}`);
    }
    return { url: link };
  }

  const res = await fetch("https://api.paystack.co/transaction/initialize", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      email: input.email,
      amount: input.amount * 100, // Paystack wants kobo
      currency: CURRENCY,
      reference: input.reference,
      callback_url: input.callbackUrl,
      metadata: { userId: input.userId, plan: input.plan },
    }),
  });
  const json = await readJson(res);
  const url = json?.data?.authorization_url;
  if (!res.ok || json?.status !== true || typeof url !== "string") {
    throw new Error(`Paystack: ${json?.message ?? `HTTP ${res.status}`}`);
  }
  return { url };
}

// ─── Verify with the provider ────────────────────────────────────────────────

type Verification =
  | { state: "success"; amount: number; currency: string; txId: string | null }
  | { state: "failed" }
  | { state: "pending" };

async function verifyWithProvider(provider: ProviderKey, reference: string): Promise<Verification> {
  if (provider === "FLUTTERWAVE") {
    const res = await fetch(
      `https://api.flutterwave.com/v3/transactions/verify_by_reference?tx_ref=${encodeURIComponent(reference)}`,
      { headers: { Authorization: `Bearer ${process.env.FLUTTERWAVE_SECRET_KEY}` }, cache: "no-store" }
    );
    const json = await readJson(res);
    // No transaction yet (user hasn't paid / abandoned) comes back as an error response.
    if (!res.ok || json?.status !== "success" || !json?.data) return { state: "pending" };
    const status = String(json.data.status ?? "").toLowerCase();
    if (status === "successful") {
      return {
        state: "success",
        amount: Number(json.data.amount),
        currency: String(json.data.currency ?? ""),
        txId: json.data.id != null ? String(json.data.id) : null,
      };
    }
    return status === "failed" ? { state: "failed" } : { state: "pending" };
  }

  const res = await fetch(`https://api.paystack.co/transaction/verify/${encodeURIComponent(reference)}`, {
    headers: { Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}` },
    cache: "no-store",
  });
  const json = await readJson(res);
  if (!res.ok || json?.status !== true || !json?.data) return { state: "pending" };
  const status = String(json.data.status ?? "").toLowerCase();
  if (status === "success") {
    return {
      state: "success",
      amount: Number(json.data.amount) / 100, // kobo -> naira
      currency: String(json.data.currency ?? ""),
      txId: json.data.id != null ? String(json.data.id) : null,
    };
  }
  return status === "failed" ? { state: "failed" } : { state: "pending" };
}

// ─── Settle a payment (idempotent) ───────────────────────────────────────────

export type SettleResult = "success" | "failed" | "pending" | "unknown";

export async function settlePayment(reference: string): Promise<SettleResult> {
  const payment = await prisma.payment.findUnique({ where: { reference } });
  if (!payment || !isProviderKey(payment.provider)) return "unknown";
  if (payment.status === "SUCCESSFUL") return "success";

  const v = await verifyWithProvider(payment.provider, reference);

  if (v.state === "pending") return "pending";

  if (v.state === "failed") {
    await prisma.payment.updateMany({ where: { reference, status: "PENDING" }, data: { status: "FAILED" } });
    return "failed";
  }

  // Provider says paid. Make sure it is the right amount in the right currency.
  if (v.currency.toUpperCase() !== payment.currency.toUpperCase() || v.amount < payment.amount) {
    console.error("[PAYMENTS] Amount/currency mismatch, not activating:", {
      reference,
      expected: `${payment.amount} ${payment.currency}`,
      got: `${v.amount} ${v.currency}`,
    });
    await prisma.payment.updateMany({ where: { reference, status: "PENDING" }, data: { status: "FAILED" } });
    return "failed";
  }

  // Claim it. Only one caller (callback or webhook) can flip PENDING/FAILED -> SUCCESSFUL.
  const claimed = await prisma.payment.updateMany({
    where: { reference, status: { in: ["PENDING", "FAILED"] } },
    data: { status: "SUCCESSFUL", paidAt: new Date(), providerTxId: v.txId },
  });
  if (claimed.count === 0) return "success"; // already settled by the other path

  if (isPlanKey(payment.plan) && payment.plan !== "FREE") {
    await activatePlan(payment.userId, payment.plan);
  }
  return "success";
}

/** Give a user a plan for `days` days from now (or from their current end date if they renew early). */
export async function activatePlan(userId: string, plan: PlanKey, days: number = PLAN_PERIOD_DAYS) {
  const now = new Date();
  const existing = await prisma.subscription.findUnique({ where: { userId } });

  let base = now;
  if (
    existing &&
    existing.plan === plan &&
    existing.status === "ACTIVE" &&
    existing.currentPeriodEnd &&
    existing.currentPeriodEnd.getTime() > now.getTime()
  ) {
    base = existing.currentPeriodEnd; // renewing the same plan early: stack time
  }
  const end = new Date(base.getTime() + days * 24 * 60 * 60 * 1000);

  await prisma.subscription.upsert({
    where: { userId },
    create: { userId, plan, status: "ACTIVE", currentPeriodStart: now, currentPeriodEnd: end, gifted: false, giftedBy: null },
    update: { plan, status: "ACTIVE", currentPeriodStart: now, currentPeriodEnd: end, gifted: false, giftedBy: null },
  });
}

// ─── Webhook signature checks ────────────────────────────────────────────────

function safeEqual(a: string, b: string): boolean {
  const ab = Buffer.from(a);
  const bb = Buffer.from(b);
  return ab.length === bb.length && crypto.timingSafeEqual(ab, bb);
}

export function verifyFlutterwaveSignature(headerValue: string | null): boolean {
  const secret = process.env.FLUTTERWAVE_WEBHOOK_HASH;
  if (!secret || !headerValue) return false;
  return safeEqual(headerValue, secret);
}

export function verifyPaystackSignature(rawBody: string, headerValue: string | null): boolean {
  const secret = process.env.PAYSTACK_SECRET_KEY;
  if (!secret || !headerValue) return false;
  const expected = crypto.createHmac("sha512", secret).update(rawBody).digest("hex");
  return safeEqual(headerValue, expected);
}
