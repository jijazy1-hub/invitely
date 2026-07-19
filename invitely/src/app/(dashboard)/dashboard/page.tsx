export const dynamic = "force-dynamic";
// src/app/(dashboard)/dashboard/page.tsx
import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import { CalendarDays, Users, CheckSquare, TrendingUp, Plus, ArrowRight } from "lucide-react";
import prisma from "@/lib/prisma";
import { listDevEvents } from "@/lib/dev-store";
import { formatShortDate } from "@/lib/utils";
import { EVENT_TYPE_ICONS, EVENT_TYPE_LABELS } from "@/types";

async function getDashboardData(userId: string) {
  try {
    const [events, totalGuests, totalConfirmed, totalCheckins] = await Promise.all([
      prisma.event.findMany({
        where: { userId },
        orderBy: { id: "desc" },
        take: 5,
        include: {
          _count: { select: { guests: true } },
        },
      }),
      prisma.guest.count({ where: { event: { userId } } }),
      prisma.rsvp.count({ where: { status: "CONFIRMED", guest: { event: { userId } } } }),
      prisma.checkin.count({ where: { event: { userId } } }),
    ]);

    return { events, totalGuests, totalConfirmed, totalCheckins, source: "database" as const };
  } catch (error) {
    console.error("[DASHBOARD] DB unavailable, using local fallback:", error);
    const fallbackEvents = await listDevEvents(userId);
    const totalGuests = fallbackEvents.reduce((sum, event) => sum + (event._count?.guests ?? 0), 0);
    const totalConfirmed = 0;
    const totalCheckins = 0;

    return {
      events: fallbackEvents.slice(0, 5),
      totalGuests,
      totalConfirmed,
      totalCheckins,
      source: "local" as const,
    };
  }
}

export default async function DashboardPage() {
  let userId: string | null = null;
  try {
    userId = (await auth()).userId ?? null;
  } catch (error) {
    console.error("[DASHBOARD] auth failed:", error);
  }

  let events: Awaited<ReturnType<typeof getDashboardData>>["events"] = [];
  let totalGuests = 0;
  let totalConfirmed = 0;
  let totalCheckins = 0;
  let loadError: string | null = null;
  let dataSource: "database" | "local" | null = null;

  try {
    if (!userId) {
      loadError = "We couldn't identify your account right now. Please refresh or sign in again.";
    } else {
      const dashboardData = await getDashboardData(userId);
      ({ events, totalGuests, totalConfirmed, totalCheckins } = dashboardData);
      dataSource = dashboardData.source;
    }
  } catch (error) {
    console.error("[DASHBOARD] Failed to load data:", error);
    loadError = "We couldn't load your event data right now. Your account is signed in, but the dashboard data source is unavailable.";
  }

  const stats = [
    { label: "Total Events", value: events.length, icon: CalendarDays, color: "bg-[#0A2810]", textColor: "text-white" },
    { label: "Total Guests", value: totalGuests, icon: Users, color: "bg-amber-50", textColor: "text-amber-900" },
    { label: "Confirmed RSVPs", value: totalConfirmed, icon: CheckSquare, color: "bg-emerald-50", textColor: "text-emerald-900" },
    { label: "Checked In", value: totalCheckins, icon: TrendingUp, color: "bg-blue-50", textColor: "text-blue-900" },
  ];

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-stone-900">Dashboard</h1>
          <p className="text-sm text-stone-500 mt-1">Welcome back. Here's what's happening.</p>
        </div>
        <Link
          href="/events/new"
          className="inline-flex items-center gap-2 rounded-lg bg-[#0A2810] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#0f3515] transition-colors"
        >
          <Plus className="h-4 w-4" />
          New Event
        </Link>
      </div>

      {loadError && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          {loadError}
        </div>
      )}
      {dataSource === "local" && (
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-900">
          Showing locally saved dashboard data while the live database is unavailable.
        </div>
      )}

      {/* Stats grid */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {stats.map(({ label, value, icon: Icon, color, textColor }) => (
          <div key={label} className={`rounded-xl p-5 ${color}`}>
            <Icon className={`h-5 w-5 ${textColor} opacity-70 mb-3`} />
            <p className={`text-3xl font-bold ${textColor}`}>{value}</p>
            <p className={`text-xs font-medium ${textColor} opacity-70 mt-1`}>{label}</p>
          </div>
        ))}
      </div>

      {/* Recent events */}
      <div className="rounded-xl border border-stone-200 bg-white overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-stone-100">
          <h2 className="font-semibold text-stone-900">Recent Events</h2>
          <Link href="/events" className="text-sm text-[#0A2810] font-medium hover:underline flex items-center gap-1">
            View all <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>

        {events.length === 0 ? (
          <div className="py-16 text-center">
            <CalendarDays className="h-10 w-10 text-stone-300 mx-auto mb-3" />
            <p className="text-stone-500 text-sm">No events yet.</p>
            <Link href="/events/new" className="mt-3 inline-flex items-center gap-1.5 text-sm font-medium text-[#0A2810] hover:underline">
              <Plus className="h-4 w-4" /> Create your first event
            </Link>
          </div>
        ) : (
          <div className="divide-y divide-stone-100">
            {events.map((event) => (
              <Link
                key={event.id}
                href={`/events/${event.id}`}
                className="flex items-center justify-between px-6 py-4 hover:bg-stone-50 transition-colors"
              >
                <div className="flex items-center gap-4">
                  <div className="h-10 w-10 rounded-lg bg-stone-100 flex items-center justify-center text-lg">
                    {EVENT_TYPE_ICONS[event.eventType]}
                  </div>
                  <div>
                    <p className="font-medium text-stone-900 text-sm">{event.name}</p>
                    <p className="text-xs text-stone-500 mt-0.5">
                      {EVENT_TYPE_LABELS[event.eventType]} · {formatShortDate(event.date)}
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-sm font-semibold text-stone-800">{event._count.guests}</p>
                  <p className="text-xs text-stone-500">guests</p>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
