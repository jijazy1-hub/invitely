// src/app/api/events/[eventId]/design/route.ts
// GET – the event's card design + whether this user may use premium designs.
// PUT – save a design. Premium layouts need a paid plan unless the admin has made
//       premium designs free (Admin > Plans).
import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import prisma from "@/lib/prisma";
import { designForEvent, saveEventDesign } from "@/lib/event-design";
import { sanitizeDesign, isPremiumDesign } from "@/lib/card-design";
import { canUsePremiumDesigns } from "@/lib/access";
import { premiumDesignsAccess } from "@/lib/settings";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

type Ctx = { params: { eventId: string } };

async function load(eventId: string, userId: string) {
  return prisma.event.findFirst({ where: { id: eventId, userId }, include: { template: true } });
}

export async function GET(_req: Request, { params }: Ctx) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const event = await load(params.eventId, userId);
  if (!event) return NextResponse.json({ error: "Event not found" }, { status: 404 });

  const [premium, mode] = await Promise.all([canUsePremiumDesigns(userId), premiumDesignsAccess()]);
  return NextResponse.json({
    event: { id: event.id, name: event.name, eventType: event.eventType, slug: event.slug },
    design: designForEvent(event),
    access: { premium, mode },
  });
}

export async function PUT(req: Request, { params }: Ctx) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const event = await load(params.eventId, userId);
  if (!event) return NextResponse.json({ error: "Event not found" }, { status: 404 });

  const body = await req.json().catch(() => ({}));
  const design = sanitizeDesign(body?.design, event.eventType);

  if (isPremiumDesign(design) && !(await canUsePremiumDesigns(userId))) {
    return NextResponse.json(
      { error: "Premium card designs are available on the Basic and Premium plans.", upgrade: true },
      { status: 403 }
    );
  }

  try {
    const saved = await saveEventDesign(event, userId, design);
    return NextResponse.json({ design: saved });
  } catch (error) {
    console.error("[DESIGN][PUT]", error);
    return NextResponse.json({ error: "Couldn't save the design. Please try again." }, { status: 500 });
  }
}
