// src/app/api/invite/[slug]/rsvp/route.ts
// Migrated from /api/rsvp (Airtable) → Prisma + PostgreSQL
import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export const dynamic = "force-dynamic";
import { normalizePhone } from "@/utils/phone";
import { generateUniqueCode } from "@/utils/codes";

type Ctx = { params: { slug: string } };
const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function POST(req: Request, { params }: Ctx) {
  try {
    const body = await req.json();
    const phone = normalizePhone(String(body.phone || "").trim());
    const email = String(body.email || "").trim();
    const attendance = String(body.attendance || "").trim();

    if (!phone || !email || !attendance) {
      return NextResponse.json({ error: "Phone, email, and attendance are required." }, { status: 400 });
    }
    if (!emailRegex.test(email)) {
      return NextResponse.json({ error: "Please enter a valid email address." }, { status: 400 });
    }

    // Find event
    const event = await prisma.event.findFirst({
      where: { slug: params.slug, isPublished: true },
      select: { id: true },
    });
    if (!event) return NextResponse.json({ error: "Event not found." }, { status: 404 });

    // Find guest
    const guest = await prisma.guest.findUnique({
      where: { eventId_phone: { eventId: event.id, phone } },
      include: { rsvp: true },
    });
    if (!guest) return NextResponse.json({ error: "Guest not found." }, { status: 404 });

    // Already responded
    if (guest.rsvp && (guest.rsvp.status === "CONFIRMED" || guest.rsvp.status === "DECLINED")) {
      return NextResponse.json({ error: "You have already submitted an RSVP.", guest: formatGuest(guest) }, { status: 409 });
    }

    const willAttend = attendance === "Yes";

    if (!willAttend) {
      // Declined
      const rsvp = await prisma.rsvp.upsert({
        where: { guestId: guest.id },
        update: { status: "DECLINED", email, attendance: false, rsvpedAt: new Date() },
        create: { guestId: guest.id, status: "DECLINED", email, attendance: false, rsvpedAt: new Date() },
      });

      return NextResponse.json({
        guest: { ...formatGuest(guest), rsvp: { status: rsvp.status, uniqueCode: null, seatNumber: null } },
        message: "Sorry you can't make it! Thank you for letting us know.",
      });
    }

    // Attending — assign seat + generate unique code
    const maxSeat = await prisma.rsvp.aggregate({
      where: { status: "CONFIRMED", guest: { eventId: event.id } },
      _max: { seatNumber: true },
    });
    const seatNumber = (maxSeat._max.seatNumber ?? 0) + 1;
    const uniqueCode = generateUniqueCode();

    const rsvp = await prisma.rsvp.upsert({
      where: { guestId: guest.id },
      update: {
        status: "CONFIRMED",
        email,
        attendance: true,
        seatNumber,
        uniqueCode,
        rsvpedAt: new Date(),
      },
      create: {
        guestId: guest.id,
        status: "CONFIRMED",
        email,
        attendance: true,
        seatNumber,
        uniqueCode,
        rsvpedAt: new Date(),
      },
    });

    // Update guest email
    await prisma.guest.update({ where: { id: guest.id }, data: { email } });

    return NextResponse.json({
      guest: { ...formatGuest(guest), rsvp: { status: rsvp.status, uniqueCode: rsvp.uniqueCode, seatNumber: rsvp.seatNumber } },
      message: "RSVP confirmed! Your admission card is ready to download.",
    });
  } catch (err) {
    console.error("/api/invite/[slug]/rsvp error:", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

function formatGuest(guest: any) {
  return { id: guest.id, name: guest.name, phone: guest.phone };
}
