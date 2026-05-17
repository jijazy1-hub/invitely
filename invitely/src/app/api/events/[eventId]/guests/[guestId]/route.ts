// src/app/api/events/[eventId]/guests/[guestId]/route.ts
import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import prisma from "@/lib/prisma";

type Ctx = { params: { eventId: string; guestId: string } };

export async function DELETE(_req: Request, { params }: Ctx) {
  const { userId } = auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  // Verify ownership
  const event = await prisma.event.findFirst({ where: { id: params.eventId, userId } });
  if (!event) return NextResponse.json({ error: "Not found" }, { status: 404 });

  await prisma.guest.delete({
    where: { id: params.guestId },
  }).catch(() => null);

  return NextResponse.json({ success: true });
}
