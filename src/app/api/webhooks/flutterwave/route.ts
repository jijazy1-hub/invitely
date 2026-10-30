// src/app/api/webhooks/flutterwave/route.ts
import { NextResponse } from "next/server";
import { settlePayment, verifyFlutterwaveSignature } from "@/lib/payments";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  if (!verifyFlutterwaveSignature(req.headers.get("verif-hash"))) {
    return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
  }

  const payload = await req.json().catch(() => null);
  const reference = payload?.data?.tx_ref;
  if (typeof reference === "string") {
    try {
      await settlePayment(reference);
    } catch (error) {
      console.error("[WEBHOOK][FLUTTERWAVE] settle failed:", error);
      return NextResponse.json({ error: "Processing failed" }, { status: 500 }); // provider will retry
    }
  }
  return NextResponse.json({ received: true });
}
