
export const dynamic = "force-dynamic";
// src/app/(dashboard)/events/page.tsx
import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import { Plus, Calendar, Users, ExternalLink } from "lucide-react";
import prisma from "@/lib/prisma";
import { formatShortDate } from "@/lib/utils";
import { EVENT_TYPE_ICONS, EVENT_TYPE_LABELS } from "@/types";

export default async function EventsPage() {
  const { userId } = await auth();
  if (!userId) redirect("/sign-in");

  const events = await prisma.event.findMany({
    where: { userId },
    orderBy: { id: "desc" },
    include: {
      _count: { select: { guests: true } },
    },
  });

  // RSVP stats per event
  const rsvpStats = await Promise.all(
    events.map(async (e) => {
      const [confirmed, declined, pending] = await Promise.all([
        prisma.rsvp.count({ where: { status: "CONFIRMED", guest: { eventId: e.id } } }),
        prisma.rsvp.count({ where: { status: "DECLINED", guest: { eventId: e.id } } }),
        prisma.rsvp.count({ where: { status: "PENDING", guest: { eventId: e.id } } }),
      ]);
      return { eventId: e.id, confirmed, declined, pending };
    })
  );
  const statsMap = Object.fromEntries(rsvpStats.map((s) => [s.eventId, s]));

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-stone-900">Events</h1>
          <p className="text-sm text-stone-500 mt-1">{events.length} event{events.length !== 1 ? "s" : ""} total</p>
        </div>
        <Link
          href="/events/new"
          className="inline-flex items-center gap-2 rounded-lg bg-[#0A2810] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#0f3515] transition-colors"
        >
          <Plus className="h-4 w-4" />
          New Event
        </Link>
      </div>

      {events.length === 0 ? (
        <div className="rounded-xl border-2 border-dashed border-stone-200 bg-white py-20 text-center">
          <Calendar className="h-12 w-12 text-stone-300 mx-auto mb-4" />
          <h3 className="font-semibold text-stone-700">No events yet</h3>
          <p className="text-sm text-stone-500 mt-2 mb-6">Create your first invitation event to get started.</p>
          <Link
            href="/events/new"
            className="inline-flex items-center gap-2 rounded-lg bg-[#0A2810] px-5 py-2.5 text-sm font-semibold text-white hover:bg-[#0f3515] transition-colors"
          >
            <Plus className="h-4 w-4" />
            Create Event
          </Link>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {events.map((event) => {
            const stats = statsMap[event.id];
            const confirmedRate = event._count.guests > 0
              ? Math.round((stats.confirmed / event._count.guests) * 100)
              : 0;

            return (
              <div key={event.id} className="rounded-xl border border-stone-200 bg-white overflow-hidden hover:shadow-md transition-shadow">
                {/* Cover/color band */}
                <div
                  className="h-2"
                  style={{ backgroundColor: event.primaryColor }}
                />

                <div className="p-5">
                  <div className="flex items-start justify-between mb-3">
                    <div className="h-10 w-10 rounded-lg bg-stone-100 flex items-center justify-center text-xl">
                      {EVENT_TYPE_ICONS[event.eventType]}
                    </div>
                    <span className={`text-xs font-medium px-2 py-1 rounded-full ${
                      event.isPublished ? "bg-emerald-100 text-emerald-700" : "bg-stone-100 text-stone-600"
                    }`}>
                      {event.isPublished ? "Published" : "Draft"}
                    </span>
                  </div>

                  <h3 className="font-semibold text-stone-900 mb-1">{event.name}</h3>
                  <p className="text-xs text-stone-500 mb-4">
                    {EVENT_TYPE_LABELS[event.eventType]} · {formatShortDate(event.date)}
                  </p>

                  {/* Stats row */}
                  <div className="grid grid-cols-3 gap-2 mb-4">
                    <div className="text-center py-2 bg-stone-50 rounded-lg">
                      <p className="text-lg font-bold text-stone-900">{event._count.guests}</p>
                      <p className="text-xs text-stone-500">Guests</p>
                    </div>
                    <div className="text-center py-2 bg-emerald-50 rounded-lg">
                      <p className="text-lg font-bold text-emerald-700">{stats.confirmed}</p>
                      <p className="text-xs text-emerald-600">Confirmed</p>
                    </div>
                    <div className="text-center py-2 bg-amber-50 rounded-lg">
                      <p className="text-lg font-bold text-amber-700">{confirmedRate}%</p>
                      <p className="text-xs text-amber-600">Rate</p>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex gap-2">
                    <Link
                      href={`/events/${event.id}`}
                      className="flex-1 text-center text-sm font-medium py-2 rounded-lg bg-[#0A2810] text-white hover:bg-[#0f3515] transition-colors"
                    >
                      Manage
                    </Link>
                    {event.isPublished && (
                      <Link
                        href={`/invite/${event.slug}`}
                        target="_blank"
                        className="flex items-center justify-center gap-1 px-3 py-2 rounded-lg border border-stone-200 text-stone-600 hover:bg-stone-50 transition-colors"
                      >
                        <ExternalLink className="h-4 w-4" />
                      </Link>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
