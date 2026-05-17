// src/utils/codes.ts
// Generalized from the original wedding project

const CHARSET = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";

/**
 * Generates a unique admission code for a guest.
 * Format: PREFIX-XXXXXX (e.g. "INV-A3X7P2")
 */
export function generateUniqueCode(prefix = "INV"): string {
  let token = "";
  for (let i = 0; i < 6; i++) {
    token += CHARSET.charAt(Math.floor(Math.random() * CHARSET.length));
  }
  return `${prefix}-${token}`;
}

/**
 * Generates a URL-safe slug from an event name + optional suffix.
 * Example: "Gabby & Esther Wedding" → "gabby-esther-wedding"
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

/**
 * Generates a short random suffix for slug uniqueness.
 */
export function randomSuffix(length = 4): string {
  return Math.random().toString(36).slice(2, 2 + length);
}
