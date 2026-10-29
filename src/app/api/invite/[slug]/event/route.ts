// src/app/api/invite/[slug]/event/route.ts
import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export const dynamic = "force-dynamic";

type Ctx = { params: { slug: string } };

export async function GET(_req: Request, { params }: Ctx) {
  try {
  const event = await prisma.event.findFirst({
    where: { slug: params.slug, isPublished: true },
    select: {
      id: true, name: true, slug: true, eventType: true,
      date: true, time: true, venue: true, description: true, dressCode: true,
      organizerName: true, primaryColor: true, secondaryColor: true, accentColor: true,
      logoUrl: true, coverUrl: true, requirePhoto: true,
    },
  });

  if (!event) return NextResponse.json({ error: "Event not found" }, { status: 404 });
  return NextResponse.json({ event });
  } catch (err) {
    console.error("[INVITE][EVENT]", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
