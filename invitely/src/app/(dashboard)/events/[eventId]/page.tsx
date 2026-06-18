
import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import { Globe, ExternalLink, QrCode, Users, BarChart2 } from "lucide-react";
import prisma from "@/lib/prisma";
import { formatDate } from "@/lib/utils";
import { PublishToggle } from "@/components/events/publish-toggle";
import CopyButton from "@/components/events/copy-button";

export const dynamic = "force-dynamic";

export default async function EventPage({ params }: { params: { eventId: string } }) {
  let userId: string | null = null;
  try {
    userId = (await auth()).userId ?? null;
  } catch (error) {
    console.error("[EVENT] auth failed:", error);
  }

  let event: Awaited<ReturnType<typeof prisma.event.findFirst>> | null = null;
  let confirmed = 0;
  let loadError: string | null = null;

  if (!userId) {
    loadError = "We couldn't identify your account right now. Please refresh or sign in again.";
  }

  if (userId) {
    try {
      event = await prisma.event.findFirst({
        where: { id: params.eventId, userId },
        include: {
          _count: { select: { guests: true } },
        },
      });

      if (event) {
        confirmed = await prisma.rsvp.count({
          where: { guest: { eventId: event.id }, status: "CONFIRMED" },
        });
      }
    } catch (error) {
      console.error("[EVENT] Failed to load event details:", error);
      loadError = "We couldn't load this event right now. The event data source is unavailable or incomplete.";
    }
  }

  if (!event && !loadError) redirect("/events");

  if (loadError || !event) {
    return (
      <div className="p-6 max-w-3xl mx-auto space-y-6">
        <div className="rounded-2xl border border-amber-200 bg-amber-50 p-6 text-amber-900">
          <h1 className="text-2xl font-bold mb-2">Event temporarily unavailable</h1>
          <p className="text-sm">{loadError ?? "This event could not be loaded right now."}</p>
        </div>
        <Link href="/events" className="inline-flex items-center gap-2 rounded-lg bg-[#0A2810] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#0f3515] transition-colors">
          Back to events
        </Link>
      </div>
    );
  }

  const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? "https://invitely-nine.vercel.app";
  const inviteUrl = `${baseUrl}/invite/${event.slug}`;
  const checkinUrl = `${baseUrl}/checkin/${event.slug}`;

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-8">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-stone-900">{event.name}</h1>
          <p className="text-stone-500 text-sm mt-1">{event.eventType} · {event.isPublished ? "Published" : "Draft"}</p>
        </div>
        <PublishToggle eventId={event.id} isPublished={event.isPublished} />
      </div>

      {/* URLs */}
      <div className="rounded-xl border border-stone-200 bg-white p-6 space-y-4">
        <h2 className="font-semibold text-stone-900">Share Links</h2>
        <div className="space-y-3">
          <div className="flex items-center gap-3 rounded-lg bg-stone-50 border border-stone-200 px-4 py-3">
            <Globe className="h-4 w-4 text-stone-500 shrink-0" />
            <span className="text-sm font-mono text-stone-700 flex-1 truncate">{inviteUrl}</span>
            <div className="flex gap-2 items-center">
              <CopyButton text={inviteUrl} />
              <Link href={`/invite/${event.slug}`} target="_blank">
                <ExternalLink className="h-4 w-4 text-stone-400 hover:text-stone-700" />
              </Link>
            </div>
          </div>
          <div className="flex items-center gap-3 rounded-lg bg-stone-50 border border-stone-200 px-4 py-3">
            <QrCode className="h-4 w-4 text-stone-500 shrink-0" />
            <span className="text-sm font-mono text-stone-700 flex-1 truncate">{checkinUrl}</span>
            <div className="flex gap-2 items-center">
              <CopyButton text={checkinUrl} />
              <Link href={`/checkin/${event.slug}`} target="_blank">
                <ExternalLink className="h-4 w-4 text-stone-400 hover:text-stone-700" />
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* Quick actions */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
        {[
          { href: `/events/${event.id}/guests`, icon: Users, label: "Manage Guests", desc: `${event._count.guests} guests` },
          { href: `/events/${event.id}/analytics`, icon: BarChart2, label: "Analytics", desc: `${confirmed} confirmed` },
          { href: `/checkin/${event.slug}`, icon: QrCode, label: "Check-In Scanner", desc: "Open on tablet", external: true },
        ].map(({ href, icon: Icon, label, desc, external }) => (
          <Link
            key={href}
            href={href}
            target={external ? "_blank" : undefined}
            className="rounded-xl border border-stone-200 bg-white p-5 hover:shadow-sm hover:border-stone-300 transition-all"
          >
            <Icon className="h-5 w-5 text-[#0A2810] mb-3" />
            <p className="font-semibold text-stone-900 text-sm">{label}</p>
            <p className="text-xs text-stone-500 mt-1">{desc}</p>
          </Link>
        ))}
      </div>

      {/* Event info */}
      <div className="rounded-xl border border-stone-200 bg-white p-6 space-y-4">
        <h2 className="font-semibold text-stone-900">Event Details</h2>
        <dl className="grid grid-cols-2 gap-4 text-sm">
          {[
            { label: "Date", value: event.date ? formatDate(event.date) : "—" },
            { label: "Time", value: event.time ?? "—" },
            { label: "Venue", value: event.venue ?? "—" },
            { label: "Dress Code", value: event.dressCode ?? "—" },
            { label: "Organizer", value: event.organizerName ?? "—" },
            { label: "Slug", value: event.slug },
          ].map(({ label, value }) => (
            <div key={label}>
              <dt className="text-xs text-stone-500 font-medium">{label}</dt>
              <dd className="text-stone-800 font-medium mt-0.5">{value}</dd>
            </div>
          ))}
        </dl>
      </div>
    </div>
  );
}