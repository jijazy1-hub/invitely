// src/lib/card-premium.tsx
// Premium admission-card layouts made in the Card Designer:
//   elegant – faded background photo, floral corners, script title (like a printed wedding card)
//   royal   – dark card, double gold border, art-deco corners, centred
//   modern  – big photo banner, bold type, photo overlapping the banner
//   minimal – white space, fine lines, small photo
// All are 1080 × 1500 PNGs with the QR code always black-on-white so it scans.
import React from "react";
import { ImageResponse } from "next/og";
import QRCode from "qrcode";
import type { CardData } from "@/lib/card";
import type { CardDesign, Frame, Ornament } from "@/lib/card-design";
import {
  loadFonts, FAMILY, clean, inkOn, rgba, sizeFor, initials, validPhoto, validBackground, svgDataUrl, formatEventDate,
} from "@/lib/card-shared";

const W = 1080;
const H = 1500;

type Ctx = {
  d: CardData;
  design: CardDesign;
  c: CardDesign["colors"];
  title: string;
  header: string;
  subtitle: string;
  footer: string;
  guestName: string;
  venue: string;
  dress: string;
  code: string;
  dateLine: string;
  photo: string | null;
  bg: string | null;
  qr: string;
  titleFamily: string;
  muted: string;
  onPrimary: string;
};

// ─── Ornament artwork (SVG) ──────────────────────────────────────────────────
const LEAF = "M0 0 C 7 -9, 22 -9, 30 0 C 22 9, 7 9, 0 0 Z";

/** Gold vines with leaves, drawn for the top-left corner and mirrored for the others. */
function floralCorner(gold: string, leaf: string, size = 340): string {
  const leaves: string[] = [];
  const topVine = [[64, 31, -32], [96, 34, 28], [128, 33, -30], [160, 30, 30], [196, 29, -28], [232, 27, 26], [266, 25, -24]];
  for (const [x, y, a] of topVine) {
    leaves.push(`<path d="${LEAF}" transform="translate(${x} ${y}) rotate(${a}) scale(1.15)" fill="${leaf}" stroke="${gold}" stroke-width="0.8"/>`);
    leaves.push(`<path d="${LEAF}" transform="translate(${y} ${x}) rotate(${90 - a}) scale(1.15)" fill="${leaf}" stroke="${gold}" stroke-width="0.8"/>`);
  }
  const art = `
    <g fill="none" stroke="${gold}" stroke-linecap="round">
      <path d="M30 30 C 90 26, 150 40, 210 30 S 290 20, 318 32" stroke-width="3"/>
      <path d="M30 30 C 26 90, 40 150, 30 210 S 20 290, 32 318" stroke-width="3"/>
      <path d="M318 32 c 10 6 6 22 -6 20 c -9 -2 -8 -14 1 -13" stroke-width="2.4"/>
      <path d="M32 318 c 6 10 22 6 20 -6 c -2 -9 -14 -8 -13 1" stroke-width="2.4"/>
      <path d="M46 46 C 86 58, 118 72, 126 104 C 131 126, 110 136, 99 122 C 91 111, 102 98, 113 104" stroke-width="2.2"/>
      <path d="M46 46 C 58 86, 72 118, 104 126 C 126 131, 136 110, 122 99 C 111 91, 98 102, 104 113" stroke-width="2.2"/>
      <path d="M60 40 C 100 46, 140 60, 160 52" stroke-width="1.4" opacity="0.8"/>
      <path d="M40 60 C 46 100, 60 140, 52 160" stroke-width="1.4" opacity="0.8"/>
    </g>
    ${leaves.join("")}
    <circle cx="30" cy="30" r="13" fill="none" stroke="${gold}" stroke-width="2"/>
    <circle cx="30" cy="30" r="6" fill="${gold}"/>
    <circle cx="150" cy="58" r="3" fill="${gold}"/><circle cx="58" cy="150" r="3" fill="${gold}"/>
    <circle cx="210" cy="44" r="2.5" fill="${gold}"/><circle cx="44" cy="210" r="2.5" fill="${gold}"/>`;
  return svgDataUrl(`<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 340 340">${art}</svg>`);
}

function linesCorner(gold: string, size = 170): string {
  const art = `
    <g fill="none" stroke="${gold}" stroke-linecap="square">
      <path d="M20 150 V20 H150" stroke-width="3"/>
      <path d="M34 120 V34 H120" stroke-width="1.5"/>
    </g>
    <rect x="13" y="13" width="14" height="14" transform="rotate(45 20 20)" fill="${gold}"/>
    <circle cx="150" cy="20" r="4" fill="${gold}"/><circle cx="20" cy="150" r="4" fill="${gold}"/>`;
  return svgDataUrl(`<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 170 170">${art}</svg>`);
}

function decoCorner(gold: string, size = 230): string {
  const rays = Array.from({ length: 7 }, (_, i) => {
    const a = (Math.PI / 2) * (i / 6);
    return `<line x1="48" y1="48" x2="${48 + Math.cos(a) * 74}" y2="${48 + Math.sin(a) * 74}" stroke="${gold}" stroke-width="1.4"/>`;
  }).join("");
  const art = `
    <g fill="none" stroke="${gold}">
      <path d="M16 214 V16 H214" stroke-width="3"/>
      <path d="M30 180 V30 H180" stroke-width="1.5"/>
      <path d="M48 140 V48 H140" stroke-width="1.5"/>
      <path d="M48 122 A 74 74 0 0 0 122 48" stroke-width="2"/>
    </g>
    ${rays}
    <rect x="9" y="9" width="14" height="14" transform="rotate(45 16 16)" fill="${gold}"/>`;
  return svgDataUrl(`<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 230 230">${art}</svg>`);
}

/** Ornate ring that sits over a round photo: double line, beaded ring, small leaves. */
function ornateRing(gold: string, leaf: string): string {
  const dots = Array.from({ length: 40 }, (_, i) => {
    const a = (i / 40) * Math.PI * 2;
    return `<circle cx="${150 + Math.cos(a) * 141}" cy="${150 + Math.sin(a) * 141}" r="2.4" fill="${gold}"/>`;
  }).join("");
  const leaves = [0, 90, 180, 270].map((deg) =>
    `<g transform="rotate(${deg} 150 150)">
       <path d="${LEAF}" transform="translate(150 4) rotate(-150) scale(0.9)" fill="${leaf}" stroke="${gold}" stroke-width="0.8"/>
       <path d="${LEAF}" transform="translate(150 4) rotate(-30) scale(0.9)" fill="${leaf}" stroke="${gold}" stroke-width="0.8"/>
       <circle cx="150" cy="6" r="4" fill="${gold}"/>
     </g>`).join("");
  const art = `
    <circle cx="150" cy="150" r="146" fill="none" stroke="${gold}" stroke-width="3"/>
    <circle cx="150" cy="150" r="134" fill="none" stroke="${gold}" stroke-width="1.5"/>
    <circle cx="150" cy="150" r="125" fill="none" stroke="${gold}" stroke-width="5"/>
    ${dots}${leaves}`;
  return svgDataUrl(`<svg xmlns="http://www.w3.org/2000/svg" width="300" height="300" viewBox="0 0 300 300">${art}</svg>`);
}

function mirrored(src: string, size: number, corner: "tl" | "tr" | "bl" | "br", inset: number) {
  const pos: React.CSSProperties = { position: "absolute", width: size, height: size };
  if (corner[0] === "t") pos.top = inset; else pos.bottom = inset;
  if (corner[1] === "l") pos.left = inset; else pos.right = inset;
  const flip = { tl: "", tr: "scaleX(-1)", bl: "scaleY(-1)", br: "scale(-1, -1)" }[corner];
  // eslint-disable-next-line @next/next/no-img-element
  if (flip) pos.transform = flip;
  return <img key={corner} src={src} width={size} height={size} style={pos} alt="" />;
}

function corners(kind: Ornament, gold: string, leaf: string, scale = 1, inset = 14) {
  if (kind === "none") return null;
  const size = Math.round((kind === "floral" ? 330 : kind === "deco" ? 230 : 170) * scale);
  const src = kind === "floral" ? floralCorner(gold, leaf, size) : kind === "deco" ? decoCorner(gold, size) : linesCorner(gold, size);
  return (["tl", "tr", "bl", "br"] as const).map((k) => mirrored(src, size, k, inset));
}

// ─── Building blocks ─────────────────────────────────────────────────────────
function GuestPhoto({ ctx, size, frame, ringColor }: { ctx: Ctx; size: number; frame: Frame; ringColor?: string }) {
  const { c, photo, guestName, onPrimary } = ctx;
  const gold = ringColor ?? c.accent;
  const inner = frame === "ornate" ? Math.round(size * 0.82) : size;
  const radius = frame === "rounded" ? Math.round(inner * 0.14) : inner / 2;
  const border = frame === "ornate" ? 0 : Math.max(6, Math.round(size * 0.03));
  const face = photo ? (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={photo} width={inner} height={inner} style={{ width: inner, height: inner, borderRadius: radius, objectFit: "cover", ...(border ? { border: `${border}px solid ${gold}` } : {}) }} alt="" />
  ) : (
    <div style={{ display: "flex", width: inner, height: inner, borderRadius: radius, background: c.primary, alignItems: "center", justifyContent: "center", color: onPrimary, fontFamily: FAMILY.sans, fontWeight: 700, fontSize: Math.round(inner * 0.36), ...(border ? { border: `${border}px solid ${gold}` } : {}) }}>
      {initials(guestName) || "G"}
    </div>
  );
  if (frame !== "ornate") return face;
  return (
    <div style={{ display: "flex", position: "relative", width: size, height: size, alignItems: "center", justifyContent: "center" }}>
      {face}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={ornateRing(gold, c.primary)} width={size} height={size} style={{ position: "absolute", top: 0, left: 0, width: size, height: size }} alt="" />
    </div>
  );
}

function QrBox({ ctx, size, border }: { ctx: Ctx; size: number; border?: string }) {
  return (
    <div style={{ display: "flex", background: "#FFFFFF", padding: Math.round(size * 0.05), borderRadius: 20, border: `4px solid ${border ?? ctx.c.accent}` }}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={ctx.qr} width={size} height={size} alt="" />
    </div>
  );
}

function Label({ text, color, size = 26, family = FAMILY.sans, spacing = 6 }: { text: string; color: string; size?: number; family?: string; spacing?: number }) {
  return <div style={{ display: "flex", fontFamily: family, fontSize: size, fontWeight: 700, letterSpacing: spacing, color }}>{text}</div>;
}

function CodePill({ ctx, bg, fg, border }: { ctx: Ctx; bg: string; fg: string; border?: string }) {
  const long = ctx.code.length > 10;
  return (
    <div style={{ display: "flex", background: bg, borderRadius: 16, padding: "14px 26px", ...(border ? { border: `3px solid ${border}` } : {}), justifyContent: "center" }}>
      <div style={{ display: "flex", whiteSpace: "nowrap", fontFamily: FAMILY.sans, fontWeight: 700, fontSize: long ? 40 : 48, letterSpacing: long ? 2 : 4, color: fg }}>{ctx.code}</div>
    </div>
  );
}

function SeatPill({ ctx, bg, fg, border }: { ctx: Ctx; bg: string; fg: string; border?: string }) {
  if (!ctx.design.showSeat) return null;
  return (
    <div style={{ display: "flex" }}>
      <div style={{ display: "flex", background: bg, color: fg, borderRadius: 999, padding: "12px 34px", ...(border ? { border: `3px solid ${border}` } : {}), fontFamily: FAMILY.sans, fontSize: 32, fontWeight: 700, letterSpacing: 2 }}>
        {ctx.d.seatNumber ? `SEAT ${ctx.d.seatNumber}` : "SEAT TBA"}
      </div>
    </div>
  );
}

function Background({ ctx, w, h, fadeColor }: { ctx: Ctx; w: number; h: number; fadeColor: string }) {
  if (!ctx.bg) return null;
  return (
    <>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={ctx.bg} width={w} height={h} style={{ position: "absolute", top: 0, left: 0, width: w, height: h, objectFit: "cover" }} alt="" />
      <div style={{ display: "flex", position: "absolute", top: 0, left: 0, width: w, height: h, background: rgba(fadeColor, ctx.design.backgroundFade / 100) }} />
    </>
  );
}

function Notches({ color, top, width }: { color: string; top: number; width: number }) {
  // Positioned from the left on both sides: the image library ignores "right" here.
  return (
    <>
      <div style={{ display: "flex", position: "absolute", left: -30, top, width: 60, height: 60, borderRadius: 30, background: color }} />
      <div style={{ display: "flex", position: "absolute", left: width - 30, top, width: 60, height: 60, borderRadius: 30, background: color }} />
    </>
  );
}

function titleSize(ctx: Ctx, base: number): number {
  const t = ctx.title;
  const scale = ctx.design.titleFont === "script" ? 1 : ctx.design.titleFont === "caps" ? 0.68 : 0.8;
  return Math.round(sizeFor(t, [[12, base], [18, base * 0.84], [26, base * 0.68], [36, base * 0.54]], base * 0.46) * scale);
}

// ─── Layouts ─────────────────────────────────────────────────────────────────
function Elegant(ctx: Ctx) {
  const { c, design } = ctx;
  const CW = W - 60;
  const CH = H - 60;
  const nameSize = sizeFor(ctx.guestName, [[12, 76], [18, 64], [26, 54]], 46);
  return (
    <div style={{ display: "flex", width: W, height: H, background: c.primary, padding: 30 }}>
      <div style={{ display: "flex", position: "relative", width: CW, height: CH, background: c.paper, borderRadius: 28, overflow: "hidden" }}>
        <Background ctx={ctx} w={CW} h={CH} fadeColor={c.paper} />
        <div style={{ display: "flex", position: "absolute", top: 26, left: 26, right: 26, bottom: 26, border: `2px solid ${c.accent}`, borderRadius: 18 }} />
        <div style={{ display: "flex", position: "absolute", top: 38, left: 38, right: 38, bottom: 38, border: `1px solid ${rgba(c.accent, 0.6)}`, borderRadius: 12 }} />
        {corners(design.ornament, c.accent, c.primary, 0.92, 16)}

        <div style={{ display: "flex", flexDirection: "column", position: "absolute", top: 0, left: 0, width: CW, height: CH, alignItems: "center", paddingTop: 108 }}>
          {ctx.header ? <div style={{ display: "flex", fontFamily: FAMILY.caps, fontWeight: 700, fontSize: 30, letterSpacing: 6, color: c.ink }}>{ctx.header}</div> : null}
          <div style={{ display: "flex", fontFamily: ctx.titleFamily, fontSize: titleSize(ctx, 132), color: c.accent, lineHeight: 1.12, marginTop: 4, textAlign: "center", justifyContent: "center", maxWidth: 820 }}>
            {ctx.title}
          </div>
          {ctx.subtitle ? <div style={{ display: "flex", fontFamily: FAMILY.serif, fontWeight: 700, fontSize: 52, color: c.ink, marginTop: 2 }}>{ctx.subtitle}</div> : null}
          <div style={{ display: "flex", fontFamily: FAMILY.sans, fontSize: 29, letterSpacing: 2, color: c.ink, marginTop: 12 }}>{ctx.dateLine.toUpperCase()}</div>
          {design.showVenue ? <div style={{ display: "flex", fontFamily: FAMILY.sans, fontSize: 25, color: ctx.muted, marginTop: 6, textAlign: "center", maxWidth: 800, justifyContent: "center" }}>{ctx.venue}</div> : null}

          <div style={{ display: "flex", alignItems: "center", width: CW, padding: "0 110px", marginTop: 40 }}>
            <GuestPhoto ctx={ctx} size={290} frame={design.frame} />
            <div style={{ display: "flex", flexDirection: "column", marginLeft: 44, flex: 1 }}>
              <Label text="ADMIT ONE" color={c.accent} size={30} family={FAMILY.caps} />
              <div style={{ display: "flex", fontFamily: FAMILY.serif, fontWeight: 700, fontSize: nameSize, color: c.ink, lineHeight: 1.08, marginTop: 8 }}>{ctx.guestName}</div>
              <div style={{ display: "flex", marginTop: 20 }}>
                <SeatPill ctx={ctx} bg={c.primary} fg={ctx.onPrimary} border={c.accent} />
              </div>
            </div>
          </div>

          <div style={{ display: "flex", position: "relative", width: CW, height: 60, alignItems: "center", marginTop: 34 }}>
            <Notches color={c.primary} top={0} width={CW} />
            <div style={{ display: "flex", flex: 1, margin: "0 60px", borderTop: `4px dashed ${rgba(c.accent, 0.85)}` }} />
          </div>

          <div style={{ display: "flex", alignItems: "center", width: CW, padding: "0 110px", marginTop: 30 }}>
            <QrBox ctx={ctx} size={290} />
            <div style={{ display: "flex", flexDirection: "column", marginLeft: 44, flex: 1 }}>
              <Label text="CHECK-IN CODE" color={c.accent} size={28} family={FAMILY.caps} spacing={4} />
              <div style={{ display: "flex", marginTop: 12 }}>
                <CodePill ctx={ctx} bg={c.primary} fg={ctx.onPrimary} border={c.accent} />
              </div>
              <div style={{ display: "flex", fontFamily: FAMILY.sans, fontSize: 24, color: ctx.muted, marginTop: 16, lineHeight: 1.35 }}>Show this QR code (or read out the code) at the entrance.</div>
              {design.showDressCode && ctx.dress ? (
                <div style={{ display: "flex", flexDirection: "column", marginTop: 18 }}>
                  <Label text="DRESS CODE" color={c.accent} size={22} family={FAMILY.caps} spacing={4} />
                  <div style={{ display: "flex", fontFamily: FAMILY.sans, fontWeight: 700, fontSize: 28, color: c.ink, marginTop: 4 }}>{ctx.dress}</div>
                </div>
              ) : null}
            </div>
          </div>
        </div>

        {ctx.footer ? (
          <div style={{ display: "flex", position: "absolute", bottom: 62, left: 0, width: CW, justifyContent: "center", fontFamily: FAMILY.sans, fontSize: 21, letterSpacing: 3, color: ctx.muted }}>{ctx.footer}</div>
        ) : null}
      </div>
    </div>
  );
}

function Royal(ctx: Ctx) {
  const { c, design } = ctx;
  const CW = W - 60;
  const CH = H - 60;
  const nameSize = sizeFor(ctx.guestName, [[14, 66], [22, 56]], 46);
  return (
    <div style={{ display: "flex", width: W, height: H, background: c.primary, padding: 30 }}>
      <div style={{ display: "flex", position: "relative", width: CW, height: CH, background: c.paper, borderRadius: 20, overflow: "hidden" }}>
        <Background ctx={ctx} w={CW} h={CH} fadeColor={c.paper} />
        <div style={{ display: "flex", position: "absolute", top: 28, left: 28, right: 28, bottom: 28, border: `3px solid ${c.accent}` }} />
        <div style={{ display: "flex", position: "absolute", top: 42, left: 42, right: 42, bottom: 42, border: `1px solid ${c.accent}` }} />
        {corners(design.ornament, c.accent, c.primary, 0.9, 20)}

        <div style={{ display: "flex", flexDirection: "column", position: "absolute", top: 0, left: 0, width: CW, height: CH, alignItems: "center", paddingTop: 100 }}>
          {ctx.header ? <Label text={ctx.header} color={c.accent} size={28} family={FAMILY.caps} spacing={8} /> : null}
          <div style={{ display: "flex", fontFamily: ctx.titleFamily, fontWeight: 700, fontSize: titleSize(ctx, 120), color: c.accent, lineHeight: 1.1, marginTop: 10, textAlign: "center", justifyContent: "center", maxWidth: 820 }}>{ctx.title}</div>
          <div style={{ display: "flex", alignItems: "center", marginTop: 16 }}>
            <div style={{ display: "flex", width: 170, height: 2, background: c.accent }} />
            <div style={{ display: "flex", width: 14, height: 14, background: c.accent, transform: "rotate(45deg)", margin: "0 16px" }} />
            <div style={{ display: "flex", width: 170, height: 2, background: c.accent }} />
          </div>
          {ctx.subtitle ? <div style={{ display: "flex", fontFamily: FAMILY.caps, fontWeight: 700, fontSize: 34, letterSpacing: 6, color: c.ink, marginTop: 18 }}>{ctx.subtitle}</div> : null}
          <div style={{ display: "flex", fontFamily: FAMILY.sans, fontSize: 27, letterSpacing: 2, color: c.ink, marginTop: 12, opacity: 0.9 }}>{ctx.dateLine.toUpperCase()}</div>
          {design.showVenue ? <div style={{ display: "flex", fontFamily: FAMILY.sans, fontSize: 24, color: ctx.muted, marginTop: 6, textAlign: "center", maxWidth: 800, justifyContent: "center" }}>{ctx.venue}</div> : null}

          <div style={{ display: "flex", marginTop: 34 }}>
            <GuestPhoto ctx={ctx} size={250} frame={design.frame} />
          </div>
          <div style={{ display: "flex", marginTop: 18 }}><Label text="ADMIT ONE" color={c.accent} size={24} family={FAMILY.caps} spacing={8} /></div>
          <div style={{ display: "flex", fontFamily: FAMILY.serif, fontWeight: 700, fontSize: nameSize, color: c.ink, marginTop: 4, textAlign: "center" }}>{ctx.guestName}</div>
          <div style={{ display: "flex", marginTop: 14 }}>
            <SeatPill ctx={ctx} bg={c.accent} fg={inkOn(c.accent)} />
          </div>

          <div style={{ display: "flex", alignItems: "center", marginTop: 34 }}>
            <QrBox ctx={ctx} size={250} />
            <div style={{ display: "flex", flexDirection: "column", marginLeft: 40, width: 400 }}>
              <Label text="CHECK-IN CODE" color={c.accent} size={24} family={FAMILY.caps} spacing={4} />
              <div style={{ display: "flex", marginTop: 12 }}>
                <CodePill ctx={ctx} bg={c.primary} fg={inkOn(c.primary)} border={c.accent} />
              </div>
              <div style={{ display: "flex", fontFamily: FAMILY.sans, fontSize: 22, color: ctx.muted, marginTop: 14, lineHeight: 1.35 }}>Show this QR code at the entrance.</div>
              {design.showDressCode && ctx.dress ? (
                <div style={{ display: "flex", fontFamily: FAMILY.sans, fontSize: 24, color: c.ink, marginTop: 10 }}>{`Dress code: ${ctx.dress}`}</div>
              ) : null}
            </div>
          </div>
        </div>
        {ctx.footer ? (
          <div style={{ display: "flex", position: "absolute", bottom: 64, left: 0, width: CW, justifyContent: "center", fontFamily: FAMILY.caps, fontSize: 20, letterSpacing: 4, color: ctx.muted }}>{ctx.footer}</div>
        ) : null}
      </div>
    </div>
  );
}

function Modern(ctx: Ctx) {
  const { c, design } = ctx;
  const HERO = 640;
  const onHero = "#FFFFFF";
  const nameSize = sizeFor(ctx.guestName, [[14, 74], [22, 60]], 48);
  return (
    <div style={{ display: "flex", flexDirection: "column", position: "relative", width: W, height: H, background: c.paper }}>
      {/* Hero */}
      <div style={{ display: "flex", position: "relative", width: W, height: HERO, background: c.primary, overflow: "hidden" }}>
        {ctx.bg ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={ctx.bg} width={W} height={HERO} style={{ position: "absolute", top: 0, left: 0, width: W, height: HERO, objectFit: "cover" }} alt="" />
        ) : (
          <>
            <div style={{ display: "flex", position: "absolute", width: 620, height: 620, borderRadius: 310, background: rgba(c.accent, 0.35), top: -220, right: -160 }} />
            <div style={{ display: "flex", position: "absolute", width: 380, height: 380, borderRadius: 190, background: rgba(c.accent, 0.22), bottom: -170, left: -90 }} />
          </>
        )}
        <div style={{ display: "flex", position: "absolute", top: 0, left: 0, width: W, height: HERO, backgroundImage: `linear-gradient(180deg, rgba(0,0,0,0.05) 25%, ${ctx.bg ? `rgba(0,0,0,${0.35 + design.backgroundFade / 250})` : "rgba(0,0,0,0.25)"} 100%)` }} />
        <div style={{ display: "flex", flexDirection: "column", position: "absolute", left: 70, bottom: 70, width: 620 }}>
          {ctx.header ? <Label text={ctx.header} color={onHero} size={24} spacing={6} /> : null}
          <div style={{ display: "flex", fontFamily: ctx.titleFamily, fontWeight: 700, fontSize: titleSize(ctx, 116), color: onHero, lineHeight: 1.05, marginTop: 10 }}>{ctx.title}</div>
          <div style={{ display: "flex", fontFamily: FAMILY.sans, fontSize: 28, color: onHero, opacity: 0.92, marginTop: 14 }}>{ctx.dateLine}</div>
        </div>
      </div>
      <div style={{ display: "flex", position: "absolute", top: HERO - 150, right: 70, padding: 10, background: c.paper, borderRadius: design.frame === "rounded" ? 44 : 170 }}>
        <GuestPhoto ctx={ctx} size={280} frame={design.frame} />
      </div>

      {/* Body */}
      <div style={{ display: "flex", flexDirection: "column", padding: "56px 70px 0" }}>
        {ctx.subtitle ? <Label text={ctx.subtitle} color={c.accent} size={24} spacing={6} /> : null}
        <div style={{ display: "flex", fontFamily: FAMILY.sans, fontWeight: 700, fontSize: nameSize, color: c.ink, lineHeight: 1.05, marginTop: 12, maxWidth: 600 }}>{ctx.guestName}</div>
        <div style={{ display: "flex", alignItems: "center", marginTop: 22 }}>
          <SeatPill ctx={ctx} bg={c.primary} fg={ctx.onPrimary} />
          {design.showVenue ? <div style={{ display: "flex", fontFamily: FAMILY.sans, fontSize: 26, color: ctx.muted, marginLeft: design.showSeat ? 24 : 0, maxWidth: 560 }}>{ctx.venue}</div> : null}
        </div>
        <div style={{ display: "flex", height: 2, background: rgba(c.ink, 0.1), marginTop: 40 }} />
        <div style={{ display: "flex", alignItems: "center", marginTop: 40 }}>
          <QrBox ctx={ctx} size={290} border={c.primary} />
          <div style={{ display: "flex", flexDirection: "column", marginLeft: 44, flex: 1 }}>
            <Label text="CHECK-IN CODE" color={c.accent} size={24} spacing={4} />
            <div style={{ display: "flex", marginTop: 12 }}>
              <CodePill ctx={ctx} bg={c.primary} fg={ctx.onPrimary} />
            </div>
            <div style={{ display: "flex", fontFamily: FAMILY.sans, fontSize: 24, color: ctx.muted, marginTop: 16, lineHeight: 1.35 }}>Show this QR code (or read out the code) at the entrance.</div>
            {design.showDressCode && ctx.dress ? (
              <div style={{ display: "flex", fontFamily: FAMILY.sans, fontSize: 26, color: c.ink, marginTop: 12 }}>{`Dress code: ${ctx.dress}`}</div>
            ) : null}
          </div>
        </div>
      </div>

      <div style={{ display: "flex", position: "absolute", bottom: 0, left: 0, width: W, height: 74, background: c.accent, alignItems: "center", justifyContent: "center", fontFamily: FAMILY.sans, fontWeight: 700, fontSize: 21, letterSpacing: 3, color: inkOn(c.accent) }}>
        {ctx.footer || ctx.title}
      </div>
    </div>
  );
}

function Minimal(ctx: Ctx) {
  const { c, design } = ctx;
  return (
    <div style={{ display: "flex", position: "relative", width: W, height: H, background: c.paper }}>
      <Background ctx={ctx} w={W} h={H} fadeColor={c.paper} />
      <div style={{ display: "flex", position: "absolute", top: 48, left: 48, right: 48, bottom: 48, border: `1px solid ${rgba(c.ink, 0.25)}` }} />
      {design.ornament !== "lines" ? corners(design.ornament, c.accent, c.primary, 0.7, 30) : null}

      <div style={{ display: "flex", flexDirection: "column", position: "absolute", top: 0, left: 0, width: W, height: H, alignItems: "center", paddingTop: 130 }}>
        {ctx.header ? <Label text={ctx.header} color={ctx.muted} size={22} spacing={8} /> : null}
        <div style={{ display: "flex", fontFamily: ctx.titleFamily, fontSize: titleSize(ctx, 116), color: c.ink, lineHeight: 1.1, marginTop: 16, textAlign: "center", justifyContent: "center", maxWidth: 820 }}>{ctx.title}</div>
        <div style={{ display: "flex", width: 90, height: 2, background: c.accent, marginTop: 22 }} />
        {ctx.subtitle ? <div style={{ display: "flex", marginTop: 22 }}><Label text={ctx.subtitle} color={c.ink} size={24} spacing={6} /></div> : null}
        <div style={{ display: "flex", fontFamily: FAMILY.classic, fontWeight: 700, fontSize: 34, color: c.ink, marginTop: 14 }}>{ctx.dateLine}</div>
        {design.showVenue ? <div style={{ display: "flex", fontFamily: FAMILY.sans, fontSize: 23, color: ctx.muted, marginTop: 6, textAlign: "center", maxWidth: 800, justifyContent: "center" }}>{ctx.venue}</div> : null}

        <div style={{ display: "flex", marginTop: 54 }}>
          <GuestPhoto ctx={ctx} size={210} frame={design.frame} />
        </div>
        <div style={{ display: "flex", fontFamily: FAMILY.classic, fontWeight: 700, fontSize: sizeFor(ctx.guestName, [[16, 64], [24, 54]], 44), color: c.ink, marginTop: 20, textAlign: "center" }}>{ctx.guestName}</div>
        {design.showSeat ? (
          <div style={{ display: "flex", marginTop: 6 }}>
            <Label text={ctx.d.seatNumber ? `SEAT ${ctx.d.seatNumber}` : "SEAT TBA"} color={c.accent} size={26} spacing={6} />
          </div>
        ) : null}

        <div style={{ display: "flex", marginTop: 46, padding: 14, border: `1px solid ${rgba(c.ink, 0.2)}`, background: "#FFFFFF" }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={ctx.qr} width={250} height={250} alt="" />
        </div>
        <div style={{ display: "flex", fontFamily: FAMILY.sans, fontWeight: 700, fontSize: 38, letterSpacing: 5, color: c.ink, marginTop: 20 }}>{ctx.code}</div>
        {design.showDressCode && ctx.dress ? (
          <div style={{ display: "flex", fontFamily: FAMILY.sans, fontSize: 22, color: ctx.muted, marginTop: 10 }}>{`Dress code: ${ctx.dress}`}</div>
        ) : null}
      </div>
      {ctx.footer ? (
        <div style={{ display: "flex", position: "absolute", bottom: 76, left: 0, width: W, justifyContent: "center", fontFamily: FAMILY.sans, fontSize: 19, letterSpacing: 4, color: ctx.muted }}>{ctx.footer}</div>
      ) : null}
    </div>
  );
}

function Watermark({ text }: { text: string }) {
  return (
    <div style={{ display: "flex", position: "absolute", top: 0, left: 0, width: W, height: H, alignItems: "center", justifyContent: "center" }}>
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", transform: "rotate(-28deg)", background: "rgba(255,255,255,0.72)", padding: "24px 70px", borderRadius: 20, border: "4px solid rgba(0,0,0,0.25)" }}>
        <div style={{ display: "flex", fontFamily: FAMILY.sans, fontWeight: 700, fontSize: 110, letterSpacing: 14, color: "rgba(0,0,0,0.55)" }}>PREVIEW</div>
        <div style={{ display: "flex", fontFamily: FAMILY.sans, fontWeight: 700, fontSize: 30, letterSpacing: 3, color: "rgba(0,0,0,0.55)" }}>{text}</div>
      </div>
    </div>
  );
}

// ─── Entry point ─────────────────────────────────────────────────────────────
export async function renderPremiumCard(d: CardData, design: CardDesign, opts: { watermark: string | null }): Promise<ImageResponse> {
  const c = design.colors;
  const code = clean(d.code).toUpperCase();
  const time = clean(d.time);
  const dateText = formatEventDate(d.date);
  const qr = await QRCode.toDataURL(code, { margin: 1, width: 600, errorCorrectionLevel: "M", color: { dark: "#000000", light: "#FFFFFF" } });
  const ink = c.ink;
  const ctx: Ctx = {
    d,
    design,
    c,
    title: clean(design.title) || clean(d.eventName),
    header: clean(design.header).toUpperCase(),
    subtitle: clean(design.subtitle).toUpperCase(),
    footer: clean(design.footer).toUpperCase(),
    guestName: clean(d.guestName),
    venue: clean(d.venue),
    dress: clean(d.dressCode),
    code,
    dateLine: time ? `${dateText} • ${time}` : dateText,
    photo: validPhoto(d.photo),
    bg: validBackground(design.background),
    qr,
    titleFamily: FAMILY[design.titleFont],
    muted: rgba(ink, 0.68),
    onPrimary: inkOn(c.primary),
  };

  const body = design.layout === "royal" ? Royal(ctx) : design.layout === "modern" ? Modern(ctx) : design.layout === "minimal" ? Minimal(ctx) : Elegant(ctx);

  return new ImageResponse(
    (
      <div style={{ display: "flex", position: "relative", width: W, height: H }}>
        {body}
        {opts.watermark ? <Watermark text={opts.watermark} /> : null}
      </div>
    ),
    { width: W, height: H, fonts: loadFonts() }
  );
}
