// src/app/api/events/[eventId]/guests/route.ts
import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import prisma from "@/lib/prisma";
import { describeDbError, getPlan, guestLimit, limitsEnforced } from "@/lib/plan";
import { normalizePhone, isValidPhone } from "@/utils/phone";

export const dynamic = "force-dynamic";

type Ctx = { params: { eventId: string } };

// GET /api/events/[eventId]/guests
export async function GET(_req: Request, { params }: Ctx) {
  try {
    const { userId } = await auth();
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const event = await prisma.event.findFirst({ where: { id: params.eventId, userId } });
    if (!event) return NextResponse.json({ error: "Event not found" }, { status: 404 });

    const guests = await prisma.guest.findMany({
      where: { eventId: params.eventId },
      orderBy: { importedAt: "desc" },
      include: {
        rsvp: { select: { status: true, seatNumber: true, uniqueCode: true } },
        checkin: { select: { checkedInAt: true } },
      },
    });

    return NextResponse.json({ guests });
  } catch (err) {
    console.error("[GUESTS][GET]", err);
    return NextResponse.json({ error: describeDbError(err), guests: [] }, { status: 500 });
  }
}

// POST /api/events/[eventId]/guests — add single guest
export async function POST(req: Request, { params }: Ctx) {
  try {
    const { userId } = await auth();
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const event = await prisma.event.findFirst({ where: { id: params.eventId, userId } });
    if (!event) return NextResponse.json({ error: "Event not found" }, { status: 404 });

    if (limitsEnforced()) {
      const plan = await getPlan(userId);
      const limit = guestLimit(plan);
      const count = await prisma.guest.count({ where: { eventId: params.eventId } });
      if (count >= limit) {
        return NextResponse.json(
          { error: `${plan === "FREE" ? "Free" : "Basic"} plan is limited to ${limit} guests. Upgrade your plan.` },
          { status: 403 }
        );
      }
    }

    const body = await req.json().catch(() => ({}));
    const name = String(body.name || "").trim();
    const phone = normalizePhone(String(body.phone || "").trim());
    const email = body.email ? String(body.email).trim() : null;

    if (!name) return NextResponse.json({ error: "Name is required" }, { status: 400 });
    if (!isValidPhone(phone)) {
      return NextResponse.json({ error: "Invalid phone number (use 11 digits, e.g. 08012345678)" }, { status: 400 });
    }

    const guest = await prisma.guest.create({
      data: { eventId: params.eventId, name, phone, email, importedVia: "MANUAL" },
    });
    return NextResponse.json({ guest }, { status: 201 });
  } catch (err: any) {
    if (err?.code === "P2002") {
      return NextResponse.json({ error: "A guest with this phone number already exists" }, { status: 409 });
    }
    console.error("[GUESTS][POST]", err);
    return NextResponse.json({ error: describeDbError(err) }, { status: 500 });
  }
}
