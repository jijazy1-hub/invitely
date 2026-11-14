// src/lib/event-design.ts
// Loading and saving an event's card design (server-only).
//
// A design is stored as a private Template row (category CUSTOM_DESIGN, config =
// {"kind":"design","design":{...}}) that the event points to via templateId, so no
// new event columns are needed. The event's own colours are kept in step so the
// invite page matches the card.
import prisma from "@/lib/prisma";
import {
  type CardDesign, CUSTOM_DESIGN_CATEGORY, defaultDesign, designFromTemplateConfig, sanitizeDesign,
} from "@/lib/card-design";

type EventLike = {
  id: string;
  name: string;
  eventType: string;
  primaryColor: string;
  secondaryColor: string;
  accentColor: string;
  templateId?: string | null;
  template?: { id: string; config: string; category: string; createdBy: string | null } | null;
};

/** The event's saved design, or the classic card in the event's colours. */
export function designForEvent(event: EventLike): CardDesign {
  const saved = event.template ? designFromTemplateConfig(event.template.config, event.eventType) : null;
  return saved ?? defaultDesign(event.eventType, { primary: event.primaryColor, secondary: event.secondaryColor, paper: event.accentColor });
}

function cloudinaryConfigured(): boolean {
  return !!(process.env.CLOUDINARY_CLOUD_NAME && process.env.CLOUDINARY_API_KEY && process.env.CLOUDINARY_API_SECRET);
}

/** Saves a (sanitised) design for the event. Uploads the background photo to Cloudinary when configured. */
export async function saveEventDesign(event: EventLike, userId: string, input: unknown): Promise<CardDesign> {
  const design = sanitizeDesign(input, event.eventType);

  if (design.background?.startsWith("data:") && cloudinaryConfigured()) {
    try {
      const { uploadToCloudinary } = await import("@/lib/cloudinary");
      const up = await uploadToCloudinary(design.background, {
        folder: "invitely/card-backgrounds",
        publicId: `event_${event.id}_${Date.now()}`,
      });
      design.background = up.url;
    } catch (error) {
      console.error("[DESIGN] Background upload failed; keeping it inline:", error);
    }
  }

  const colors = {
    primaryColor: design.colors.primary,
    secondaryColor: design.colors.accent,
    accentColor: design.colors.paper,
  };

  // Classic with no extras: no need for a design row; the event colours are enough.
  if (design.layout === "classic") {
    await prisma.event.update({ where: { id: event.id }, data: { ...colors, templateId: null } });
    return design;
  }

  const config = JSON.stringify({ kind: "design", design });
  const own =
    event.template && event.template.category === CUSTOM_DESIGN_CATEGORY && event.template.createdBy === userId
      ? event.template
      : null;

  if (own) {
    await prisma.template.update({ where: { id: own.id }, data: { config, name: `${event.name} card` } });
    await prisma.event.update({ where: { id: event.id }, data: colors });
  } else {
    const tpl = await prisma.template.create({
      data: {
        name: `${event.name} card`,
        description: "Custom card design",
        category: CUSTOM_DESIGN_CATEGORY,
        isPublic: false,
        createdBy: userId,
        config,
      },
    });
    await prisma.event.update({ where: { id: event.id }, data: { ...colors, templateId: tpl.id } });
  }
  return design;
}
