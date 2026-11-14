// src/utils/scan.ts
// What a scanned QR (or typed code) means. Safe in the browser and on the server.
//
// Cards made from now on encode a link, https://<site>/v/INV-XXXXXXXX, so any phone
// camera opens the verification screen. Older cards encode just "INV-XXXXXX".
// Both are accepted everywhere a code is read.

/** Pulls the check-in code out of a scanned link or typed text. */
export function extractCode(raw: string): string {
  const text = (raw ?? "").trim();
  const fromLink = text.match(/\/v\/([A-Za-z0-9-]{4,40})(?:[/?#]|$)/i);
  const code = fromLink ? fromLink[1] : text;
  return code.toUpperCase().replace(/\s+/g, "");
}

/** The link printed in a card's QR code. */
export function verifyLink(baseUrl: string, code: string): string {
  return `${baseUrl.replace(/\/+$/, "")}/v/${encodeURIComponent(code.toUpperCase())}`;
}
