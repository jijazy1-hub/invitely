// src/app/api/events/[eventId]/card-preview/route.tsx
// Organiser-only: shows what guests' admission cards look like with the event's
// current design, using a sample guest.
import { auth } from "@clerk/nextjs/server";
import prisma from "@/lib/prisma";
import { renderCard } from "@/lib/card";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(_req: Request, { params }: { params: { eventId: string } }) {
  const { userId } = await auth();
  if (!userId) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const event = await prisma.event.findFirst({ where: { id: params.eventId, userId } });
  if (!event) return Response.json({ error: "Not found" }, { status: 404 });

  try {
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
      guestName: "Sample Guest",
      seatNumber: 1,
      code: "INV-SAMPLE01",
    });
    return new Response(await image.arrayBuffer(), {
      headers: { "Content-Type": "image/png", "Cache-Control": "no-store" },
    });
  } catch (error) {
    console.error("[card-preview]", error);
    return Response.json({ error: "Could not render the preview." }, { status: 500 });
  }
}
