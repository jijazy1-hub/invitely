// src/app/api/guests/route.ts
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import prisma from "@/lib/prisma";

export async function GET(_req: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const guests = await prisma.guest.findMany({
      where: { event: { userId } },
      include: {
        event: { select: { id: true, name: true, slug: true } },
        rsvp: { select: { status: true } },
        checkin: { select: { id: true } },
      },
      orderBy: { importedAt: "desc" },
      take: 500,
    });

    const rows = guests.map((g) => ({
      id: g.id,
      name: g.name,
      phone: g.phone,
      eventId: g.event.id,
      eventName: g.event.name,
      eventSlug: g.event.slug,
      rsvpStatus: g.rsvp?.status ?? null,
      checkedIn: g.checkin !== null,
      importedAt: g.importedAt.toISOString(),
    }));

    return NextResponse.json({ guests: rows });
  } catch (err) {
    console.error("[GUESTS] Error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
