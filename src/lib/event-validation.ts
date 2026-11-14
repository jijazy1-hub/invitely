// src/lib/event-validation.ts
// Checks event details for both "Create event" and "Edit event", with messages
// that say exactly what to fix. Safe to import in the browser too.
import { phoneError } from "@/utils/phone";

export const EVENT_TYPES = ["WEDDING", "BIRTHDAY", "CONFERENCE", "CONCERT", "CHURCH", "SEMINAR", "VIP_PARTY", "BURIAL", "PRIVATE_DINNER", "OTHER"] as const;

export type EventInput = {
  name: string;
  eventType: string;
  date: string;          // YYYY-MM-DD
  time: string;          // HH:MM (24h) or ""
  venue: string;
  description: string;
  dressCode: string;
  rsvpDeadline: string;  // YYYY-MM-DD or ""
  organizerName: string;
  organizerPhone: string;
  organizerEmail: string;
  primaryColor: string;
  secondaryColor: string;
  accentColor: string;
  requirePhoto: boolean;
  logoUrl: string;       // "" = none
  slug: string;
};

export type FieldErrors = Partial<Record<keyof EventInput, string>>;

const DATE_RE = /^(\d{4})-(\d{2})-(\d{2})$/;
const HEX_RE = /^#[0-9a-fA-F]{6}$/;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
export const SLUG_RE = /^[a-z0-9](?:[a-z0-9-]{1,58}[a-z0-9])$/;

function dateError(v: string, label: string, required: boolean): string | null {
  if (!v) return required ? `Choose the ${label}.` : null;
  const m = v.match(DATE_RE);
  if (!m) return `${label[0].toUpperCase() + label.slice(1)} must be a full date, e.g. 2026-12-20.`;
  const year = Number(m[1]);
  if (year < 2000 || year > 2100) {
    return `The year "${m[1]}" doesn't look right. Use a 4-digit year between 2000 and 2100, e.g. 2026.`;
  }
  const d = new Date(`${v}T00:00:00Z`);
  if (Number.isNaN(d.getTime()) || d.toISOString().slice(0, 10) !== v) return `${v} isn't a real date.`;
  return null;
}

/** Validates the fields present in `input`. Pass `{ isNew: true }` to require the creation fields. */
export function validateEvent(input: Partial<EventInput>, opts: { isNew?: boolean } = {}): FieldErrors {
  const e: FieldErrors = {};
  const has = (k: keyof EventInput) => opts.isNew || k in input;

  if (has("name")) {
    const v = (input.name ?? "").trim();
    if (!v) e.name = "Enter the event name.";
    else if (v.length > 120) e.name = "Event name is too long (max 120 characters).";
  }
  if (has("eventType") && !(EVENT_TYPES as readonly string[]).includes(input.eventType ?? "")) e.eventType = "Choose an event type.";
  if (has("date")) {
    const err = dateError(input.date ?? "", "event date", true);
    if (err) e.date = err;
  }
  if (has("time") && input.time && !/^([01]\d|2[0-3]):[0-5]\d$/.test(input.time)) e.time = "Time must look like 14:30.";
  if (has("venue")) {
    const v = (input.venue ?? "").trim();
    if (!v) e.venue = "Enter the venue.";
    else if (v.length > 200) e.venue = "Venue is too long (max 200 characters).";
  }
  if (has("description") && (input.description ?? "").length > 2000) e.description = "Description is too long (max 2000 characters).";
  if (has("dressCode") && (input.dressCode ?? "").length > 100) e.dressCode = "Dress code is too long (max 100 characters).";
  if (has("rsvpDeadline")) {
    const err = dateError(input.rsvpDeadline ?? "", "RSVP deadline", false);
    if (err) e.rsvpDeadline = err;
    else if (input.rsvpDeadline && input.date && !e.date && input.rsvpDeadline > input.date) {
      e.rsvpDeadline = "The RSVP deadline must be on or before the event date.";
    }
  }
  if (has("organizerName") && (input.organizerName ?? "").length > 100) e.organizerName = "Name is too long (max 100 characters).";
  if (has("organizerPhone") && input.organizerPhone?.trim()) {
    const err = phoneError(input.organizerPhone);
    if (err) e.organizerPhone = err;
  }
  if (has("organizerEmail") && input.organizerEmail?.trim() && !EMAIL_RE.test(input.organizerEmail.trim())) {
    e.organizerEmail = `"${input.organizerEmail}" isn't a valid email. Use the format name@example.com.`;
  }
  for (const k of ["primaryColor", "secondaryColor", "accentColor"] as const) {
    if (has(k) && !HEX_RE.test(input[k] ?? "")) e[k] = "Use a colour like #0A2810.";
  }
  if ("slug" in input && input.slug !== undefined) {
    if (!SLUG_RE.test(input.slug)) {
      e.slug = "Use 3–60 lowercase letters, numbers and dashes, e.g. joe-and-fatima-2026.";
    }
  }
  return e;
}

/** Turns "YYYY-MM-DD" into a Date at midnight UTC (how event dates are stored). */
export function toEventDate(v: string): Date {
  return new Date(`${v}T00:00:00Z`);
}

/** Date → "YYYY-MM-DD" for date inputs. */
export function toDateInput(d: Date | string | null | undefined): string {
  if (!d) return "";
  const x = new Date(d);
  return Number.isNaN(x.getTime()) ? "" : x.toISOString().slice(0, 10);
}
