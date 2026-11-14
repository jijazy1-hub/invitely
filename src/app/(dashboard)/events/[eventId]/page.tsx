
import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import { Globe, ExternalLink, QrCode, Users, BarChart2, Download, Printer, Smartphone, ScanLine, Image as ImageIcon, Sparkles } from "lucide-react";
import QRCode from "qrcode";
import type { Prisma } from "@prisma/client";
import prisma from "@/lib/prisma";
import { formatDate } from "@/lib/utils";
import { PublishToggle } from "@/components/events/publish-toggle";
import CopyButton from "@/components/events/copy-button";
import { staffKeyFor } from "@/lib/checkin-auth";
import { appUrl } from "@/lib/site";

export const dynamic = "force-dynamic";

type EventWithGuestCount = Prisma.EventGetPayload<{
  include: {
    _count: { select: { guests: true } };
  };
}>;

export default async function EventPage({ params }: { params: { eventId: string } }) {
  let userId: string | null = null;
  try {
    userId = (await auth()).userId ?? null;
  } catch (error) {
    console.error("[EVENT] auth failed:", error);
  }

  let event: EventWithGuestCount | null = null;
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
      loadError = "We couldn't load this event right now. Please try again shortly.";
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

  const baseUrl = appUrl();
  const inviteUrl = `${baseUrl}/invite/${event.slug}`;
  // Staff link: lets door staff check guests in without an account. Only the
  // organiser sees it here; anyone holding it can check guests in for this event.
  const staffKey = staffKeyFor(event.id);
  const checkinUrl = staffKey
    ? `${baseUrl}/checkin/${event.slug}?key=${staffKey}`
    : `${baseUrl}/checkin/${event.slug}`;

  // QR codes for mobile check-in. Black on white so every phone camera reads them.
  const arriveUrl = `${baseUrl}/arrive/${event.slug}`;
  const qrOpts = { margin: 2, width: 720, color: { dark: "#000000", light: "#FFFFFF" } };
  const [arriveQr, staffQr] = await Promise.all([
    QRCode.toDataURL(arriveUrl, qrOpts),
    QRCode.toDataURL(checkinUrl, qrOpts),
  ]);
  const fileBase = event.slug.replace(/[^a-z0-9-]/gi, "");

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
          <p className="text-xs text-stone-500">
            The check-in link above is for your door staff. Anyone who has it can check guests in, so only share it with people working the door.
            You can also open the scanner yourself while signed in.
          </p>
        </div>
      </div>

      {/* Mobile check-in QR codes */}
      <div className="rounded-xl border border-stone-200 bg-white p-6 space-y-5">
        <div>
          <h2 className="font-semibold text-stone-900">Check-in QR Codes</h2>
          <p className="text-sm text-stone-500 mt-1">Print the guest QR and place it at the entrance. Guests scan it with their phone and check themselves in with the code on their card or email.</p>
        </div>
        <div className="grid gap-5 sm:grid-cols-2">
          <div className="rounded-xl border border-stone-200 p-5 text-center">
            <div className="flex items-center justify-center gap-2 text-sm font-semibold text-stone-900"><Smartphone className="h-4 w-4" /> Guest self check-in</div>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={arriveQr} alt="Guest check-in QR code" className="mx-auto mt-3 h-48 w-48" />
            <p className="text-xs text-stone-500 mt-2">Opens on the event day. Safe to display publicly.</p>
            <div className="mt-3 flex flex-wrap justify-center gap-2">
              <a href={arriveQr} download={`${fileBase}-guest-checkin-qr.png`} className="inline-flex items-center gap-1.5 rounded-lg border border-stone-200 px-3 py-2 text-xs font-semibold text-stone-700 hover:bg-stone-50">
                <Download className="h-3.5 w-3.5" /> Download
              </a>
              <Link href={`/poster/${event.id}`} target="_blank" className="inline-flex items-center gap-1.5 rounded-lg bg-[#0A2810] px-3 py-2 text-xs font-semibold text-white hover:bg-[#0f3515]">
                <Printer className="h-3.5 w-3.5" /> Print poster
              </Link>
            </div>
          </div>
          <div className="rounded-xl border border-stone-200 p-5 text-center">
            <div className="flex items-center justify-center gap-2 text-sm font-semibold text-stone-900"><ScanLine className="h-4 w-4" /> Staff scanner</div>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={staffQr} alt="Staff scanner QR code" className="mx-auto mt-3 h-48 w-48" />
            <p className="text-xs text-stone-500 mt-2">Door staff scan this to open the scanner on their phone, then scan guests&apos; cards with the camera. <b>Keep it private.</b></p>
            <div className="mt-3 flex justify-center">
              <a href={staffQr} download={`${fileBase}-staff-scanner-qr.png`} className="inline-flex items-center gap-1.5 rounded-lg border border-stone-200 px-3 py-2 text-xs font-semibold text-stone-700 hover:bg-stone-50">
                <Download className="h-3.5 w-3.5" /> Download
              </a>
            </div>
          </div>
        </div>
      </div>

      {/* Card design */}
      <div className="rounded-xl border border-stone-200 bg-white p-6 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="flex -space-x-1">
            {[event.primaryColor, event.secondaryColor, event.accentColor].map((c, i) => (
              <span key={i} className="h-8 w-8 rounded-full border-2 border-white shadow-sm" style={{ background: c }} />
            ))}
          </div>
          <div>
            <h2 className="font-semibold text-stone-900">Admission Card Design</h2>
            <p className="text-sm text-stone-500">Choose a layout, colours, fonts and a background photo in the Card Designer.</p>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <a href={`/api/events/${event.id}/card-preview`} target="_blank" className="inline-flex items-center gap-2 rounded-lg border border-stone-200 px-4 py-2.5 text-sm font-semibold text-stone-700 hover:bg-stone-50">
            <ImageIcon className="h-4 w-4" /> Preview card
          </a>
          <Link href={`/events/${event.id}/design`} className="inline-flex items-center gap-2 rounded-lg bg-[#0A2810] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#0f3515]">
            <Sparkles className="h-4 w-4" /> Design card
          </Link>
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