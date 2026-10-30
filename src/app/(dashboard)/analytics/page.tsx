export const dynamic = "force-dynamic";
// src/app/(dashboard)/analytics/page.tsx
// Overview of every event's numbers, linking to each event's detailed analytics.
import { auth } from "@clerk/nextjs/server";
import Link from "next/link";
import { BarChart2, Users, CheckCircle, QrCode, ArrowRight, Plus } from "lucide-react";
import prisma from "@/lib/prisma";
import { formatShortDate } from "@/lib/utils";

export default async function AnalyticsOverviewPage() {
  let userId: string | null = null;
  try {
    userId = (await auth()).userId ?? null;
  } catch (error) {
    console.error("[ANALYTICS] auth failed:", error);
  }

  let loadError: string | null = null;
  const rows: {
    id: string;
    name: string;
    date: Date;
    guests: number;
    confirmed: number;
    declined: number;
    checkedIn: number;
  }[] = [];

  if (!userId) {
    loadError = "We couldn't identify your account right now. Please refresh or sign in again.";
  } else {
    try {
      const events = await prisma.event.findMany({
        where: { userId },
        orderBy: { date: "desc" },
        include: { _count: { select: { guests: true } } },
      });

      const stats = await Promise.all(
        events.map(async (e) => {
          const [confirmed, declined, checkedIn] = await Promise.all([
            prisma.rsvp.count({ where: { status: "CONFIRMED", guest: { eventId: e.id } } }),
            prisma.rsvp.count({ where: { status: "DECLINED", guest: { eventId: e.id } } }),
            prisma.checkin.count({ where: { eventId: e.id } }),
          ]);
          return {
            id: e.id,
            name: e.name,
            date: e.date,
            guests: e._count.guests,
            confirmed,
            declined,
            checkedIn,
          };
        })
      );
      rows.push(...stats);
    } catch (error) {
      console.error("[ANALYTICS] Failed to load overview:", error);
      loadError = "We couldn't load your analytics right now. Please try again shortly.";
    }
  }

  const totals = rows.reduce(
    (t, r) => ({
      guests: t.guests + r.guests,
      confirmed: t.confirmed + r.confirmed,
      checkedIn: t.checkedIn + r.checkedIn,
    }),
    { guests: 0, confirmed: 0, checkedIn: 0 }
  );

  const cards = [
    { label: "Total Guests", value: totals.guests, icon: Users },
    { label: "Confirmed RSVPs", value: totals.confirmed, icon: CheckCircle },
    { label: "Checked In", value: totals.checkedIn, icon: QrCode },
  ];

  return (
    <div className="space-y-8 max-w-5xl">
      <div>
        <h1 className="text-2xl font-bold text-stone-900">Analytics</h1>
        <p className="text-sm text-stone-500 mt-1">How your events are performing. Open an event for the full breakdown.</p>
      </div>

      {loadError && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">{loadError}</div>
      )}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        {cards.map(({ label, value, icon: Icon }) => (
          <div key={label} className="rounded-xl border border-stone-200 bg-white p-5">
            <Icon className="h-5 w-5 text-[#0A2810] opacity-70 mb-3" />
            <p className="text-3xl font-bold text-stone-900">{value}</p>
            <p className="text-xs font-medium text-stone-500 mt-1">{label}</p>
          </div>
        ))}
      </div>

      <div className="rounded-xl border border-stone-200 bg-white overflow-hidden">
        <div className="px-6 py-4 border-b border-stone-100">
          <h2 className="font-semibold text-stone-900">Your events</h2>
        </div>

        {rows.length === 0 && !loadError ? (
          <div className="py-16 text-center">
            <BarChart2 className="h-10 w-10 text-stone-300 mx-auto mb-3" />
            <p className="text-stone-500 text-sm">No events yet, so there's nothing to analyse.</p>
            <Link href="/events/new" className="mt-3 inline-flex items-center gap-1.5 text-sm font-medium text-[#0A2810] hover:underline">
              <Plus className="h-4 w-4" /> Create your first event
            </Link>
          </div>
        ) : (
          <div className="divide-y divide-stone-100">
            {rows.map((r) => (
              <Link
                key={r.id}
                href={`/events/${r.id}/analytics`}
                className="flex items-center justify-between gap-4 px-6 py-4 hover:bg-stone-50 transition-colors"
              >
                <div className="min-w-0">
                  <p className="font-medium text-stone-900 text-sm truncate">{r.name}</p>
                  <p className="text-xs text-stone-500 mt-0.5">{formatShortDate(r.date)}</p>
                </div>
                <div className="flex items-center gap-6 text-right shrink-0">
                  <div>
                    <p className="text-sm font-semibold text-stone-800">{r.guests}</p>
                    <p className="text-xs text-stone-500">guests</p>
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-emerald-700">{r.confirmed}</p>
                    <p className="text-xs text-stone-500">confirmed</p>
                  </div>
                  <div className="hidden sm:block">
                    <p className="text-sm font-semibold text-stone-800">{r.checkedIn}</p>
                    <p className="text-xs text-stone-500">checked in</p>
                  </div>
                  <ArrowRight className="h-4 w-4 text-stone-400" />
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
