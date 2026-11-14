// src/lib/card.tsx
// Renders the admission card as a PNG (1080 × 1600, portrait ticket).
// Used by: the guest's "Download card" button, the confirmation email attachment,
// and the organiser's "Preview card" button. Colours come from the event, which
// is what a template sets when it is applied.
import React from "react";
import { ImageResponse } from "next/og";
import QRCode from "qrcode";
import fs from "fs";
import path from "path";

export type CardData = {
  eventName: string;
  eventType: string;
  date: Date;
  time: string | null;
  venue: string;
  dressCode: string | null;
  primaryColor: string;
  secondaryColor: string;
  accentColor: string;
  guestName: string;
  seatNumber: number | null;
  code: string;
  /** data:image/jpeg|png URL (resized by the browser) or a Cloudinary https URL. */
  photo?: string | null;
};

const W = 1080;
const H = 1440;

const TYPE_LABELS: Record<string, string> = {
  WEDDING: "Wedding", BIRTHDAY: "Birthday", CONFERENCE: "Conference", CONCERT: "Concert",
  CHURCH: "Church Service", SEMINAR: "Seminar", VIP_PARTY: "VIP Party", BURIAL: "Funeral Service",
  PRIVATE_DINNER: "Private Dinner", OTHER: "Event",
};

// ─── Fonts (shipped to Vercel via outputFileTracingIncludes in next.config.js) ──
type Wt = 400 | 700;
type FontDef = { name: string; data: ArrayBuffer; weight: Wt; style: "normal" };
let fontCache: FontDef[] | null = null;

function readFont(rel: string): ArrayBuffer | null {
  try {
    const buf = fs.readFileSync(path.join(process.cwd(), "node_modules", rel));
    return buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength) as ArrayBuffer;
  } catch {
    return null;
  }
}

function loadFonts(): FontDef[] {
  if (fontCache) return fontCache;
  const list: [string, string, Wt][] = [];
  // Inter: Latin, Latin-ext and the Vietnamese subset, which carries the dotted
  // vowels used in Yoruba and Igbo names (ẹ, ọ, ṣ, ị, ụ).
  // Each subset gets its own family name: Satori only falls back between
  // differently-named fonts, so one shared name would drop the extra glyphs.
  const sansSubsets: [string, string][] = [["Sans", "latin"], ["SansExt", "latin-ext"], ["SansViet", "vietnamese"]];
  for (const [name, subset] of sansSubsets) {
    for (const w of [400, 700] as Wt[]) list.push([name, `@fontsource/inter/files/inter-${subset}-${w}-normal.woff`, w]);
  }
  list.push(["Serif", "@fontsource/cormorant-garamond/files/cormorant-garamond-latin-700-normal.woff", 700]);
  list.push(["SerifExt", "@fontsource/cormorant-garamond/files/cormorant-garamond-latin-ext-700-normal.woff", 700]);
  const fonts: FontDef[] = [];
  for (const [name, rel, weight] of list) {
    const data = readFont(rel);
    if (data && data.byteLength > 0) fonts.push({ name, data, weight, style: "normal" });
  }
  fontCache = fonts;
  return fonts;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────
/** Keep accents and Nigerian name characters; drop control chars and emoji (which would need a network fetch). */
function clean(s: string | null | undefined): string {
  return (s ?? "")
    .normalize("NFC")
    .replace(/[\u0000-\u001F\u007F]/g, "")
    .replace(/\p{Extended_Pictographic}|️|‍/gu, "")
    // Tone marks NFC couldn't merge into a letter (e.g. the grave on "ọ̀") render
    // as floating accents in the image library, so drop them.
    .replace(/[̀-ͯ]/g, "")
    .trim();
}

function hex(c: string, fallback: string): string {
  return /^#[0-9a-fA-F]{6}$/.test(c) ? c : fallback;
}

function luminance(c: string): number {
  const n = parseInt(c.slice(1), 16);
  const ch = [(n >> 16) & 255, (n >> 8) & 255, n & 255].map((v) => {
    const s = v / 255;
    return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * ch[0] + 0.7152 * ch[1] + 0.0722 * ch[2];
}

/** Dark text on light backgrounds, white text on dark ones. */
function inkOn(bg: string): string {
  return luminance(bg) > 0.45 ? "#1A1A1A" : "#FFFFFF";
}

function sizeFor(text: string, steps: [number, number][], min: number): number {
  for (const [maxLen, size] of steps) if (text.length <= maxLen) return size;
  return min;
}

function initials(name: string): string {
  return name.split(/\s+/).filter(Boolean).slice(0, 2).map((p) => p[0]!.toUpperCase()).join("");
}

function validPhoto(p: string | null | undefined): string | null {
  if (!p) return null;
  if (/^data:image\/(jpeg|jpg|png);base64,/.test(p)) return p;
  // Photos saved to Cloudinary (see src/lib/guest-photo.ts). Ask for a JPEG so the renderer can read it.
  if (/^https:\/\/res\.cloudinary\.com\//.test(p)) return p.replace("/upload/", "/upload/f_jpg,w_480,h_480,c_fill,g_face/");
  return null;
}

// ─── Render ──────────────────────────────────────────────────────────────────
export async function renderCard(d: CardData): Promise<ImageResponse> {
  const PRIMARY = hex(d.primaryColor, "#0A2810");
  const SECONDARY = hex(d.secondaryColor, "#B8860B");
  const PAPER = hex(d.accentColor, "#F8F4E3");
  const onPrimary = inkOn(PRIMARY);
  const onPaper = inkOn(PAPER);
  const muted = onPaper === "#FFFFFF" ? "rgba(255,255,255,0.7)" : "rgba(26,26,26,0.62)";

  const eventName = clean(d.eventName);
  const guestName = clean(d.guestName);
  const venue = clean(d.venue);
  const time = clean(d.time);
  const dress = clean(d.dressCode);
  const code = clean(d.code).toUpperCase();
  const photo = validPhoto(d.photo);
  const typeLabel = (TYPE_LABELS[d.eventType] ?? "Event").toUpperCase();
  const dateText = new Date(d.date).toLocaleDateString("en-GB", {
    weekday: "long", day: "numeric", month: "long", year: "numeric", timeZone: "UTC",
  });

  // Always black on white: coloured QR codes (e.g. dark-on-dark templates) fail to scan.
  const qr = await QRCode.toDataURL(code, { margin: 1, width: 600, errorCorrectionLevel: "M", color: { dark: "#000000", light: "#FFFFFF" } });

  const fonts = loadFonts();
  const SANS = "Sans, SansExt, SansViet";
  // Names in the title can carry Yoruba/Igbo letters the serif lacks; fall back to Inter for those.
  const SERIF = fonts.some((f) => f.name === "Serif") ? "Serif, SerifExt, SansViet, Sans" : SANS;

  const titleSize = sizeFor(eventName, [[16, 96], [24, 80], [34, 64], [48, 52]], 44);
  const nameSize = sizeFor(guestName, [[14, 64], [22, 54], [30, 44]], 36);

  const label = (text: string, color: string) => (
    <div style={{ display: "flex", fontSize: 22, fontWeight: 700, letterSpacing: 6, color }}>{text}</div>
  );

  return new ImageResponse(
    (
      <div style={{ display: "flex", width: W, height: H, background: PRIMARY, padding: 48, fontFamily: SANS }}>
        <div style={{ display: "flex", flexDirection: "column", width: "100%", height: "100%", background: PAPER, borderRadius: 40, overflow: "hidden", position: "relative" }}>
          {/* ── Header ── */}
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", background: PRIMARY, margin: 24, borderRadius: 28, padding: "56px 48px 52px", border: `3px solid ${SECONDARY}` }}>
            {label(`${typeLabel} · INVITATION`, SECONDARY)}
            <div style={{ display: "flex", textAlign: "center", justifyContent: "center", fontFamily: SERIF, fontWeight: 700, fontSize: titleSize, lineHeight: 1.05, color: onPrimary, marginTop: 22 }}>
              {eventName}
            </div>
            <div style={{ display: "flex", width: 160, height: 4, background: SECONDARY, marginTop: 28, marginBottom: 26, borderRadius: 2 }} />
            <div style={{ display: "flex", fontSize: 32, fontWeight: 700, color: onPrimary, textAlign: "center" }}>
              {time ? `${dateText} · ${time}` : dateText}
            </div>
            <div style={{ display: "flex", fontSize: 28, color: onPrimary, opacity: 0.85, marginTop: 10, textAlign: "center", justifyContent: "center" }}>
              {venue}
            </div>
          </div>

          {/* ── Guest ── */}
          <div style={{ display: "flex", alignItems: "center", padding: "28px 64px 36px" }}>
            {photo ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={photo} width={240} height={240} style={{ borderRadius: 120, border: `8px solid ${SECONDARY}`, objectFit: "cover" }} alt="" />
            ) : (
              <div style={{ display: "flex", width: 240, height: 240, borderRadius: 120, background: PRIMARY, border: `8px solid ${SECONDARY}`, alignItems: "center", justifyContent: "center", fontSize: 88, fontWeight: 700, color: onPrimary }}>
                {initials(guestName) || "G"}
              </div>
            )}
            <div style={{ display: "flex", flexDirection: "column", marginLeft: 48, flex: 1 }}>
              {label("ADMIT ONE", SECONDARY)}
              <div style={{ display: "flex", fontSize: nameSize, fontWeight: 700, color: onPaper, lineHeight: 1.1, marginTop: 12 }}>{guestName}</div>
              <div style={{ display: "flex", marginTop: 22 }}>
                <div style={{ display: "flex", background: PRIMARY, color: onPrimary, borderRadius: 999, padding: "12px 30px", fontSize: 30, fontWeight: 700, letterSpacing: 2 }}>
                  {d.seatNumber ? `SEAT ${d.seatNumber}` : "SEAT TBA"}
                </div>
              </div>
            </div>
          </div>

          {/* ── Tear line with notches ── */}
          <div style={{ display: "flex", alignItems: "center", position: "relative", height: 56 }}>
            <div style={{ display: "flex", position: "absolute", left: -28, width: 56, height: 56, borderRadius: 28, background: PRIMARY }} />
            <div style={{ display: "flex", flex: 1, marginLeft: 48, marginRight: 48, borderTop: `4px dashed ${SECONDARY}` }} />
            <div style={{ display: "flex", position: "absolute", right: -28, width: 56, height: 56, borderRadius: 28, background: PRIMARY }} />
          </div>

          {/* ── Check-in stub ── */}
          <div style={{ display: "flex", alignItems: "center", padding: "24px 64px 0", flex: 1 }}>
            <div style={{ display: "flex", background: "#FFFFFF", padding: 18, borderRadius: 24, border: `4px solid ${SECONDARY}` }}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={qr} width={330} height={330} alt="" />
            </div>
            <div style={{ display: "flex", flexDirection: "column", marginLeft: 48, flex: 1 }}>
              {label("CHECK-IN CODE", SECONDARY)}
              <div style={{ display: "flex", marginTop: 14, background: PRIMARY, borderRadius: 18, padding: "18px 24px", justifyContent: "center" }}>
                <div style={{ display: "flex", whiteSpace: "nowrap", fontSize: code.length > 10 ? 40 : 50, fontWeight: 700, letterSpacing: code.length > 10 ? 2 : 4, color: onPrimary }}>{code}</div>
              </div>
              <div style={{ display: "flex", fontSize: 24, color: muted, marginTop: 18, lineHeight: 1.35 }}>
                Show this QR code (or read out the code) at the entrance.
              </div>
              {dress ? (
                <div style={{ display: "flex", flexDirection: "column", marginTop: 24 }}>
                  {label("DRESS CODE", SECONDARY)}
                  <div style={{ display: "flex", fontSize: 30, fontWeight: 700, color: onPaper, marginTop: 6 }}>{dress}</div>
                </div>
              ) : null}
            </div>
          </div>

          {/* ── Footer ── */}
          <div style={{ display: "flex", justifyContent: "center", paddingBottom: 30, fontSize: 20, color: muted, letterSpacing: 3 }}>
            PERSONAL ADMISSION CARD · NOT TRANSFERABLE
          </div>
        </div>
      </div>
    ),
    { width: W, height: H, fonts: fonts.length ? fonts : undefined }
  );
}

/** PNG bytes, for email attachments. */
export async function renderCardPng(d: CardData): Promise<Buffer> {
  const res = await renderCard(d);
  return Buffer.from(await res.arrayBuffer());
}
