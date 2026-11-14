// src/app/api/invite/[slug]/generate-card/route.tsx
// Returns the guest's admission card as a PNG. The design lives in src/lib/card.tsx.
import prisma from "@/lib/prisma";
import { renderCard } from "@/lib/card";
import { designForEvent } from "@/lib/event-design";
import { saveGuestPhoto, storedPhoto, isPhotoDataUrl } from "@/lib/guest-photo";
import { rateLimit, clientIp, MINUTE } from "@/lib/rate-limit";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

type Ctx = { params: { slug: string } };

export async function POST(req: Request, { params }: Ctx) {
  try {
    const limited = rateLimit([{ key: `card:${clientIp(req)}`, limit: 30, windowMs: 10 * MINUTE }]);
    if (limited) return limited;

    const body = await req.json().catch(() => ({}));
    const code = String(body.code ?? "").trim().toUpperCase();
    // The browser shrinks the photo to a small JPEG first (see the invite page), so this stays well under Vercel's 4.5 MB limit.
    const newPhoto = isPhotoDataUrl(body.imageBase64) ? body.imageBase64 : null;

    if (!code) return Response.json({ error: "Code required" }, { status: 400 });

    const rsvp = await prisma.rsvp.findUnique({
      where: { uniqueCode: code },
      include: { guest: { include: { event: { include: { template: true } } } } },
    });

    // The code must belong to THIS event's invite link.
    if (!rsvp || rsvp.status !== "CONFIRMED" || rsvp.guest.event.slug !== params.slug) {
      return Response.json({ error: "Invalid or unconfirmed invitation code" }, { status: 404 });
    }

    const { guest } = rsvp;
    const { event } = guest;

    // A new photo replaces the saved one (shown at check-in); no photo means use the saved one.
    if (newPhoto) await saveGuestPhoto(guest.id, newPhoto);
    const photo = newPhoto ?? storedPhoto(rsvp);

    const image = await renderCard({
      eventName: event.name,
      eventType: event.eventType,
      date: event.date,
      time: event.time,
      venue: event.venue,
      dressCode: event.dressCode,
      primaryColor: event.primaryColor,
      secondaryColor: event.secondaryColor,
      accentColor: event.accentColor,
      guestName: guest.name,
      seatNumber: rsvp.seatNumber,
      code,
      photo,
    }, { design: designForEvent(event) });

    const png = await image.arrayBuffer();
    return new Response(png, {
      headers: {
        "Content-Type": "image/png",
        "Cache-Control": "no-store",
        "Content-Disposition": `attachment; filename="admission-card.png"`,
      },
    });
  } catch (err) {
    console.error("[generate-card] Error:", err);
    return Response.json({ error: "We couldn't create your card. Please try again, or try without a photo." }, { status: 500 });
  }
}
