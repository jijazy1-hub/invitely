// src/app/api/events/[eventId]/guests/route.ts
import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import prisma from "@/lib/prisma";
import { createDevGuest, getDevEvent, listDevGuests } from "@/lib/dev-store";

export const dynamic = "force-dynamic";
import { normalizePhone, isValidPhone } from "@/utils/phone";

type Ctx = { params: { eventId: string } };

async function verifyOwner(userId: string, eventId: string) {
  try {
    return await prisma.event.findFirst({ where: { id: eventId, userId } });
  } catch (error) {
    console.error("[GUESTS][verifyOwner] Falling back to local store:", error);
    return await getDevEvent(userId, eventId);
  }
}

// GET /api/events/[eventId]/guests
export async function GET(_req: Request, { params }: Ctx) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const event = await verifyOwner(userId, params.eventId);
  if (!event) return NextResponse.json({ error: "Event not found" }, { status: 404 });

  try {
    const guests = await prisma.guest.findMany({
      where: { eventId: params.eventId },
      orderBy: { importedAt: "desc" },
      include: {
        rsvp: { select: { status: true, seatNumber: true, uniqueCode: true } },
        checkin: { select: { checkedInAt: true } },
      },
    });

    return NextResponse.json({ guests });
  } catch (error) {
    console.error("[GUESTS][GET] Falling back to local store:", error);
    const guests = await listDevGuests(userId, params.eventId);
    return NextResponse.json({ guests });
  }
}

// POST /api/events/[eventId]/guests — add single guest
export async function POST(req: Request, { params }: Ctx) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const event = await verifyOwner(userId, params.eventId);
  if (!event) return NextResponse.json({ error: "Event not found" }, { status: 404 });

  let plan: "FREE" | "BASIC" | "PREMIUM" = "FREE";
  try {
    const sub = await prisma.subscription.findUnique({ where: { userId } });
    if (sub?.plan === "BASIC" || sub?.plan === "PREMIUM") {
      plan = sub.plan as "BASIC" | "PREMIUM";
    }
  } catch (error) {
    console.error("[GUESTS][POST] Subscription lookup failed, using free fallback:", error);
  }

  if (plan === "FREE") {
    try {
      const count = await prisma.guest.count({ where: { eventId: params.eventId } });
      if (count >= 50) {
        return NextResponse.json({ error: "Free plan is limited to 50 guests. Upgrade your plan." }, { status: 403 });
      }
    } catch (error) {
      console.error("[GUESTS][POST] Guest limit check failed, skipping limit enforcement:", error);
    }
  }
  if (plan === "BASIC") {
    try {
      const count = await prisma.guest.count({ where: { eventId: params.eventId } });
      if (count >= 500) {
        return NextResponse.json({ error: "Basic plan is limited to 500 guests. Upgrade your plan." }, { status: 403 });
      }
    } catch (error) {
      console.error("[GUESTS][POST] Guest limit check failed, skipping limit enforcement:", error);
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

    console.error("[GUESTS][POST] Falling back to local store:", err);
    const guest = await createDevGuest(userId, params.eventId, { name, phone, email, importedVia: "MANUAL" });
    return NextResponse.json({ guest }, { status: 201 });
  }
}
