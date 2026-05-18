// src/app/api/invite/[slug]/generate-card/route.tsx
// Migrated from /api/generate-card — now event-dynamic, reads colors + details from DB
import React from "react";
import { ImageResponse } from "next/og";
import prisma from "@/lib/prisma";

export const dynamic = "force-dynamic";
import QRCode from "qrcode";
import fs from "fs";
import path from "path";

export const runtime = "nodejs";

function safe(s: string | null | undefined): string {
  return (s ?? "").replace(/[^\x20-\x7E]/g, "").trim();
}

function loadFont(relativePath: string): ArrayBuffer | null {
  try {
    const full = path.join(process.cwd(), "node_modules", relativePath);
    return fs.readFileSync(full).buffer as ArrayBuffer;
  } catch {
    return null;
  }
}

function hexToRgb(hex: string) {
  const h = hex.replace("#", "");
  const r = parseInt(h.slice(0, 2), 16);
  const g = parseInt(h.slice(2, 4), 16);
  const b = parseInt(h.slice(4, 6), 16);
  return `rgb(${r},${g},${b})`;
}

type Ctx = { params: { slug: string } };

export async function POST(req: Request, { params }: Ctx) {
  try {
    const body = await req.json();
    const code = String(body.code ?? "").trim();
    const imageBase64 = (body.imageBase64 as string) || null;

    if (!code) return Response.json({ error: "Code required" }, { status: 400 });

    // Find the RSVP by unique code and load event details
    const rsvp = await prisma.rsvp.findUnique({
      where: { uniqueCode: code },
      include: {
        guest: {
          include: {
            event: {
              select: {
                name: true, date: true, time: true, venue: true, dressCode: true,
                primaryColor: true, secondaryColor: true, accentColor: true,
                eventType: true,
              },
            },
          },
        },
      },
    });

    if (!rsvp || rsvp.status !== "CONFIRMED") {
      return Response.json({ error: "Invalid or unconfirmed invitation code" }, { status: 404 });
    }

    const { guest } = rsvp;
    const { event } = guest;

    const qrDataUrl = await QRCode.toDataURL(code, {
      margin: 2,
      width: 220,
      color: { dark: event.primaryColor, light: event.accentColor },
    });

    const fontBold    = loadFont("@fontsource/cormorant-garamond/files/cormorant-garamond-latin-700-normal.woff2");
    const fontRegular = loadFont("@fontsource/cormorant-garamond/files/cormorant-garamond-latin-400-normal.woff2");

    const title  = safe(event.name);
    const date   = safe(new Date(event.date).toLocaleDateString("en-NG", { weekday: "long", year: "numeric", month: "long", day: "numeric" }));
    const time   = safe(event.time ?? "");
    const venue  = safe(event.venue);
    const dress  = safe(event.dressCode ?? "Smart Casual");
    const name   = safe(guest.name);
    const seat   = safe(String(rsvp.seatNumber ?? "TBA"));
    const ucode  = safe(code);

    const BG    = event.accentColor;
    const GREEN = event.primaryColor;
    const GOLD  = event.secondaryColor;
    const W = 800, H = 1150;

    type Wt = 100|200|300|400|500|600|700|800|900;
    const fonts: { name: string; data: ArrayBuffer; weight: Wt; style: "normal" }[] = [];
    if (fontBold    && fontBold.byteLength > 0)    fonts.push({ name: "Serif", data: fontBold,    weight: 700, style: "normal" });
    if (fontRegular && fontRegular.byteLength > 0)  fonts.push({ name: "Serif", data: fontRegular, weight: 400, style: "normal" });
    const ff = fonts.length > 0 ? "Serif" : "Georgia, serif";

    return new ImageResponse(
      (
        <div style={{ display: "flex", width: W, height: H, background: BG, position: "relative", fontFamily: ff }}>
          {/* Borders */}
          <div style={{ position: "absolute", top: 10, left: 10, right: 10, bottom: 10, border: `3px solid ${GREEN}`, display: "flex" }} />
          <div style={{ position: "absolute", top: 20, left: 20, right: 20, bottom: 20, border: `1px solid ${GOLD}`, display: "flex" }} />

          {/* Corner diamonds */}
          {[
            { top: 7, left: 7 }, { top: 7, right: 7 },
            { bottom: 7, left: 7 }, { bottom: 7, right: 7 },
          ].map((pos, i) => (
            <div key={i} style={{ position: "absolute", ...pos, width: 10, height: 10, background: GOLD, transform: "rotate(45deg)", display: "flex" }} />
          ))}

          <div style={{ display: "flex", flexDirection: "column", width: "100%", padding: "36px 44px 28px" }}>
            {/* Header */}
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
              <div style={{ fontSize: 10, letterSpacing: 8, color: GOLD, fontWeight: 700, marginBottom: 6 }}>
                INVITATION
              </div>
              <div style={{ fontSize: 56, color: GREEN, fontWeight: 700, lineHeight: 1.1, marginBottom: 6, textAlign: "center" }}>
                {title}
              </div>
              <div style={{ width: 500, height: 1, background: GOLD, marginBottom: 8 }} />
              <div style={{ fontSize: 12, color: "#4A3D2A", marginBottom: 4 }}>
                You are cordially invited
              </div>
            </div>

            {/* Event bar */}
            <div style={{ display: "flex", marginTop: 18, border: `1px solid ${GOLD}`, background: BG }}>
              <div style={{ display: "flex", flex: 1, flexDirection: "column", alignItems: "center", padding: "14px 8px" }}>
                <div style={{ fontSize: 9, letterSpacing: 4, fontWeight: 700, color: GOLD, marginBottom: 6 }}>DATE</div>
                <div style={{ fontSize: 11, fontWeight: 700, color: "#1A1208", textAlign: "center" }}>{date}</div>
              </div>
              {time && (
                <>
                  <div style={{ width: 1, background: GOLD }} />
                  <div style={{ display: "flex", flex: 1, flexDirection: "column", alignItems: "center", padding: "14px 8px" }}>
                    <div style={{ fontSize: 9, letterSpacing: 4, fontWeight: 700, color: GOLD, marginBottom: 6 }}>TIME</div>
                    <div style={{ fontSize: 12, fontWeight: 700, color: "#1A1208" }}>{time}</div>
                  </div>
                </>
              )}
              <div style={{ width: 1, background: GOLD }} />
              <div style={{ display: "flex", flex: 1, flexDirection: "column", alignItems: "center", padding: "14px 8px" }}>
                <div style={{ fontSize: 9, letterSpacing: 4, fontWeight: 700, color: GOLD, marginBottom: 6 }}>VENUE</div>
                <div style={{ fontSize: 11, fontWeight: 700, color: "#1A1208", textAlign: "center" }}>{venue}</div>
              </div>
            </div>

            {/* RSVP label */}
            <div style={{ display: "flex", alignItems: "center", marginTop: 16, marginBottom: 16 }}>
              <div style={{ flex: 1, height: 1, background: GOLD }} />
              <div style={{ fontSize: 11, letterSpacing: 6, fontWeight: 700, color: GOLD, marginLeft: 14, marginRight: 14 }}>
                ADMISSION CARD
              </div>
              <div style={{ flex: 1, height: 1, background: GOLD }} />
            </div>

            {/* Body: photo + details */}
            <div style={{ display: "flex", gap: 24, flex: 1 }}>
              {/* Photo */}
              <div style={{ display: "flex", flexDirection: "column", width: 250 }}>
                {imageBase64 ? (
                  <div style={{ display: "flex", flexDirection: "column" }}>
                    <div style={{ background: GREEN, padding: 6, display: "flex" }}>
                      <div style={{ border: `2px solid ${GOLD}`, padding: 3, display: "flex", background: "white" }}>
                        <img src={imageBase64} width={224} height={272} alt="guest" />
                      </div>
                    </div>
                    <div style={{ background: GREEN, display: "flex", justifyContent: "center", padding: "6px 0" }}>
                      <div style={{ fontSize: 8, letterSpacing: 6, fontWeight: 700, color: BG }}>G U E S T</div>
                    </div>
                  </div>
                ) : (
                  <div style={{ width: 250, height: 300, background: "#E8E0C8", border: `4px solid ${GREEN}`, display: "flex", alignItems: "center", justifyContent: "center" }}>
                    <div style={{ fontSize: 12, color: "#4A3D2A" }}>No Photo</div>
                  </div>
                )}
              </div>

              {/* Details */}
              <div style={{ display: "flex", flexDirection: "column", flex: 1, gap: 16 }}>
                <div style={{ display: "flex", flexDirection: "column" }}>
                  <div style={{ fontSize: 9, letterSpacing: 4, fontWeight: 700, color: GOLD, marginBottom: 4 }}>GUEST NAME</div>
                  <div style={{ fontSize: 28, fontWeight: 700, color: "#1A1208" }}>{name}</div>
                </div>
                <div style={{ display: "flex", flexDirection: "column" }}>
                  <div style={{ fontSize: 9, letterSpacing: 4, fontWeight: 700, color: GOLD, marginBottom: 4 }}>SEAT NUMBER</div>
                  <div style={{ fontSize: 28, fontWeight: 700, color: "#1A1208" }}>{seat}</div>
                </div>
                <div style={{ display: "flex", flexDirection: "column" }}>
                  <div style={{ fontSize: 9, letterSpacing: 4, fontWeight: 700, color: GOLD, marginBottom: 6 }}>UNIQUE CODE</div>
                  <div style={{ background: GREEN, border: `1px solid ${GOLD}`, padding: "6px 14px", display: "flex", width: 170 }}>
                    <div style={{ fontSize: 15, fontWeight: 700, color: BG, letterSpacing: 2 }}>{ucode}</div>
                  </div>
                </div>
                <div style={{ display: "flex", flexDirection: "column", marginTop: 6 }}>
                  <div style={{ background: GREEN, padding: 4, display: "flex", width: 146 }}>
                    <div style={{ border: `2px solid ${GOLD}`, display: "flex", background: "#F5F0E0" }}>
                      <img src={qrDataUrl} width={130} height={130} alt="qr" />
                    </div>
                  </div>
                  <div style={{ fontSize: 8, letterSpacing: 4, fontWeight: 700, color: "#4A3D2A", marginTop: 6 }}>SCAN TO VERIFY</div>
                </div>
              </div>
            </div>

            {/* Footer */}
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", marginTop: 20 }}>
              <div style={{ display: "flex", alignItems: "center", width: "100%", marginBottom: 10 }}>
                <div style={{ flex: 1, height: 1, background: GOLD }} />
                <div style={{ width: 6, height: 6, background: GOLD, transform: "rotate(45deg)", display: "flex", marginLeft: 10, marginRight: 10 }} />
                <div style={{ flex: 1, height: 1, background: GOLD }} />
              </div>
              {dress && (
                <>
                  <div style={{ fontSize: 9, letterSpacing: 5, fontWeight: 700, color: GOLD, marginBottom: 4 }}>DRESS CODE</div>
                  <div style={{ fontSize: 15, color: "#1A1208", marginBottom: 10 }}>{dress}</div>
                </>
              )}
              <div style={{ fontSize: 10, color: "#4A3D2A", marginTop: 4 }}>
                Please present this card at the entrance for admission
              </div>
            </div>
          </div>
        </div>
      ),
      { width: W, height: H, fonts: fonts.length > 0 ? fonts : undefined }
    );
  } catch (err) {
    console.error("/api/invite/[slug]/generate-card error:", err);
    return Response.json({ error: String(err) }, { status: 500 });
  }
}
