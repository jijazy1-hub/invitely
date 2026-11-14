// src/app/api/events/[eventId]/guests/route.ts
import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import prisma from "@/lib/prisma";
import { getUserPlan } from "@/lib/plans";

export const dynamic = "force-dynamic";
import { normalizePhone, phoneError, nameError, emailError } from "@/utils/phone";

type Ctx = { params: { eventId: string } };

async function verifyOwner(userId: string, eventId: string) {
  return prisma.event.findFirst({ where: { id: eventId, userId } });
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
    console.error("[GUESTS][GET] Failed:", error);
    return NextResponse.json({ error: "Failed to load guests." }, { status: 500 });
  }
}

// POST /api/events/[eventId]/guests — add single guest
export async function POST(req: Request, { params }: Ctx) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const event = await verifyOwner(userId, params.eventId);
  if (!event) return NextResponse.json({ error: "Event not found" }, { status: 404 });

  const plan = await getUserPlan(userId);
  if (plan.maxGuests !== null) {
    const count = await prisma.guest.count({ where: { eventId: params.eventId } });
    if (count >= plan.maxGuests) {
      return NextResponse.json(
        { error: `${plan.name} plan is limited to ${plan.maxGuests} guests per event. Upgrade your plan.` },
        { status: 403 }
      );
    }
  }

  const body = await req.json().catch(() => ({}));
  const rawName = String(body.name || "").trim().replace(/\s+/g, " ");
  const rawPhone = String(body.phone || "").trim();
  const rawEmail = body.email ? String(body.email).trim() : "";

  const fieldErrors: Record<string, string> = {};
  const nErr = nameError(rawName);
  const pErr = phoneError(rawPhone);
  const eErr = emailError(rawEmail);
  if (nErr) fieldErrors.name = nErr;
  if (pErr) fieldErrors.phone = pErr;
  if (eErr) fieldErrors.email = eErr;
  if (Object.keys(fieldErrors).length) {
    return NextResponse.json({ error: Object.values(fieldErrors)[0], fieldErrors }, { status: 400 });
  }

  const name = rawName;
  const phone = normalizePhone(rawPhone);
  const email = rawEmail || null;

  try {
    const guest = await prisma.guest.create({
      data: { eventId: params.eventId, name, phone, email, importedVia: "MANUAL" },
    });
    return NextResponse.json({ guest }, { status: 201 });
  } catch (err: any) {
    if (err.code === "P2002") {
      return NextResponse.json(
        { error: `${phone} is already on this guest list. Each guest needs their own phone number.`, fieldErrors: { phone: `${phone} is already on this guest list.` } },
        { status: 409 }
      );
    }

    console.error("[GUESTS][POST] Failed:", err);
    return NextResponse.json({ error: "Failed to add guest." }, { status: 500 });
  }
}
