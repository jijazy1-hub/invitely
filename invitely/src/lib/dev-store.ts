import { promises as fs } from "fs";
import os from "os";
import path from "path";
import type { EventType } from "@prisma/client";
import { generateSlug, randomSuffix } from "../utils/codes";

type DevEvent = {
  id: string;
  userId: string;
  name: string;
  slug: string;
  eventType: EventType;
  date: string;
  time: string | null;
  venue: string;
  description: string | null;
  dressCode: string | null;
  rsvpDeadline: string | null;
  organizerName: string | null;
  organizerPhone: string | null;
  organizerEmail: string | null;
  logoUrl: string | null;
  coverUrl: string | null;
  primaryColor: string;
  secondaryColor: string;
  accentColor: string;
  templateId: string | null;
  isPublished: boolean;
  requirePhoto: boolean;
  maxGuests: number | null;
  createdAt: string;
  updatedAt: string;
  _count: { guests: number };
};

type DevStore = {
  events: DevEvent[];
};

const storePath = path.join(os.tmpdir(), "invitely-dev-store.json");

async function readStore(): Promise<DevStore> {
  try {
    const raw = await fs.readFile(storePath, "utf8");
    const parsed = JSON.parse(raw) as Partial<DevStore>;
    return { events: Array.isArray(parsed.events) ? parsed.events : [] };
  } catch {
    return { events: [] };
  }
}

async function writeStore(store: DevStore): Promise<void> {
  await fs.writeFile(storePath, JSON.stringify(store, null, 2), "utf8");
}

function makeId() {
  return `dev_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

export async function listDevEvents(userId: string): Promise<DevEvent[]> {
  const store = await readStore();
  return store.events.filter((event) => event.userId === userId);
}

export async function getDevEvent(userId: string, eventId: string): Promise<DevEvent | null> {
  const store = await readStore();
  return store.events.find((event) => event.userId === userId && event.id === eventId) ?? null;
}

export async function createDevEvent(userId: string, data: {
  name: string;
  eventType: EventType;
  date: string;
  time?: string | null;
  venue: string;
  description?: string | null;
  dressCode?: string | null;
  rsvpDeadline?: string | null;
  organizerName?: string | null;
  organizerPhone?: string | null;
  organizerEmail?: string | null;
  primaryColor?: string;
  secondaryColor?: string;
  accentColor?: string;
  requirePhoto?: boolean;
}) {
  const store = await readStore();
  let slug = generateSlug(data.name);
  const hasSlug = store.events.some((event) => event.slug === slug);
  if (hasSlug) slug = generateSlug(data.name, randomSuffix(4));

  const now = new Date().toISOString();
  const event: DevEvent = {
    id: makeId(),
    userId,
    name: data.name,
    slug,
    eventType: data.eventType,
    date: new Date(data.date).toISOString(),
    time: data.time ?? null,
    venue: data.venue,
    description: data.description ?? null,
    dressCode: data.dressCode ?? null,
    rsvpDeadline: data.rsvpDeadline ? new Date(data.rsvpDeadline).toISOString() : null,
    organizerName: data.organizerName ?? null,
    organizerPhone: data.organizerPhone ?? null,
    organizerEmail: data.organizerEmail ?? null,
    logoUrl: null,
    coverUrl: null,
    primaryColor: data.primaryColor ?? "#0A2810",
    secondaryColor: data.secondaryColor ?? "#B8860B",
    accentColor: data.accentColor ?? "#F8F4E3",
    templateId: null,
    isPublished: false,
    requirePhoto: data.requirePhoto ?? true,
    maxGuests: null,
    createdAt: now,
    updatedAt: now,
    _count: { guests: 0 },
  };

  store.events.unshift(event);
  await writeStore(store);
  return event;
}
