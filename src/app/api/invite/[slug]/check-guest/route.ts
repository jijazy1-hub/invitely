// src/app/api/invite/[slug]/check-guest/route.ts
// Step 1 of the RSVP page: is this phone number on the guest list?
//
// This deliberately does NOT return the admission code or seat. Knowing someone's
// phone number must not be enough to get their card. Guests who have already
// confirmed get their card back through /my-card, which also needs the email they
// gave when they RSVP'd.
import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { normalizePhone } from "@/utils/phone";
import { rateLimit, clientIp, MINUTE } from "@/lib/rate-limit";

export const dynamic = "force-dynamic";

type Ctx = { params: { slug: string } };

export async function POST(req: Request, { params }: Ctx) {
  try {
    const limited = rateLimit([{ key: `check-guest:${clientIp(req)}`, limit: 20, windowMs: 10 * MINUTE }]);
    if (limited) return limited;

    const { phone } = await req.json().catch(() => ({}));
    if (!phone) return NextResponse.json({ error: "Phone number is required." }, { status: 400 });

    const normalized = normalizePhone(String(phone));

    const event = await prisma.event.findFirst({
      where: { slug: params.slug, isPublished: true },
      select: { id: true },
    });
    if (!event) return NextResponse.json({ error: "Event not found." }, { status: 404 });

    const guest = await prisma.guest.findUnique({
      where: { eventId_phone: { eventId: event.id, phone: normalized } },
      select: { id: true, name: true, phone: true, invited: true, rsvp: { select: { status: true } } },
    });

    if (!guest || !guest.invited) {
      return NextResponse.json({ error: "You are not on the guest list for this event." }, { status: 404 });
    }

    return NextResponse.json({
      guest: {
        id: guest.id,
        name: guest.name,
        phone: guest.phone,
        rsvp: guest.rsvp ? { status: guest.rsvp.status, uniqueCode: null, seatNumber: null } : null,
      },
    });
  } catch (err) {
    console.error("/api/invite/[slug]/check-guest error:", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
