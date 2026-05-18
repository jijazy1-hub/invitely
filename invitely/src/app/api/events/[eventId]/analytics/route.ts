// src/app/api/events/[eventId]/analytics/route.ts
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import prisma from "@/lib/prisma";

export async function GET(
  _req: NextRequest,
  { params }: { params: { eventId: string } }
) {
  try {
    const { userId } = await auth();
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });

    const event = await prisma.event.findFirst({
      where: { id: params.eventId, userId: user.id },
    });
    if (!event) return NextResponse.json({ error: "Event not found" }, { status: 404 });

    // Aggregate guest + RSVP stats
    const [totalGuests, rsvpStats, checkinCount, guests] = await Promise.all([
      prisma.guest.count({ where: { eventId: event.id } }),
      prisma.rsvp.groupBy({
        by: ["status"],
        where: { guest: { eventId: event.id } },
        _count: { status: true },
      }),
      prisma.checkin.count({ where: { eventId: event.id } }),
      prisma.guest.findMany({
        where: { eventId: event.id },
        include: { rsvp: true, checkIns: true },
        orderBy: { createdAt: "asc" },
      }),
    ]);

    const confirmed = rsvpStats.find((r) => r.status === "CONFIRMED")?._count.status ?? 0;
    const declined = rsvpStats.find((r) => r.status === "DECLINED")?._count.status ?? 0;
    const pending = totalGuests - confirmed - declined;

    // Build daily RSVP trend (last 14 days)
    const now = new Date();
    const twoWeeksAgo = new Date(now);
    twoWeeksAgo.setDate(now.getDate() - 13);

    const rsvpsByDay: Record<string, { confirmed: number; declined: number }> = {};
    for (let i = 0; i < 14; i++) {
      const d = new Date(twoWeeksAgo);
      d.setDate(twoWeeksAgo.getDate() + i);
      const key = d.toISOString().slice(0, 10);
      rsvpsByDay[key] = { confirmed: 0, declined: 0 };
    }

    for (const guest of guests) {
      if (!guest.rsvp || !guest.rsvp.createdAt) continue;
      const key = guest.rsvp.createdAt.toISOString().slice(0, 10);
      if (!(key in rsvpsByDay)) continue;
      if (guest.rsvp.status === "CONFIRMED") rsvpsByDay[key].confirmed++;
      if (guest.rsvp.status === "DECLINED") rsvpsByDay[key].declined++;
    }

    const trend = Object.entries(rsvpsByDay).map(([date, counts]) => ({
      date,
      ...counts,
    }));

    // Import source breakdown
    const importSourceCounts: Record<string, number> = {};
    for (const g of guests) {
      const src = g.importedVia ?? "MANUAL";
      importSourceCounts[src] = (importSourceCounts[src] ?? 0) + 1;
    }
    const importSources = Object.entries(importSourceCounts).map(([source, count]) => ({
      source,
      count,
    }));

    return NextResponse.json({
      summary: {
        totalGuests,
        confirmed,
        declined,
        pending,
        checkedIn: checkinCount,
        rsvpRate: totalGuests > 0 ? Math.round((confirmed / totalGuests) * 100) : 0,
        checkinRate: confirmed > 0 ? Math.round((checkinCount / confirmed) * 100) : 0,
      },
      trend,
      importSources,
    });
  } catch (err) {
    console.error("[ANALYTICS] Error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
