// src/app/api/events/[eventId]/route.ts
import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import prisma from "@/lib/prisma";
import { describeDbError } from "@/lib/plan";
import { deleteEventPhotos } from "@/lib/guest-photo";
import { validateEvent, toEventDate, toDateInput } from "@/lib/event-validation";
import { normalizePhone } from "@/utils/phone";

export const dynamic = "force-dynamic";

type Ctx = { params: { eventId: string } };

// GET /api/events/[eventId]
export async function GET(_req: Request, { params }: Ctx) {
  try {
    const { userId } = await auth();
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const event = await prisma.event.findFirst({
      where: { id: params.eventId, userId },
      include: { _count: { select: { guests: true, checkins: true } }, template: { select: { category: true } } },
    });
    if (!event) return NextResponse.json({ error: "Not found" }, { status: 404 });

    return NextResponse.json(event);
  } catch (err) {
    console.error("[EVENT][GET]", err);
    return NextResponse.json({ error: describeDbError(err) }, { status: 500 });
  }
}

// PATCH /api/events/[eventId]
export async function PATCH(req: Request, { params }: Ctx) {
  try {
    const { userId } = await auth();
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const event = await prisma.event.findFirst({ where: { id: params.eventId, userId } });
    if (!event) return NextResponse.json({ error: "Not found" }, { status: 404 });

    const body = await req.json().catch(() => ({}));

    // Validate everything that was sent (with messages that say what to fix).
    const checkable: Record<string, unknown> = {};
    for (const k of ["name", "eventType", "date", "time", "venue", "description", "dressCode", "rsvpDeadline", "organizerName", "organizerPhone", "organizerEmail", "primaryColor", "secondaryColor", "accentColor", "slug"]) {
      if (k in body) checkable[k] = body[k] === null ? "" : String(body[k]);
    }
    // The RSVP deadline is compared with the event date, even when only one of them changes.
    if ("rsvpDeadline" in checkable && !("date" in checkable)) checkable.date = toDateInput(event.date);
    const fieldErrors = validateEvent(checkable as any);
    if (Object.keys(fieldErrors).length) {
      return NextResponse.json({ error: Object.values(fieldErrors)[0], fieldErrors }, { status: 400 });
    }

    const updates: Record<string, any> = {};
    const text = (k: string, nullable = true) => {
      if (!(k in body)) return;
      const v = body[k] === null ? "" : String(body[k]).trim();
      updates[k] = nullable && !v ? null : v;
    };
    ["description", "dressCode", "organizerName", "organizerEmail"].forEach((k) => text(k));
    ["name", "venue", "eventType", "primaryColor", "secondaryColor", "accentColor"].forEach((k) => text(k, false));
    if ("time" in body) updates.time = body.time ? String(body.time) : null;
    if ("organizerPhone" in body) updates.organizerPhone = body.organizerPhone ? normalizePhone(String(body.organizerPhone)) : null;
    if ("date" in body) updates.date = toEventDate(String(body.date));
    if ("rsvpDeadline" in body) updates.rsvpDeadline = body.rsvpDeadline ? toEventDate(String(body.rsvpDeadline)) : null;
    if ("requirePhoto" in body) updates.requirePhoto = !!body.requirePhoto;
    if ("isPublished" in body) updates.isPublished = !!body.isPublished;

    // Custom invite link
    if ("slug" in body && body.slug !== event.slug) {
      const isFree = async (s: string) => {
        const t = await prisma.event.findUnique({ where: { slug: s }, select: { id: true } });
        return !t || t.id === event.id;
      };
      let wanted = String(body.slug);
      // Link made from the name: add -2, -3… (or the year) instead of failing.
      if (body.slugAuto === true && !(await isFree(wanted))) {
        const year = toDateInput(updates.date ?? event.date).slice(0, 4);
        const options = [`${wanted}-${year}`, ...Array.from({ length: 8 }, (_, i) => `${wanted}-${i + 2}`)];
        for (const o of options) {
          if (o.length <= 60 && (await isFree(o))) { wanted = o; break; }
        }
        body.slug = wanted;
      }
      const taken = await prisma.event.findUnique({ where: { slug: wanted }, select: { id: true } });
      if (taken && taken.id !== event.id) {
        return NextResponse.json({ error: "That link is already used by another event.", fieldErrors: { slug: "That link is already used by another event. Try adding the year, e.g. -2026." } }, { status: 409 });
      }
      updates.slug = wanted;
    }

    // Logo: "" removes it; a data URL is uploaded to Cloudinary when configured (or kept inline if small).
    if ("logoUrl" in body) {
      const v = body.logoUrl ? String(body.logoUrl) : "";
      if (!v) updates.logoUrl = null;
      else if (/^https:\/\/res\.cloudinary\.com\//.test(v)) updates.logoUrl = v;
      else if (/^data:image\/(jpeg|png);base64,[A-Za-z0-9+/=]+$/.test(v) && v.length <= 400_000) {
        if (process.env.CLOUDINARY_CLOUD_NAME && process.env.CLOUDINARY_API_KEY && process.env.CLOUDINARY_API_SECRET) {
          try {
            const { uploadToCloudinary } = await import("@/lib/cloudinary");
            updates.logoUrl = (await uploadToCloudinary(v, { folder: "invitely/logos", publicId: `event_${event.id}_${Date.now()}` })).url;
          } catch (error) {
            console.error("[EVENT][PATCH] logo upload failed, storing inline:", error);
            updates.logoUrl = v;
          }
        } else {
          updates.logoUrl = v;
        }
      } else {
        return NextResponse.json({ error: "The logo must be a JPG or PNG image under 300 KB.", fieldErrors: { logoUrl: "Use a JPG or PNG image." } }, { status: 400 });
      }
    }

    // Colours go straight into the card renderer, so only accept #RRGGBB.
    for (const key of ["primaryColor", "secondaryColor", "accentColor"]) {
      if (key in updates && !/^#[0-9a-fA-F]{6}$/.test(String(updates[key]))) {
        return NextResponse.json({ error: `${key} must be a colour like #0A2810.` }, { status: 400 });
      }
    }

    // Applying a template: copy its colours onto the event.
    if ("templateId" in body) {
      if (body.templateId === null) {
        updates.templateId = null;
      } else {
        const template = await prisma.template.findFirst({
          where: { id: String(body.templateId), OR: [{ isPublic: true }, { createdBy: userId }] },
        });
        if (!template) return NextResponse.json({ error: "Template not found." }, { status: 404 });
        let config: Record<string, unknown> = {};
        try { config = JSON.parse(template.config || "{}"); } catch { config = {}; }
        updates.templateId = template.id;
        for (const key of ["primaryColor", "secondaryColor", "accentColor"]) {
          const v = config[key];
          if (typeof v === "string" && /^#[0-9a-fA-F]{6}$/.test(v)) updates[key] = v;
        }
      }
    }

    const updated = await prisma.event.update({
      where: { id: params.eventId },
      data: updates,
    });

    return NextResponse.json(updated);
  } catch (err) {
    console.error("[EVENT][PATCH]", err);
    return NextResponse.json({ error: describeDbError(err) }, { status: 500 });
  }
}

// DELETE /api/events/[eventId]
export async function DELETE(_req: Request, { params }: Ctx) {
  try {
    const { userId } = await auth();
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const event = await prisma.event.findFirst({ where: { id: params.eventId, userId } });
    if (!event) return NextResponse.json({ error: "Not found" }, { status: 404 });

    await deleteEventPhotos(params.eventId);
    await prisma.event.delete({ where: { id: params.eventId } });
    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("[EVENT][DELETE]", err);
    return NextResponse.json({ error: describeDbError(err) }, { status: 500 });
  }
}
