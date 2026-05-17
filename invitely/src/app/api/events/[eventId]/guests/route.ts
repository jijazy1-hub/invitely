// src/app/api/events/[eventId]/guests/route.ts
import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import prisma from "@/lib/prisma";
import { normalizePhone, isValidPhone } from "@/utils/phone";

type Ctx = { params: { eventId: string } };

async function verifyOwner(userId: string, eventId: string) {
  const event = await prisma.event.findFirst({ where: { id: eventId, userId } });
  return event;
}

// GET /api/events/[eventId]/guests
export async function GET(_req: Request, { params }: Ctx) {
  const { userId } = auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const event = await verifyOwner(userId, params.eventId);
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
}

// POST /api/events/[eventId]/guests — add single guest
export async function POST(req: Request, { params }: Ctx) {
  const { userId } = auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const event = await verifyOwner(userId, params.eventId);
  if (!event) return NextResponse.json({ error: "Event not found" }, { status: 404 });

  // Check subscription guest limits
  const sub = await prisma.subscription.findUnique({ where: { userId } });
  const plan = sub?.plan ?? "FREE";
  if (plan === "FREE") {
    const count = await prisma.guest.count({ where: { eventId: params.eventId } });
    if (count >= 50) {
      return NextResponse.json({ error: "Free plan is limited to 50 guests. Upgrade your plan." }, { status: 403 });
    }
  }
  if (plan === "BASIC") {
    const count = await prisma.guest.count({ where: { eventId: params.eventId } });
    if (count >= 500) {
      return NextResponse.json({ error: "Basic plan is limited to 500 guests. Upgrade your plan." }, { status: 403 });
    }
  }

  const body = await req.json();
  const name = String(body.name || "").trim();
  const phone = normalizePhone(String(body.phone || "").trim());
  const email = body.email ? String(body.email).trim() : null;

  if (!name) return NextResponse.json({ error: "Name is required" }, { status: 400 });
  if (!isValidPhone(phone)) return NextResponse.json({ error: "Invalid phone number" }, { status: 400 });

  try {
    const guest = await prisma.guest.create({
      data: { eventId: params.eventId, name, phone, email, importedVia: "MANUAL" },
    });
    return NextResponse.json({ guest }, { status: 201 });
  } catch (err: any) {
    if (err.code === "P2002") {
      return NextResponse.json({ error: "A guest with this phone number already exists" }, { status: 409 });
    }
    throw err;
  }
}
