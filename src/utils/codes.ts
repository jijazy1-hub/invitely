// src/utils/codes.ts
// Admission codes and slug suffixes. Uses Node's crypto RNG (not Math.random),
// so codes cannot be predicted from earlier ones.
import { randomInt } from "crypto";

// No 0/O, 1/I/L, so codes are easy to read aloud and type at the door.
const CHARSET = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";
const SLUG_CHARSET = "abcdefghijklmnopqrstuvwxyz0123456789";

/** Length of the random part of an admission code. 31^8 ≈ 850 billion combinations. */
export const CODE_LENGTH = 8;

function randomString(charset: string, length: number): string {
  let out = "";
  for (let i = 0; i < length; i++) out += charset[randomInt(charset.length)];
  return out;
}

/**
 * Generates an admission code for a guest.
 * Format: PREFIX-XXXXXXXX (e.g. "INV-A3X7P2KQ").
 * Codes issued before this change are 6 characters and still work.
 */
export function generateUniqueCode(prefix = "INV"): string {
  return `${prefix}-${randomString(CHARSET, CODE_LENGTH)}`;
}

/**
 * Generates a URL-safe slug from an event name + optional suffix.
 * Example: "Gabby & Esther Wedding" → "gabby-and-esther-wedding"
 */
export function generateSlug(name: string, suffix?: string): string {
  const base = name
    .toLowerCase()
    .replace(/&/g, "and")
    .replace(/[^a-z0-9\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .slice(0, 48);

  return suffix ? `${base}-${suffix}` : base;
}

/** Short random suffix for slug uniqueness. */
export function randomSuffix(length = 4): string {
  return randomString(SLUG_CHARSET, length);
}
