// src/app/api/events/route.ts
import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import prisma from "@/lib/prisma";
import { ensureUser } from "@/lib/ensure-user";
import { describeDbError, eventLimit, getPlan, limitsEnforced } from "@/lib/plan";
import { generateSlug, randomSuffix } from "@/utils/codes";
import { z } from "zod";

export const dynamic = "force-dynamic";

const createEventSchema = z.object({
  name: z.string().min(1).max(120),
  eventType: z.enum(["WEDDING","BIRTHDAY","CONFERENCE","CONCERT","CHURCH","SEMINAR","VIP_PARTY","BURIAL","PRIVATE_DINNER","OTHER"]),
  date: z.string().refine((v) => !Number.isNaN(Date.parse(v)), "Please enter a valid date"),
  time: z.string().optional().nullable(),
  venue: z.string().min(1),
  description: z.string().optional().nullable(),
  dressCode: z.string().optional().nullable(),
  rsvpDeadline: z.string().optional().nullable(),
  organizerName: z.string().optional().nullable(),
  organizerPhone: z.string().optional().nullable(),
  organizerEmail: z.string().email().optional().nullable().or(z.literal("")),
  primaryColor: z.string().default("#0A2810"),
  secondaryColor: z.string().default("#B8860B"),
  accentColor: z.string().default("#F8F4E3"),
  requirePhoto: z.boolean().default(true),
});

// GET /api/events — list user's events
export async function GET() {
  try {
    const { userId } = await auth();
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const events = await prisma.event.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      include: { _count: { select: { guests: true } } },
    });

    return NextResponse.json({ events });
  } catch (error) {
    console.error("[EVENTS][GET] Failed:", error);
    return NextResponse.json({ error: describeDbError(error) }, { status: 500 });
  }
}

// POST /api/events — create event
export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  const parsed = createEventSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 });
  }

  try {
    const { userId } = await auth();
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    // Make sure the users row exists (foreign key for events.userId)
    await ensureUser(userId);

    const data = parsed.data;

    // Plan limits (only enforced when ENFORCE_PLAN_LIMITS=true)
    if (limitsEnforced()) {
      const plan = await getPlan(userId);
      const limit = eventLimit(plan);
      const count = await prisma.event.count({ where: { userId } });
      if (count >= limit) {
        return NextResponse.json(
          { error: `${plan === "FREE" ? "Free" : "Basic"} plan is limited to ${limit} event${limit === 1 ? "" : "s"}. Upgrade to create more.` },
          { status: 403 }
        );
      }
    }

    // Generate unique slug
    const base = generateSlug(data.name) || "event";
    let slug = base;
    for (let attempt = 0; attempt < 5; attempt++) {
      const existing = await prisma.event.findUnique({ where: { slug } });
      if (!existing) break;
      slug = `${base}-${randomSuffix(4)}`;
    }

    const event = await prisma.event.create({
      data: {
        userId,
        name: data.name,
        slug,
        eventType: data.eventType,
        date: new Date(data.date),
        time: data.time || null,
        venue: data.venue,
        description: data.description || null,
        dressCode: data.dressCode || null,
        rsvpDeadline: data.rsvpDeadline ? new Date(data.rsvpDeadline) : null,
        organizerName: data.organizerName || null,
        organizerPhone: data.organizerPhone || null,
        organizerEmail: data.organizerEmail || null,
        primaryColor: data.primaryColor,
        secondaryColor: data.secondaryColor,
        accentColor: data.accentColor,
        requirePhoto: data.requirePhoto,
      },
    });

    return NextResponse.json(event, { status: 201 });
  } catch (error) {
    console.error("[EVENTS][POST] Failed:", error);
    return NextResponse.json({ error: describeDbError(error) }, { status: 500 });
  }
}