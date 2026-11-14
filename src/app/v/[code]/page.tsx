// src/app/v/[code]/page.tsx
// Opens when anyone scans the QR on an admission card with a phone camera.
// Shows at a glance whether the person is invited: big photo, full name, seat,
// and a coloured banner (green invited / amber already in / red not valid).
// Door staff phones (staff link opened once), the organiser and admins also get
// an "Admit & check in" button.
import type { Metadata } from "next";
import { cookies, headers } from "next/headers";
import { auth } from "@clerk/nextjs/server";
import prisma from "@/lib/prisma";
import { storedPhoto } from "@/lib/guest-photo";
import { isValidStaffKey, staffCookieName } from "@/lib/checkin-auth";
import { getAdminContext } from "@/lib/admin";
import { hit, MINUTE } from "@/lib/rate-limit";
import { extractCode } from "@/utils/scan";
import { AdmitButton } from "./admit-button";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Verify guest", robots: { index: false, follow: false } };

type Status = "invited" | "checked_in" | "declined" | "pending" | "invalid" | "limited";

const BANNERS: Record<Status, { bg: string; title: string; note: string }> = {
  invited: { bg: "#059669", title: "✓ INVITED GUEST", note: "On the guest list and confirmed." },
  checked_in: { bg: "#D97706", title: "ALREADY CHECKED IN", note: "This card has already been used to enter." },
  declined: { bg: "#DC2626", title: "✗ DECLINED", note: "This guest said they would not attend." },
  pending: { bg: "#DC2626", title: "✗ NOT CONFIRMED", note: "Invited, but they never confirmed. Check with the organiser." },
  invalid: { bg: "#DC2626", title: "✗ NOT ON GUEST LIST", note: "This code doesn't match any invitation. Do not admit." },
  limited: { bg: "#57534E", title: "TOO MANY SCANS", note: "Please wait a minute and scan again." },
};

function initials(name: string) {
  return name.split(/\s+/).filter(Boolean).slice(0, 2).map((p) => p[0]!.toUpperCase()).join("");
}

export default async function VerifyPage({ params }: { params: { code: string } }) {
  const code = extractCode(decodeURIComponent(params.code));
  const h = headers();
  const ip = (h.get("x-forwarded-for") ?? "").split(",")[0].trim() || "unknown";

  let status: Status = "invalid";
  let data: null | {
    eventId: string; slug: string; eventName: string; when: string; venue: string;
    name: string; seat: number | null; photo: string | null; checkedInAt: Date | null; ownerId: string;
  } = null;

  if (!hit(`verify:${ip}`, 40, 5 * MINUTE)) {
    status = "limited";
  } else if (/^[A-Z0-9-]{4,40}$/.test(code)) {
    const rsvp = await prisma.rsvp.findUnique({
      where: { uniqueCode: code },
      include: { guest: { include: { checkin: true, event: true } } },
    });
    if (rsvp) {
      const ev = rsvp.guest.event;
      const date = ev.date.toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short", year: "numeric", timeZone: "UTC" });
      data = {
        eventId: ev.id, slug: ev.slug, eventName: ev.name, when: ev.time ? `${date} · ${ev.time}` : date, venue: ev.venue,
        name: rsvp.guest.name, seat: rsvp.seatNumber, photo: storedPhoto(rsvp), checkedInAt: rsvp.guest.checkin?.checkedInAt ?? null,
        ownerId: ev.userId,
      };
      status = rsvp.status === "DECLINED" ? "declined" : rsvp.status !== "CONFIRMED" ? "pending" : rsvp.guest.checkin ? "checked_in" : "invited";
    }
  }

  // Is this phone allowed to check people in?
  let canAdmit = false;
  if (data) {
    const cookieKey = cookies().get(staffCookieName(data.eventId))?.value;
    if (isValidStaffKey(data.eventId, cookieKey)) canAdmit = true;
    else {
      const { userId } = await auth().catch(() => ({ userId: null as string | null }));
      if (userId && (userId === data.ownerId || (await getAdminContext().catch(() => null)))) canAdmit = true;
    }
  }

  const banner = BANNERS[status];
  const checkedTime = data?.checkedInAt?.toLocaleTimeString("en-NG", { hour: "numeric", minute: "2-digit", timeZone: "Africa/Lagos" });

  return (
    <main className="min-h-screen flex flex-col" style={{ background: banner.bg }}>
      <div className="px-5 pt-8 pb-6 text-center text-white">
        <p className="text-3xl font-extrabold tracking-wide sm:text-4xl">{banner.title}</p>
        <p className="mt-1 text-sm text-white/85">
          {status === "checked_in" && checkedTime ? `Checked in at ${checkedTime}.` : banner.note}
        </p>
      </div>

      <div className="flex-1 rounded-t-3xl bg-white px-5 pb-10 pt-8">
        <div className="mx-auto max-w-md text-center">
          {data ? (
            <>
              <div className="flex justify-center">
                {data.photo ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={data.photo} alt={data.name} className="h-60 w-60 rounded-3xl object-cover shadow-lg" style={{ border: `6px solid ${banner.bg}` }} />
                ) : (
                  <div className="flex h-60 w-60 flex-col items-center justify-center rounded-3xl bg-stone-100 text-stone-500 shadow-inner" style={{ border: `6px solid ${banner.bg}` }}>
                    <span className="text-7xl font-bold text-stone-400">{initials(data.name) || "?"}</span>
                    <span className="mt-2 text-xs">No photo on file: check ID</span>
                  </div>
                )}
              </div>
              <p className="mt-5 text-xs font-bold uppercase tracking-[0.25em] text-stone-400">Full name</p>
              <p className="mt-1 text-3xl font-bold leading-tight text-stone-900">{data.name}</p>
              {data.seat ? (
                <p className="mt-3 inline-block rounded-full bg-stone-900 px-6 py-2 text-lg font-bold text-white">Seat {data.seat}</p>
              ) : null}

              <div className="mt-6 rounded-2xl bg-stone-50 p-4 text-left text-sm text-stone-600">
                <p className="font-semibold text-stone-900">{data.eventName}</p>
                <p>{data.when}</p>
                <p>{data.venue}</p>
                <p className="mt-2 font-mono text-xs text-stone-400">{code}</p>
              </div>

              {canAdmit && status === "invited" ? (
                <AdmitButton slug={data.slug} code={code} />
              ) : canAdmit ? null : (
                <p className="mt-6 text-xs leading-relaxed text-stone-400">
                  Door staff: open the staff scanner link from the organiser once on this phone, and you&apos;ll be able to check guests in straight from this screen.
                </p>
              )}
              {status === "invited" && <p className="mt-4 text-xs text-stone-500">Compare the photo with the person&apos;s face before admitting.</p>}
            </>
          ) : (
            <div className="py-10">
              <p className="text-6xl">⛔</p>
              <p className="mt-4 text-lg font-semibold text-stone-900">{status === "limited" ? "Slow down" : "No invitation found"}</p>
              <p className="mt-2 text-sm text-stone-500">{status === "limited" ? banner.note : `Code “${code || "—"}” isn't valid. Ask the person for their confirmation email, or check with the organiser.`}</p>
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
