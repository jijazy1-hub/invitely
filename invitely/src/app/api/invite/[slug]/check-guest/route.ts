// src/app/api/invite/[slug]/check-guest/route.ts
// Migrated from /api/check-guest (Airtable) → Prisma + PostgreSQL
import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { normalizePhone } from "@/utils/phone";
import { generateUniqueCode } from "@/utils/codes";

type Ctx = { params: { slug: string } };

export async function POST(req: Request, { params }: Ctx) {
  try {
    const { phone } = await req.json();
    if (!phone) return NextResponse.json({ error: "Phone number is required." }, { status: 400 });

    const normalized = normalizePhone(String(phone));

    // Find the event
    const event = await prisma.event.findUnique({
      where: { slug: params.slug, isPublished: true },
      select: { id: true },
    });
    if (!event) return NextResponse.json({ error: "Event not found." }, { status: 404 });

    // Find the guest
    const guest = await prisma.guest.findUnique({
      where: { eventId_phone: { eventId: event.id, phone: normalized } },
      include: { rsvp: { select: { status: true, uniqueCode: true, seatNumber: true } } },
    });

    if (!guest || !guest.invited) {
      return NextResponse.json({ error: "You are not on the guest list for this event." }, { status: 404 });
    }

    // If confirmed but no unique code (legacy/edge case), generate one now
    if (guest.rsvp?.status === "CONFIRMED" && !guest.rsvp?.uniqueCode) {
      const uniqueCode = generateUniqueCode();
      const maxSeat = await prisma.rsvp.aggregate({
        where: { status: "CONFIRMED", guest: { eventId: event.id } },
        _max: { seatNumber: true },
      });
      const seatNumber = (maxSeat._max.seatNumber ?? 0) + 1;

      await prisma.rsvp.update({
        where: { guestId: guest.id },
        data: { uniqueCode, seatNumber },
      });
    }

    // Return public guest data (no sensitive fields)
    const freshGuest = await prisma.guest.findUnique({
      where: { id: guest.id },
      select: {
        id: true, name: true, phone: true,
        rsvp: { select: { status: true, uniqueCode: true, seatNumber: true } },
      },
    });

    return NextResponse.json({ guest: freshGuest });
  } catch (err) {
    console.error("/api/invite/[slug]/check-guest error:", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
