import { promises as fs } from "fs";
import os from "os";
import path from "path";
import type { EventType } from "@/types";
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

type DevGuest = {
  id: string;
  userId: string;
  eventId: string;
  name: string;
  phone: string;
  email: string | null;
  invited: boolean;
  importedAt: string;
  importedVia: string;
  rsvp?: {
    status: "PENDING" | "CONFIRMED" | "DECLINED";
    attendance?: boolean | null;
    seatNumber?: number | null;
    uniqueCode?: string | null;
    cardUrl?: string | null;
    email?: string | null;
    photoUrl?: string | null;
    guestPhoto?: string | null;
    rsvpedAt?: string | null;
    createdAt?: string | null;
    updatedAt?: string | null;
  } | null;
  checkin?: {
    checkedInAt: string;
    checkedInBy?: string | null;
    notes?: string | null;
  } | null;
};

type DevStore = {
  events: DevEvent[];
  guests: DevGuest[];
};

const storePath = path.join(os.tmpdir(), "invitely-dev-store.json");

async function readStore(): Promise<DevStore> {
  try {
    const raw = await fs.readFile(storePath, "utf8");
    const parsed = JSON.parse(raw) as Partial<DevStore>;
    return {
      events: Array.isArray(parsed.events) ? parsed.events : [],
      guests: Array.isArray(parsed.guests) ? parsed.guests : [],
    };
  } catch {
    return { events: [], guests: [] };
  }
}

async function writeStore(store: DevStore): Promise<void> {
  await fs.writeFile(storePath, JSON.stringify(store, null, 2), "utf8");
}

function makeId() {
  return `dev_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

function syncGuestCount(store: DevStore, eventId: string) {
  const event = store.events.find((item) => item.id === eventId);
  if (event) {
    event._count = {
      guests: store.guests.filter((guest) => guest.eventId === eventId).length,
    };
  }
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

export async function listDevGuests(userId: string, eventId: string): Promise<DevGuest[]> {
  const store = await readStore();
  return store.guests.filter((guest) => guest.userId === userId && guest.eventId === eventId);
}

export async function createDevGuest(userId: string, eventId: string, data: {
  name: string;
  phone: string;
  email?: string | null;
  importedVia?: string;
}) {
  const store = await readStore();
  const now = new Date().toISOString();
  const guest: DevGuest = {
    id: makeId(),
    userId,
    eventId,
    name: data.name,
    phone: data.phone,
    email: data.email ?? null,
    invited: true,
    importedAt: now,
    importedVia: data.importedVia ?? "MANUAL",
    rsvp: null,
    checkin: null,
  };

  store.guests.unshift(guest);
  syncGuestCount(store, eventId);
  await writeStore(store);
  return guest;
}

export async function getDevAnalytics(userId: string, eventId: string) {
  const store = await readStore();
  const event = store.events.find((item) => item.userId === userId && item.id === eventId);
  if (!event) return null;

  const guests = store.guests.filter((guest) => guest.userId === userId && guest.eventId === eventId);
  const confirmed = guests.filter((guest) => guest.rsvp?.status === "CONFIRMED").length;
  const declined = guests.filter((guest) => guest.rsvp?.status === "DECLINED").length;
  const pending = guests.length - confirmed - declined;
  const checkedIn = guests.filter((guest) => guest.checkin).length;

  const now = new Date();
  const twoWeeksAgo = new Date(now);
  twoWeeksAgo.setDate(now.getDate() - 13);

  const rsvpsByDay: Record<string, { confirmed: number; declined: number }> = {};
  for (let i = 0; i < 14; i++) {
    const day = new Date(twoWeeksAgo);
    day.setDate(twoWeeksAgo.getDate() + i);
    const key = day.toISOString().slice(0, 10);
    rsvpsByDay[key] = { confirmed: 0, declined: 0 };
  }

  for (const guest of guests) {
    if (!guest.rsvp?.rsvpedAt) continue;
    const key = new Date(guest.rsvp.rsvpedAt).toISOString().slice(0, 10);
    if (!(key in rsvpsByDay)) continue;
    if (guest.rsvp.status === "CONFIRMED") rsvpsByDay[key].confirmed += 1;
    if (guest.rsvp.status === "DECLINED") rsvpsByDay[key].declined += 1;
  }

  const trend = Object.entries(rsvpsByDay).map(([date, counts]) => ({ date, ...counts }));
  const importSourceCounts: Record<string, number> = {};
  for (const guest of guests) {
    const source = guest.importedVia ?? "MANUAL";
    importSourceCounts[source] = (importSourceCounts[source] ?? 0) + 1;
  }
  const importSources = Object.entries(importSourceCounts).map(([source, count]) => ({ source, count }));

  return {
    summary: {
      totalGuests: guests.length,
      confirmed,
      declined,
      pending,
      checkedIn,
      rsvpRate: guests.length > 0 ? Math.round((confirmed / guests.length) * 100) : 0,
      checkinRate: confirmed > 0 ? Math.round((checkedIn / confirmed) * 100) : 0,
    },
    trend,
    importSources,
  };
}
