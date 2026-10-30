// src/app/api/webhooks/paystack/route.ts
import { NextResponse } from "next/server";
import { settlePayment, verifyPaystackSignature } from "@/lib/payments";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const raw = await req.text();
  if (!verifyPaystackSignature(raw, req.headers.get("x-paystack-signature"))) {
    return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
  }

  let payload: any = null;
  try {
    payload = JSON.parse(raw);
  } catch {
    return NextResponse.json({ error: "Bad body" }, { status: 400 });
  }

  const reference = payload?.data?.reference;
  if (payload?.event === "charge.success" && typeof reference === "string") {
    try {
      await settlePayment(reference);
    } catch (error) {
      console.error("[WEBHOOK][PAYSTACK] settle failed:", error);
      return NextResponse.json({ error: "Processing failed" }, { status: 500 });
    }
  }
  return NextResponse.json({ received: true });
}
