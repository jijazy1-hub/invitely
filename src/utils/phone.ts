// src/utils/phone.ts
// Reused and extended from the original wedding project

/**
 * Normalizes a phone number to the 0XXXXXXXXXX format (Nigerian standard).
 * Handles international prefix (234), leading zero, or bare 10-digit numbers.
 */
export function normalizePhone(phone: string): string {
  const digits = phone.replace(/\D/g, "");
  if (digits.startsWith("234")) return `0${digits.slice(3)}`;
  if (digits.startsWith("0")) return digits;
  if (digits.length === 10) return `0${digits}`;
  return digits;
}

/**
 * Validates that a normalized phone number is 11 digits starting with 0.
 */
export function isValidPhone(phone: string): boolean {
  const normalized = normalizePhone(phone);
  return /^0\d{10}$/.test(normalized);
}

/**
 * Parses a bulk import string like:
 *   "John Doe,08012345678\nMary Jane,08098765432"
 * Returns an array of { name, phone } objects, filtering out invalid entries.
 */
export function parseBulkGuestText(raw: string): Array<{ name: string; phone: string }> {
  const lines = raw.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
  const results: Array<{ name: string; phone: string }> = [];

  for (const line of lines) {
    // Support comma or tab-separated
    const parts = line.split(/[,\t]/).map((p) => p.trim());
    if (parts.length < 2) continue;

    const name = parts[0];
    const phone = normalizePhone(parts[1]);

    if (!name || !isValidPhone(phone)) continue;
    results.push({ name, phone });
  }

  return results;
}
