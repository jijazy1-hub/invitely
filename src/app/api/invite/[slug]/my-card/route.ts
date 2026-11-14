// src/app/api/invite/[slug]/my-card/route.ts
// For guests who already confirmed and come back to download their card again.
// They must give BOTH the phone number on the guest list AND the email they used
// when they RSVP'd. Wrong answers get the same generic message, and attempts are
// limited per IP and per phone number.
import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { normalizePhone } from "@/utils/phone";
import { ensureCodeAndSeat } from "@/lib/rsvp";
import { rateLimit, clientIp, MINUTE } from "@/lib/rate-limit";

export const dynamic = "force-dynamic";

type Ctx = { params: { slug: string } };

const NO_MATCH = "That email doesn't match the one used for this RSVP. Use the same email you entered when you confirmed.";

export async function POST(req: Request, { params }: Ctx) {
  try {
    const body = await req.json().catch(() => ({}));
    const phone = normalizePhone(String(body.phone ?? "").trim());
    const email = String(body.email ?? "").trim().toLowerCase();
    if (!phone || !email) {
      return NextResponse.json({ error: "Phone number and email are required." }, { status: 400 });
    }

    const limited = rateLimit([
      { key: `my-card:ip:${clientIp(req)}`, limit: 10, windowMs: 10 * MINUTE },
      { key: `my-card:phone:${params.slug}:${phone}`, limit: 8, windowMs: 60 * MINUTE },
    ]);
    if (limited) return limited;

    const event = await prisma.event.findFirst({
      where: { slug: params.slug, isPublished: true },
      select: { id: true },
    });
    if (!event) return NextResponse.json({ error: "Event not found." }, { status: 404 });

    const guest = await prisma.guest.findUnique({
      where: { eventId_phone: { eventId: event.id, phone } },
      select: { id: true, rsvp: { select: { status: true, email: true } } },
    });

    const rsvpEmail = guest?.rsvp?.email?.trim().toLowerCase();
    if (!guest || guest.rsvp?.status !== "CONFIRMED" || !rsvpEmail || rsvpEmail !== email) {
      return NextResponse.json({ error: NO_MATCH }, { status: 404 });
    }

    const card = await ensureCodeAndSeat(event.id, guest.id);
    if (!card) return NextResponse.json({ error: NO_MATCH }, { status: 404 });

    return NextResponse.json({ rsvp: { status: "CONFIRMED", uniqueCode: card.uniqueCode, seatNumber: card.seatNumber } });
  } catch (err) {
    console.error("/api/invite/[slug]/my-card error:", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
