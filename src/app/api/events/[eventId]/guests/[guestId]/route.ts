// src/app/api/events/[eventId]/guests/[guestId]/route.ts
import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import prisma from "@/lib/prisma";
import { describeDbError } from "@/lib/plan";

export const dynamic = "force-dynamic";

type Ctx = { params: { eventId: string; guestId: string } };

export async function DELETE(_req: Request, { params }: Ctx) {
  try {
    const { userId } = await auth();
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    // Verify ownership
    const event = await prisma.event.findFirst({ where: { id: params.eventId, userId } });
    if (!event) return NextResponse.json({ error: "Not found" }, { status: 404 });

    // deleteMany scopes the delete to this event so one user can't delete another's guest
    await prisma.guest.deleteMany({ where: { id: params.guestId, eventId: params.eventId } });

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("[GUEST][DELETE]", err);
    return NextResponse.json({ error: describeDbError(err) }, { status: 500 });
  }
}
