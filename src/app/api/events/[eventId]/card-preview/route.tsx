// src/app/api/events/[eventId]/card-preview/route.tsx
// Organiser-only previews of the admission card with a sample guest.
//   GET  – the event's saved design
//   POST – an unsaved design from the Card Designer ({ design })
// Premium designs are watermarked "PREVIEW" for users without access.
import { auth } from "@clerk/nextjs/server";
import prisma from "@/lib/prisma";
import { renderCard } from "@/lib/card";
import { designForEvent } from "@/lib/event-design";
import { sanitizeDesign, isPremiumDesign, type CardDesign } from "@/lib/card-design";
import { canUsePremiumDesigns } from "@/lib/access";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 30;

type Ctx = { params: { eventId: string } };

async function render(eventId: string, userId: string, designInput: unknown | undefined) {
  const event = await prisma.event.findFirst({ where: { id: eventId, userId }, include: { template: true } });
  if (!event) return Response.json({ error: "Not found" }, { status: 404 });

  const design: CardDesign = designInput === undefined ? designForEvent(event) : sanitizeDesign(designInput, event.eventType);
  const locked = isPremiumDesign(design) && !(await canUsePremiumDesigns(userId));

  try {
    const image = await renderCard(
      {
        eventName: event.name,
        eventType: event.eventType,
        date: event.date,
        time: event.time,
        venue: event.venue,
        dressCode: event.dressCode,
        primaryColor: event.primaryColor,
        secondaryColor: event.secondaryColor,
        accentColor: event.accentColor,
        guestName: "Sample Guest",
        seatNumber: 1,
        code: "INV-SAMPLE01",
      },
      { design, watermark: locked ? "Premium design · Upgrade to use" : null }
    );
    return new Response(await image.arrayBuffer(), {
      headers: { "Content-Type": "image/png", "Cache-Control": "no-store", "X-Design-Locked": locked ? "1" : "0" },
    });
  } catch (error) {
    console.error("[card-preview]", error);
    return Response.json({ error: "Could not render the preview. Try a different photo." }, { status: 500 });
  }
}

export async function GET(_req: Request, { params }: Ctx) {
  const { userId } = await auth();
  if (!userId) return Response.json({ error: "Unauthorized" }, { status: 401 });
  return render(params.eventId, userId, undefined);
}

export async function POST(req: Request, { params }: Ctx) {
  const { userId } = await auth();
  if (!userId) return Response.json({ error: "Unauthorized" }, { status: 401 });
  const body = await req.json().catch(() => ({}));
  return render(params.eventId, userId, body?.design ?? {});
}
