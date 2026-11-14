// src/app/api/invite/[slug]/rsvp/route.ts
// Records a guest's RSVP. Seat numbers and codes are assigned under a per-event
// lock (src/lib/rsvp.ts), so simultaneous RSVPs can't get the same seat.
import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { normalizePhone } from "@/utils/phone";
import { recordRsvp } from "@/lib/rsvp";
import { sendConfirmationEmail } from "@/lib/confirmation-email";
import { emailConfigured } from "@/lib/email";
import { saveGuestPhoto, isPhotoDataUrl } from "@/lib/guest-photo";
import { rateLimit, clientIp, MINUTE } from "@/lib/rate-limit";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
// Rendering the card for the email attachment takes a second or two.
export const maxDuration = 30;

type Ctx = { params: { slug: string } };
const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function POST(req: Request, { params }: Ctx) {
  try {
    const limited = rateLimit([{ key: `rsvp:${clientIp(req)}`, limit: 20, windowMs: 10 * MINUTE }]);
    if (limited) return limited;

    const body = await req.json().catch(() => ({}));
    const phone = normalizePhone(String(body.phone || "").trim());
    const email = String(body.email || "").trim();
    const attendance = String(body.attendance || "").trim();
    // Optional photo (already shrunk by the browser) so the emailed card matches the downloaded one.
    const photo = isPhotoDataUrl(body.photo) ? body.photo : null;

    if (!phone || !email || !attendance) {
      return NextResponse.json({ error: "Phone, email, and attendance are required." }, { status: 400 });
    }
    if (!emailRegex.test(email)) {
      return NextResponse.json({ error: "Please enter a valid email address." }, { status: 400 });
    }

    const event = await prisma.event.findFirst({
      where: { slug: params.slug, isPublished: true },
      select: { id: true },
    });
    if (!event) return NextResponse.json({ error: "Event not found." }, { status: 404 });

    const guest = await prisma.guest.findUnique({
      where: { eventId_phone: { eventId: event.id, phone } },
      select: { id: true, name: true, phone: true, invited: true },
    });
    if (!guest || !guest.invited) return NextResponse.json({ error: "Guest not found." }, { status: 404 });

    const willAttend = attendance === "Yes";
    const result = await recordRsvp(event.id, guest.id, email, willAttend);

    if (result.alreadyResponded) {
      return NextResponse.json(
        { error: "You have already submitted an RSVP.", guest: { id: guest.id, name: guest.name, phone: guest.phone } },
        { status: 409 }
      );
    }

    // Keep the photo so it can be shown at check-in and on re-downloaded cards.
    if (willAttend && photo) await saveGuestPhoto(guest.id, photo);

    let emailSent = false;
    if (willAttend && emailConfigured()) {
      try {
        emailSent = await sendConfirmationEmail(guest.id, photo);
      } catch (error) {
        console.error("[RSVP] confirmation email failed:", error);
      }
    }

    return NextResponse.json({
      guest: { id: guest.id, name: guest.name, phone: guest.phone, rsvp: result.rsvp },
      emailSent,
      message: willAttend
        ? emailSent
          ? `RSVP confirmed! We've emailed your card and check-in code to ${email}. You can also download it below.`
          : "RSVP confirmed! Your admission card is ready to download."
        : "Sorry you can't make it! Thank you for letting us know.",
    });
  } catch (err) {
    console.error("/api/invite/[slug]/rsvp error:", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
