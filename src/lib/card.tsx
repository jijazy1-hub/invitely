// src/lib/card.tsx
// Renders the admission card as a PNG (1080 × 1600, portrait ticket).
// Used by: the guest's "Download card" button, the confirmation email attachment,
// and the organiser's "Preview card" button. Colours come from the event, which
// is what a template sets when it is applied.
import React from "react";
import { ImageResponse } from "next/og";
import QRCode from "qrcode";
import { loadFonts, clean, hex, inkOn, sizeFor, initials, validPhoto } from "@/lib/card-shared";
import type { CardDesign } from "@/lib/card-design";

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

export type RenderOptions = {
  /** The event's saved design. Missing or "classic" = the classic card below. */
  design?: CardDesign | null;
  /** Diagonal watermark text, e.g. on premium previews for free users. */
  watermark?: string | null;
};

const W = 1080;
const H = 1440;

const TYPE_LABELS: Record<string, string> = {
  WEDDING: "Wedding", BIRTHDAY: "Birthday", CONFERENCE: "Conference", CONCERT: "Concert",
  CHURCH: "Church Service", SEMINAR: "Seminar", VIP_PARTY: "VIP Party", BURIAL: "Funeral Service",
  PRIVATE_DINNER: "Private Dinner", OTHER: "Event",
};

// ─── Render ──────────────────────────────────────────────────────────────────
export async function renderCard(d: CardData, opts: RenderOptions = {}): Promise<ImageResponse> {
  if (opts.design && opts.design.layout !== "classic") {
    const { renderPremiumCard } = await import("@/lib/card-premium");
    return renderPremiumCard(d, opts.design, { watermark: opts.watermark ?? null });
  }
  if (opts.design) {
    // Classic layout with the designer's colours.
    d = { ...d, primaryColor: opts.design.colors.primary, secondaryColor: opts.design.colors.accent, accentColor: opts.design.colors.paper };
  }
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
export async function renderCardPng(d: CardData, opts: RenderOptions = {}): Promise<Buffer> {
  const res = await renderCard(d, opts);
  return Buffer.from(await res.arrayBuffer());
}
