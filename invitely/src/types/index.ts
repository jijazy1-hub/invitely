// src/types/index.ts
import type { Event, Guest, Rsvp } from "@prisma/client";

// ─── Re-exported Prisma types ─────────────────────────────
export type { Event, Guest, Rsvp };

export type EventType = Event["eventType"];
export type RsvpStatus = Rsvp["status"];
export type SubscriptionPlan = "FREE" | "BASIC" | "PREMIUM";

// ─── Extended types with relations ───────────────────────
export type EventWithStats = Event & {
  _count: {
    guests: number;
  };
  rsvpStats?: {
    confirmed: number;
    declined: number;
    pending: number;
    checkedIn: number;
  };
};

export type GuestWithRsvp = Guest & {
  rsvp: Rsvp | null;
  checkin: { checkedInAt: Date } | null;
};

// ─── API response types ───────────────────────────────────
export type ApiResponse<T = void> =
  | { success: true; data: T }
  | { success: false; error: string };

// ─── Guest import types ───────────────────────────────────
export type ImportReport = {
  imported: number;
  duplicates: number;
  invalid: number;
  errors: string[];
  guests: Array<{ name: string; phone: string }>;
};

// ─── RSVP flow types (used in public invite page) ─────────
export type PublicEvent = {
  id: string;
  name: string;
  slug: string;
  eventType: EventType;
  date: string;
  time: string | null;
  venue: string;
  description: string | null;
  dressCode: string | null;
  organizerName: string | null;
  primaryColor: string;
  secondaryColor: string;
  accentColor: string;
  logoUrl: string | null;
  coverUrl: string | null;
  requirePhoto: boolean;
};

export type PublicGuest = {
  id: string;
  name: string;
  phone: string;
  rsvp: {
    status: RsvpStatus;
    uniqueCode: string | null;
    seatNumber: number | null;
  } | null;
};

// ─── Subscription limits ──────────────────────────────────
export const PLAN_LIMITS: Record<SubscriptionPlan, { events: number | null; guests: number | null }> = {
  FREE: { events: 1, guests: 50 },
  BASIC: { events: 5, guests: 500 },
  PREMIUM: { events: null, guests: null },
};

// ─── Event type display config ────────────────────────────
export const EVENT_TYPE_LABELS: Record<EventType, string> = {
  WEDDING: "Wedding",
  BIRTHDAY: "Birthday",
  CONFERENCE: "Conference",
  CONCERT: "Concert",
  CHURCH: "Church Program",
  SEMINAR: "Seminar",
  VIP_PARTY: "VIP Party",
  BURIAL: "Burial",
  PRIVATE_DINNER: "Private Dinner",
  OTHER: "Other",
};

export const EVENT_TYPE_ICONS: Record<EventType, string> = {
  WEDDING: "💍",
  BIRTHDAY: "🎂",
  CONFERENCE: "🎤",
  CONCERT: "🎵",
  CHURCH: "⛪",
  SEMINAR: "📋",
  VIP_PARTY: "🥂",
  BURIAL: "🕊️",
  PRIVATE_DINNER: "🍽️",
  OTHER: "📅",
};
