// src/app/api/billing/callback/route.ts
// The provider sends the customer's browser back here after paying.
// Flutterwave: ?status=...&tx_ref=...   Paystack: ?reference=...&trxref=...
// We ignore the status in the URL and re-verify with the provider.
import { NextResponse } from "next/server";
import { settlePayment } from "@/lib/payments";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const reference = url.searchParams.get("tx_ref") ?? url.searchParams.get("reference") ?? url.searchParams.get("trxref");

  let outcome: string = "unknown";
  if (reference) {
    try {
      outcome = await settlePayment(reference);
    } catch (error) {
      console.error("[BILLING][CALLBACK] settle failed:", error);
      outcome = "pending";
    }
  }
  return NextResponse.redirect(new URL(`/billing?payment=${outcome}`, url.origin));
}
