// src/app/api/checkin/route.ts
export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";


export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const slug = searchParams.get("slug");
    if (!slug) return NextResponse.json({ error: "Slug required" }, { status: 400 });

    const event = await prisma.event.findUnique({ where: { slug }, select: { id: true } });
    if (!event) return NextResponse.json({ error: "Event not found" }, { status: 404 });

    const [checkedIn, total] = await Promise.all([
      prisma.checkin.count({ where: { eventId: event.id } }),
      prisma.guest.count({ where: { eventId: event.id } }),
    ]);

    return NextResponse.json({ checkedIn, total });
  } catch (err) {
    console.error("/api/checkin GET error:", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const { slug, code } = await req.json();
    if (!slug || !code) return NextResponse.json({ status: "invalid", message: "Missing slug or code." });

    const event = await prisma.event.findUnique({ where: { slug }, select: { id: true } });
    if (!event) return NextResponse.json({ status: "invalid", message: "Event not found." });

    const rsvp = await prisma.rsvp.findUnique({
      where: { uniqueCode: code.trim().toUpperCase() },
      include: {
        guest: {
          include: {
            checkin: true,
            event: { select: { id: true } },
          },
        },
      },
    });

    if (!rsvp || rsvp.guest.event.id !== event.id) {
      return NextResponse.json({ status: "invalid", message: "This code is not valid for this event." });
    }

    if (rsvp.status === "DECLINED") {
      return NextResponse.json({ status: "declined", message: "This guest declined the invitation.", guest: { name: rsvp.guest.name } });
    }

    if (rsvp.status !== "CONFIRMED") {
      return NextResponse.json({ status: "invalid", message: "Guest has not confirmed their RSVP.", guest: { name: rsvp.guest.name } });
    }

    if (rsvp.guest.checkin) {
      return NextResponse.json({
        status: "already_checked_in",
        message: `Already checked in at ${rsvp.guest.checkin.checkedInAt.toLocaleTimeString()}.`,
        guest: { name: rsvp.guest.name, seatNumber: rsvp.seatNumber ?? undefined },
      });
    }

    await prisma.checkin.create({ data: { eventId: event.id, guestId: rsvp.guestId } });

    return NextResponse.json({
      status: "success",
      message: "Guest successfully checked in.",
      guest: { name: rsvp.guest.name, seatNumber: rsvp.seatNumber ?? undefined },
    });
  } catch (err) {
    console.error("/api/checkin POST error:", err);
    return NextResponse.json({ status: "invalid", message: "Server error." });
  }
}
