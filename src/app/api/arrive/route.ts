// src/app/api/arrive/route.ts
// Guest self check-in. The check-in QR poster on the wall opens /arrive/<slug>;
// the guest checks in with EITHER their check-in code (from the card/email) OR
// the phone number they were invited with plus the email they used to RSVP.
// The response includes their photo and name so an usher can see it's them.
// Only works around the event date.
import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import prisma from "@/lib/prisma";
import { normalizePhone } from "@/utils/phone";
import { storedPhoto } from "@/lib/guest-photo";
import { rateLimit, clientIp, MINUTE } from "@/lib/rate-limit";

export const dynamic = "force-dynamic";

const HOUR = 60 * MINUTE;

const rsvpInclude = { guest: { include: { checkin: true } } } as const;

export async function POST(req: Request) {
  try {
    const limited = rateLimit([{ key: `arrive:${clientIp(req)}`, limit: 15, windowMs: 10 * MINUTE }]);
    if (limited) return limited;

    const body = await req.json().catch(() => ({}));
    const slug = typeof body.slug === "string" ? body.slug : "";
    const code = typeof body.code === "string" ? body.code.trim().toUpperCase().replace(/\s+/g, "") : "";
    const phone = typeof body.phone === "string" ? normalizePhone(body.phone) : "";
    const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";

    if (!slug || (!code && !(phone && email))) {
      return NextResponse.json(
        { status: "invalid", message: "Enter your check-in code, or your phone number and email." },
        { status: 400 }
      );
    }

    const event = await prisma.event.findFirst({
      where: { slug, isPublished: true },
      select: { id: true, date: true },
    });
    if (!event) return NextResponse.json({ status: "invalid", message: "Event not found." }, { status: 404 });

    // Event dates are stored as the day (midnight UTC). Open from the evening before until two days after.
    const now = Date.now();
    if (now < event.date.getTime() - 12 * HOUR) {
      return NextResponse.json({ status: "too_early", message: "Self check-in opens on the day of the event. See you then!" });
    }
    if (now > event.date.getTime() + 48 * HOUR) {
      return NextResponse.json({ status: "closed", message: "Check-in for this event has closed." });
    }

    let rsvp: Prisma.RsvpGetPayload<{ include: typeof rsvpInclude }> | null = null;

    if (code) {
      rsvp = await prisma.rsvp.findUnique({ where: { uniqueCode: code }, include: rsvpInclude });
      if (!rsvp || rsvp.guest.eventId !== event.id) {
        return NextResponse.json({ status: "invalid", message: "That code isn't valid for this event. Check your card or confirmation email." });
      }
    } else {
      // Phone + email: extra per-phone limit so this can't be used to guess emails.
      const limitedPhone = rateLimit([{ key: `arrive:phone:${slug}:${phone}`, limit: 6, windowMs: 60 * MINUTE }]);
      if (limitedPhone) return limitedPhone;
      const guest = await prisma.guest.findUnique({
        where: { eventId_phone: { eventId: event.id, phone } },
        select: { id: true },
      });
      const found = guest ? await prisma.rsvp.findUnique({ where: { guestId: guest.id }, include: rsvpInclude }) : null;
      if (!found || (found.email ?? "").trim().toLowerCase() !== email) {
        return NextResponse.json({
          status: "invalid",
          message: "We couldn't match that phone number and email. Use the email you gave when you confirmed, or ask an usher.",
        });
      }
      rsvp = found;
    }

    if (rsvp.status !== "CONFIRMED") {
      return NextResponse.json({ status: "invalid", message: "This invitation hasn't been confirmed. Please see an usher." });
    }

    const guest = { name: rsvp.guest.name, seatNumber: rsvp.seatNumber ?? null, photo: storedPhoto(rsvp) };
    if (rsvp.guest.checkin) {
      return NextResponse.json({ status: "already_checked_in", message: "You're already checked in. Welcome!", guest });
    }

    try {
      await prisma.checkin.create({ data: { eventId: event.id, guestId: rsvp.guestId, checkedInBy: "self" } });
    } catch (e) {
      if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") {
        return NextResponse.json({ status: "already_checked_in", message: "You're already checked in. Welcome!", guest });
      }
      throw e;
    }

    return NextResponse.json({ status: "success", message: "You're checked in. Welcome!", guest });
  } catch (err) {
    console.error("/api/arrive error:", err);
    return NextResponse.json({ status: "invalid", message: "Something went wrong. Please try again or see an usher." }, { status: 500 });
  }
}
