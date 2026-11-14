// src/utils/phone.ts
// Phone/name/email checks for guest entry, with messages that tell the
// organiser exactly what format to use. Safe to import in the browser too.

export const PHONE_EXAMPLE = "08012345678";
export const PHONE_FORMAT_HINT =
  "Nigerian mobile number: 11 digits starting with 0 (e.g. 08012345678), or +234 followed by 10 digits (e.g. +2348012345678).";
export const NAME_FORMAT_HINT = "Full name using letters only, e.g. Adaeze Okafor.";
export const LINE_FORMAT_HINT = "Name, Phone (one guest per line), e.g. Adaeze Okafor, 08012345678";

/**
 * Normalizes a phone number to the 0XXXXXXXXXX format (Nigerian standard).
 * Handles international prefix (234 / +234), leading zero, or bare 10-digit numbers.
 */
export function normalizePhone(phone: string): string {
  const digits = phone.replace(/\D/g, "");
  if (digits.startsWith("234")) return `0${digits.slice(3)}`;
  if (digits.startsWith("0")) return digits;
  if (digits.length === 10) return `0${digits}`;
  return digits;
}

// 070x, 080x, 081x, 090x, 091x
const NG_MOBILE = /^0[789][01]\d{8}$/;

/** Validates a Nigerian mobile number (after normalizing). */
export function isValidPhone(phone: string): boolean {
  return NG_MOBILE.test(normalizePhone(phone));
}

/** Returns a helpful error for a bad phone number, or null if it's fine. */
export function phoneError(raw: string): string | null {
  const value = raw.trim();
  if (!value) return `Enter a phone number, e.g. ${PHONE_EXAMPLE}.`;
  if (/[^\d\s+\-().]/.test(value)) {
    return `"${value}" isn't a phone number. Use digits only. ${PHONE_FORMAT_HINT}`;
  }
  const n = normalizePhone(value);
  if (n.length < 11) {
    return `"${value}" is too short (${n.length} digits). ${PHONE_FORMAT_HINT}`;
  }
  if (n.length > 11) {
    return `"${value}" is too long (${n.length} digits). ${PHONE_FORMAT_HINT}`;
  }
  if (!NG_MOBILE.test(n)) {
    return `"${value}" isn't a Nigerian mobile number. It should start with 070, 080, 081, 090 or 091, e.g. ${PHONE_EXAMPLE}.`;
  }
  return null;
}

/** Returns a helpful error for a bad guest name, or null if it's fine. */
export function nameError(raw: string): string | null {
  const value = raw.trim();
  if (!value) return `Enter the guest's name. ${NAME_FORMAT_HINT}`;
  if (/\d/.test(value)) {
    return `"${value}" contains numbers. Names can't include digits; did the phone number go in the name box? ${NAME_FORMAT_HINT}`;
  }
  if (value.replace(/[^\p{L}]/gu, "").length < 2) return `"${value}" is too short. ${NAME_FORMAT_HINT}`;
  if (value.length > 80) return `That name is too long (max 80 characters).`;
  if (!/^[\p{L}\p{M}][\p{L}\p{M}\s.'’&()-]*$/u.test(value)) {
    return `"${value}" has characters that aren't allowed. Use letters, spaces, hyphens (-), apostrophes (') and full stops only.`;
  }
  return null;
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

export function emailError(raw: string | null | undefined): string | null {
  const value = (raw ?? "").trim();
  if (!value) return null; // optional
  return EMAIL_RE.test(value) ? null : `"${value}" isn't a valid email address. Use the format name@example.com, or leave it empty.`;
}

export type GuestRow = { name: string; phone: string; email?: string | null };
export type ParseResult = { rows: GuestRow[]; errors: string[]; invalid: number };

const looksLikePhone = (s: string) => /^[+\d][\d\s\-().]{6,}$/.test(s.trim());

/**
 * Validates rows of cells (from pasted text, CSV or Excel). Accepts
 * Name, Phone[, Email]; fixes swapped Name/Phone columns; skips a header row.
 * Every rejected row gets a message saying what's wrong and the right format.
 */
export function parseGuestRows(cellsList: string[][], firstLineNumber = 1): ParseResult {
  const rows: GuestRow[] = [];
  const errors: string[] = [];
  let invalid = 0;

  cellsList.forEach((rawCells, i) => {
    const lineNo = firstLineNumber + i;
    let cells = rawCells.map((c) => String(c ?? "").trim()).filter((c, idx) => c !== "" || idx < 2);
    if (cells.every((c) => !c)) return;

    // Header row like "Name, Phone, Email"
    if (i === 0 && /name/i.test(cells[0] ?? "") && /phone|number|mobile|tel/i.test(cells[1] ?? "")) return;

    const shown = cells.filter(Boolean).join(", ");

    // "Adaeze Okafor 08012345678" with no comma
    if (cells.length === 1 || !cells[1]) {
      const m = (cells[0] ?? "").match(/^(.*?)[\s]+(\+?[\d][\d\s\-]{8,})$/);
      if (m) cells = [m[1], m[2], ...cells.slice(2)];
      else {
        invalid++;
        errors.push(`Line ${lineNo} ("${shown}"): no phone number found. Use the format: ${LINE_FORMAT_HINT}`);
        return;
      }
    }

    let [name, phone, email] = cells;
    // Phone first, name second: swap
    if (looksLikePhone(name) && !looksLikePhone(phone)) [name, phone] = [phone, name];

    const problem = nameError(name) ?? phoneError(phone) ?? emailError(email);
    if (problem) {
      invalid++;
      errors.push(`Line ${lineNo} ("${shown}"): ${problem}`);
      return;
    }
    rows.push({ name: name.replace(/\s+/g, " "), phone: normalizePhone(phone), email: email?.trim() || null });
  });

  return { rows, errors, invalid };
}

/** Splits pasted text / CSV into cells (comma, tab, semicolon or | separated). */
export function parseGuestText(raw: string): ParseResult {
  const lines = raw.split(/\r?\n/);
  const cells = lines.map((l) => l.split(/[,\t;|]/));
  // Keep line numbers matching what the organiser sees, but drop blank lines.
  const kept: string[][] = [];
  const numbers: number[] = [];
  cells.forEach((c, i) => {
    if (c.join("").trim()) {
      kept.push(c);
      numbers.push(i + 1);
    }
  });
  const result: ParseResult = { rows: [], errors: [], invalid: 0 };
  kept.forEach((c, idx) => {
    const r = parseGuestRows([c], numbers[idx]);
    // parseGuestRows only skips a header on its own first row; do it here for line 1.
    if (idx === 0 && /name/i.test(c[0] ?? "") && /phone|number|mobile|tel/i.test(c[1] ?? "")) return;
    result.rows.push(...r.rows);
    result.errors.push(...r.errors);
    result.invalid += r.invalid;
  });
  return result;
}

/** Back-compat: valid rows only. */
export function parseBulkGuestText(raw: string): Array<{ name: string; phone: string }> {
  return parseGuestText(raw).rows.map(({ name, phone }) => ({ name, phone }));
}
