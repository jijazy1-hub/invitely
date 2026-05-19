"use client";
export const dynamic = "force-dynamic";
// src/app/(dashboard)/events/[eventId]/page.tsx
import { auth } from "@clerk/nextjs/server";
import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft, Users, QrCode, ExternalLink, Settings,
  BarChart2, Copy, Globe, EyeOff
} from "lucide-react";
import prisma from "@/lib/prisma";
import { formatDate } from "@/lib/utils";
import { EVENT_TYPE_ICONS, EVENT_TYPE_LABELS } from "@/types";
import { PublishToggle } from "@/components/events/publish-toggle";

type Ctx = { params: { eventId: string } };

export default async function EventDetailPage({ params }: Ctx) {
  const { userId } = await auth();
  if (!userId) redirect("/sign-in");

  const event = await prisma.event.findFirst({
    where: { id: params.eventId, userId },
    include: { _count: { select: { guests: true, checkins: true } } },
  });
  if (!event) notFound();

  const [confirmed, declined, pending] = await Promise.all([
    prisma.rsvp.count({ where: { status: "CONFIRMED", guest: { eventId: event.id } } }),
    prisma.rsvp.count({ where: { status: "DECLINED", guest: { eventId: event.id } } }),
    prisma.rsvp.count({ where: { status: "PENDING", guest: { eventId: event.id } } }),
  ]);

  const inviteUrl = `${process.env.NEXT_PUBLIC_APP_URL}/invite/${event.slug}`;
  const checkinUrl = `${process.env.NEXT_PUBLIC_APP_URL}/checkin/${event.slug}`;

  return (
    <div className="max-w-3xl space-y-6">
      {/* Header */}
      <div className="flex items-start gap-4">
        <Link href="/events" className="mt-1 text-stone-400 hover:text-stone-700">
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <div className="flex-1">
          <div className="flex items-center gap-3 mb-1">
            <span className="text-2xl">{EVENT_TYPE_ICONS[event.eventType]}</span>
            <h1 className="text-2xl font-bold text-stone-900">{event.name}</h1>
          </div>
          <p className="text-sm text-stone-500">
            {EVENT_TYPE_LABELS[event.eventType]} · {formatDate(event.date)}
            {event.time ? ` at ${event.time}` : ""}
          </p>
        </div>
        <PublishToggle eventId={event.id} isPublished={event.isPublished} />
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        {[
          { label: "Total Guests", value: event._count.guests, bg: "bg-stone-50" },
          { label: "Confirmed", value: confirmed, bg: "bg-emerald-50" },
          { label: "Declined", value: declined, bg: "bg-red-50" },
          { label: "Checked In", value: event._count.checkins, bg: "bg-blue-50" },
        ].map(({ label, value, bg }) => (
          <div key={label} className={`rounded-xl ${bg} p-4 text-center`}>
            <p className="text-2xl font-bold text-stone-900">{value}</p>
            <p className="text-xs text-stone-500 mt-1">{label}</p>
          </div>
        ))}
      </div>

      {/* Links */}
      <div className="rounded-xl border border-stone-200 bg-white p-6 space-y-4">
        <h2 className="font-semibold text-stone-900">Event Links</h2>

        <div className="space-y-3">
          <div className="flex items-center gap-3 rounded-lg bg-stone-50 border border-stone-200 px-4 py-3">
            <Globe className="h-4 w-4 text-stone-500 shrink-0" />
            <span className="text-sm font-mono text-stone-700 flex-1 truncate">{inviteUrl}</span>
            <div className="flex gap-2">
              <button
                onClick={() => {}}
                className="text-xs font-medium text-[#0A2810] hover:underline"
              >
                Copy
              </button>
              <Link href={`/invite/${event.slug}`} target="_blank">
                <ExternalLink className="h-4 w-4 text-stone-400 hover:text-stone-700" />
              </Link>
            </div>
          </div>

          <div className="flex items-center gap-3 rounded-lg bg-stone-50 border border-stone-200 px-4 py-3">
            <QrCode className="h-4 w-4 text-stone-500 shrink-0" />
            <span className="text-sm font-mono text-stone-700 flex-1 truncate">{checkinUrl}</span>
            <Link href={`/checkin/${event.slug}`} target="_blank">
              <ExternalLink className="h-4 w-4 text-stone-400 hover:text-stone-700" />
            </Link>
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
            { label: "Date", value: formatDate(event.date) },
            { label: "Time", value: event.time ?? "—" },
            { label: "Venue", value: event.venue },
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
