// src/app/api/events/[eventId]/route.ts
import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import prisma from "@/lib/prisma";

export const dynamic = "force-dynamic";

type Ctx = { params: { eventId: string } };

// GET /api/events/[eventId]
export async function GET(_req: Request, { params }: Ctx) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const event = await prisma.event.findFirst({
    where: { id: params.eventId, userId },
    include: { _count: { select: { guests: true, checkins: true } } },
  });
  if (!event) return NextResponse.json({ error: "Not found" }, { status: 404 });

  return NextResponse.json(event);
}

// PATCH /api/events/[eventId]
export async function PATCH(req: Request, { params }: Ctx) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const event = await prisma.event.findFirst({ where: { id: params.eventId, userId } });
  if (!event) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const body = await req.json();
  const allowedFields = [
    "name", "date", "time", "venue", "description", "dressCode",
    "rsvpDeadline", "organizerName", "organizerPhone", "organizerEmail",
    "primaryColor", "secondaryColor", "accentColor", "requirePhoto",
    "isPublished", "logoUrl", "coverUrl",
  ];

  const updates: Record<string, any> = {};
  for (const key of allowedFields) {
    if (key in body) {
      if (key === "date" || key === "rsvpDeadline") {
        updates[key] = body[key] ? new Date(body[key]) : null;
      } else {
        updates[key] = body[key];
      }
    }
  }

  const updated = await prisma.event.update({
    where: { id: params.eventId },
    data: updates,
  });

  return NextResponse.json(updated);
}

// DELETE /api/events/[eventId]
export async function DELETE(_req: Request, { params }: Ctx) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const event = await prisma.event.findFirst({ where: { id: params.eventId, userId } });
  if (!event) return NextResponse.json({ error: "Not found" }, { status: 404 });

  await prisma.event.delete({ where: { id: params.eventId } });
  return NextResponse.json({ success: true });
}
