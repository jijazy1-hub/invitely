// src/app/api/checkin/route.ts
// Check-in scanner API. Only the organiser, an admin, or someone holding the
// event's staff link may use it (see src/lib/checkin-auth.ts).
export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import prisma from "@/lib/prisma";
import { authorizeCheckin } from "@/lib/checkin-auth";

export async function GET(req: Request) {
  try {
    const slug = new URL(req.url).searchParams.get("slug");
    if (!slug) return NextResponse.json({ error: "Slug required" }, { status: 400 });

    const access = await authorizeCheckin(req, slug);
    if (!access.ok) return NextResponse.json({ error: access.error }, { status: access.status });

    const [checkedIn, total] = await Promise.all([
      prisma.checkin.count({ where: { eventId: access.eventId } }),
      prisma.guest.count({ where: { eventId: access.eventId } }),
    ]);

    return NextResponse.json({ checkedIn, total });
  } catch (err) {
    console.error("/api/checkin GET error:", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const slug = typeof body.slug === "string" ? body.slug : "";
    const code = typeof body.code === "string" ? body.code.trim().toUpperCase() : "";
    if (!slug || !code) return NextResponse.json({ status: "invalid", message: "Missing slug or code." }, { status: 400 });

    const access = await authorizeCheckin(req, slug);
    if (!access.ok) {
      return NextResponse.json({ status: "unauthorized", message: access.error }, { status: access.status });
    }

    const rsvp = await prisma.rsvp.findUnique({
      where: { uniqueCode: code },
      include: { guest: { include: { checkin: true } } },
    });

    if (!rsvp || rsvp.guest.eventId !== access.eventId) {
      return NextResponse.json({ status: "invalid", message: "This code is not valid for this event." });
    }

    if (rsvp.status === "DECLINED") {
      return NextResponse.json({ status: "declined", message: "This guest declined the invitation.", guest: { name: rsvp.guest.name } });
    }

    if (rsvp.status !== "CONFIRMED") {
      return NextResponse.json({ status: "invalid", message: "Guest has not confirmed their RSVP.", guest: { name: rsvp.guest.name } });
    }

    const guestInfo = { name: rsvp.guest.name, seatNumber: rsvp.seatNumber ?? undefined };
    const already = (at: Date) =>
      NextResponse.json({
        status: "already_checked_in",
        message: `Already checked in at ${at.toLocaleTimeString("en-NG", { timeZone: "Africa/Lagos" })}.`,
        guest: guestInfo,
      });

    if (rsvp.guest.checkin) return already(rsvp.guest.checkin.checkedInAt);

    try {
      await prisma.checkin.create({
        data: { eventId: access.eventId, guestId: rsvp.guestId, checkedInBy: access.checkedInBy },
      });
    } catch (e) {
      // Two scanners scanned the same card at the same moment: the second one loses.
      if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") {
        const existing = await prisma.checkin.findUnique({ where: { guestId: rsvp.guestId } });
        return already(existing?.checkedInAt ?? new Date());
      }
      throw e;
    }

    return NextResponse.json({ status: "success", message: "Guest successfully checked in.", guest: guestInfo });
  } catch (err) {
    console.error("/api/checkin POST error:", err);
    return NextResponse.json({ status: "invalid", message: "Server error." }, { status: 500 });
  }
}
