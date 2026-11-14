export const dynamic = "force-dynamic";
// src/app/(admin)/admin/events/page.tsx
// Every event on the platform, with its check-in QR code ready to download or
// print as a wall poster. Guests scan it and check themselves in on their phone.
import Link from "next/link";
import QRCode from "qrcode";
import { Download, Printer, Search, QrCode, ExternalLink } from "lucide-react";
import prisma from "@/lib/prisma";
import { appUrl } from "@/lib/site";
import { formatShortDate } from "@/lib/utils";

const PAGE_SIZE = 12;

export default async function AdminEventsPage({ searchParams }: { searchParams: { q?: string; page?: string; show?: string } }) {
  const q = (searchParams.q ?? "").trim();
  const show = searchParams.show === "past" ? "past" : searchParams.show === "all" ? "all" : "upcoming";
  const page = Math.max(1, Number.parseInt(searchParams.page ?? "1", 10) || 1);

  const startOfToday = new Date();
  startOfToday.setUTCHours(0, 0, 0, 0);

  const where = {
    ...(q
      ? {
          OR: [
            { name: { contains: q, mode: "insensitive" as const } },
            { venue: { contains: q, mode: "insensitive" as const } },
            { slug: { contains: q, mode: "insensitive" as const } },
            { user: { email: { contains: q, mode: "insensitive" as const } } },
          ],
        }
      : {}),
    ...(show === "upcoming" ? { date: { gte: startOfToday } } : show === "past" ? { date: { lt: startOfToday } } : {}),
  };

  try {
    const [total, events] = await Promise.all([
      prisma.event.count({ where }),
      prisma.event.findMany({
        where,
        orderBy: { date: show === "past" ? "desc" : "asc" },
        skip: (page - 1) * PAGE_SIZE,
        take: PAGE_SIZE,
        include: {
          user: { select: { email: true, name: true } },
          _count: { select: { guests: true, checkins: true } },
        },
      }),
    ]);

    const base = appUrl();
    const rows = await Promise.all(
      events.map(async (e) => {
        const url = `${base}/arrive/${e.slug}`;
        const qr = await QRCode.toDataURL(url, { margin: 2, width: 720, color: { dark: "#000000", light: "#FFFFFF" } });
        return { ...e, url, qr };
      })
    );

    const pages = Math.max(1, Math.ceil(total / PAGE_SIZE));
    const link = (params: Record<string, string>) =>
      `/admin/events?${new URLSearchParams({ ...(q ? { q } : {}), show, ...params })}`;

    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-stone-900">Events &amp; Check-in QR Codes</h1>
          <p className="mt-1 text-sm text-stone-500">
            Print an event&apos;s poster and put it on the wall at the entrance. Guests scan it with their phone, check in with their code
            (or phone number and email), and their photo and name appear on screen for the usher.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <form className="relative min-w-[240px] flex-1" action="/admin/events">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-stone-400" />
            <input
              name="q"
              defaultValue={q}
              placeholder="Search by event, venue or organiser email"
              className="w-full rounded-lg border border-stone-200 bg-white py-2.5 pl-9 pr-4 text-sm outline-none focus:border-[#0A2810] focus:ring-2 focus:ring-[#0A2810]/10"
            />
            <input type="hidden" name="show" value={show} />
          </form>
          <div className="flex gap-1 rounded-lg bg-stone-100 p-1 text-sm">
            {(["upcoming", "past", "all"] as const).map((s) => (
              <Link
                key={s}
                href={link({ show: s, page: "1" })}
                className={`rounded-md px-3 py-1.5 font-medium capitalize ${show === s ? "bg-white text-stone-900 shadow-sm" : "text-stone-600"}`}
              >
                {s}
              </Link>
            ))}
          </div>
        </div>

        {rows.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-stone-300 bg-white p-12 text-center text-stone-500">
            <QrCode className="mx-auto mb-3 h-8 w-8 text-stone-300" />
            No {show === "all" ? "" : show} events{q ? ` matching “${q}”` : ""}.
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {rows.map((e) => (
              <div key={e.id} className="flex flex-col rounded-2xl border border-stone-200 bg-white p-5">
                <div className="min-h-[72px]">
                  <p className="font-semibold leading-snug text-stone-900">{e.name}</p>
                  <p className="mt-1 text-xs text-stone-500">{formatShortDate(e.date)}{e.time ? ` · ${e.time}` : ""} · {e.venue}</p>
                  <p className="mt-0.5 truncate text-xs text-stone-400">{e.user?.email ?? "—"}</p>
                </div>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={e.qr} alt={`Check-in QR for ${e.name}`} className="mx-auto my-3 h-44 w-44" />
                <div className="mb-3 flex justify-center gap-4 text-xs text-stone-500">
                  <span><b className="text-stone-800">{e._count.checkins}</b> / {e._count.guests} checked in</span>
                  {!e.isPublished && <span className="rounded-full bg-amber-50 px-2 font-medium text-amber-700">Draft: QR won&apos;t work until published</span>}
                </div>
                <div className="mt-auto grid grid-cols-2 gap-2">
                  <Link
                    href={`/poster/${e.id}`}
                    target="_blank"
                    className="inline-flex items-center justify-center gap-1.5 rounded-lg bg-[#0A2810] px-3 py-2 text-xs font-semibold text-white hover:bg-[#0f3515]"
                  >
                    <Printer className="h-3.5 w-3.5" /> Print poster
                  </Link>
                  <a
                    href={e.qr}
                    download={`${e.slug}-checkin-qr.png`}
                    className="inline-flex items-center justify-center gap-1.5 rounded-lg border border-stone-200 px-3 py-2 text-xs font-semibold text-stone-700 hover:bg-stone-50"
                  >
                    <Download className="h-3.5 w-3.5" /> Download QR
                  </a>
                </div>
                <a href={e.url} target="_blank" className="mt-2 inline-flex items-center justify-center gap-1 text-xs text-stone-400 hover:text-stone-700">
                  Open check-in page <ExternalLink className="h-3 w-3" />
                </a>
              </div>
            ))}
          </div>
        )}

        {pages > 1 && (
          <div className="flex items-center justify-center gap-3 text-sm">
            {page > 1 && <Link href={link({ page: String(page - 1) })} className="rounded-lg border border-stone-200 bg-white px-3 py-1.5">Previous</Link>}
            <span className="text-stone-500">Page {page} of {pages}</span>
            {page < pages && <Link href={link({ page: String(page + 1) })} className="rounded-lg border border-stone-200 bg-white px-3 py-1.5">Next</Link>}
          </div>
        )}
      </div>
    );
  } catch (error) {
    console.error("[ADMIN][EVENTS]", error);
    return (
      <div className="rounded-2xl border border-amber-200 bg-amber-50 p-6 text-amber-900">
        Couldn&apos;t load events right now. Please refresh in a moment.
      </div>
    );
  }
}
