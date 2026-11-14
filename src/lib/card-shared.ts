// src/lib/card-shared.ts
// Fonts and helpers shared by the classic card (card.tsx) and the premium
// designer layouts (card-premium.tsx). Server-only (reads font files).
import fs from "fs";
import path from "path";

// ─── Fonts (shipped to Vercel via outputFileTracingIncludes in next.config.js) ──
type Wt = 400 | 700;
export type FontDef = { name: string; data: ArrayBuffer; weight: Wt; style: "normal" };
let fontCache: FontDef[] | null = null;

/** Every font file the cards use, relative to node_modules. Also listed in next.config.js. */
export const FONT_FILES: [family: string, file: string, weight: Wt][] = [
  // Inter: Latin, Latin-ext and the Vietnamese subset, which carries the dotted
  // vowels used in Yoruba and Igbo names (ẹ, ọ, ṣ, ị, ụ). Each subset gets its own
  // family name: Satori only falls back between differently-named fonts.
  ...(["latin", "latin-ext", "vietnamese"] as const).flatMap((subset, i) =>
    ([400, 700] as Wt[]).map((w) => [["Sans", "SansExt", "SansViet"][i], `@fontsource/inter/files/inter-${subset}-${w}-normal.woff`, w] as [string, string, Wt])
  ),
  ["Serif", "@fontsource/cormorant-garamond/files/cormorant-garamond-latin-700-normal.woff", 700],
  ["SerifExt", "@fontsource/cormorant-garamond/files/cormorant-garamond-latin-ext-700-normal.woff", 700],
  ["Script", "@fontsource/great-vibes/files/great-vibes-latin-400-normal.woff", 400],
  ["ScriptExt", "@fontsource/great-vibes/files/great-vibes-latin-ext-400-normal.woff", 400],
  ["Display", "@fontsource/playfair-display/files/playfair-display-latin-400-normal.woff", 400],
  ["Display", "@fontsource/playfair-display/files/playfair-display-latin-700-normal.woff", 700],
  ["DisplayExt", "@fontsource/playfair-display/files/playfair-display-latin-ext-700-normal.woff", 700],
  ["Caps", "@fontsource/cinzel/files/cinzel-latin-400-normal.woff", 400],
  ["Caps", "@fontsource/cinzel/files/cinzel-latin-700-normal.woff", 700],
  ["CapsExt", "@fontsource/cinzel/files/cinzel-latin-ext-700-normal.woff", 700],
];

function readFont(rel: string): ArrayBuffer | null {
  try {
    const buf = fs.readFileSync(path.join(process.cwd(), "node_modules", rel));
    return buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength) as ArrayBuffer;
  } catch {
    return null;
  }
}

export function loadFonts(): FontDef[] {
  if (fontCache) return fontCache;
  const fonts: FontDef[] = [];
  for (const [name, rel, weight] of FONT_FILES) {
    const data = readFont(rel);
    if (data && data.byteLength > 0) fonts.push({ name, data, weight, style: "normal" });
  }
  fontCache = fonts;
  return fonts;
}

const SANS_CHAIN = "Sans, SansExt, SansViet";
/** CSS font-family chains with fallbacks for Nigerian name characters. */
export const FAMILY = {
  sans: SANS_CHAIN,
  script: `Script, ScriptExt, ${SANS_CHAIN}`,
  serif: `Display, DisplayExt, ${SANS_CHAIN}`,
  classic: `Serif, SerifExt, ${SANS_CHAIN}`,
  caps: `Caps, CapsExt, ${SANS_CHAIN}`,
} as const;

// ─── Helpers ─────────────────────────────────────────────────────────────────
/** Keep accents and Nigerian name characters; drop control chars and emoji (which would need a network fetch). */
export function clean(s: string | null | undefined): string {
  return (s ?? "")
    .normalize("NFC")
    .replace(/[\u0000-\u001F\u007F]/g, "")
    .replace(/\p{Extended_Pictographic}|️|‍/gu, "")
    // Tone marks NFC couldn't merge into a letter (e.g. the grave on "ọ̀") render
    // as floating accents in the image library, so drop them.
    .replace(/[̀-ͯ]/g, "")
    .trim();
}

export function hex(c: string | null | undefined, fallback: string): string {
  return typeof c === "string" && /^#[0-9a-fA-F]{6}$/.test(c) ? c : fallback;
}

export function luminance(c: string): number {
  const n = parseInt(c.slice(1), 16);
  const ch = [(n >> 16) & 255, (n >> 8) & 255, n & 255].map((v) => {
    const s = v / 255;
    return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * ch[0] + 0.7152 * ch[1] + 0.0722 * ch[2];
}

/** Dark text on light backgrounds, white text on dark ones. */
export function inkOn(bg: string): string {
  return luminance(bg) > 0.45 ? "#1A1A1A" : "#FFFFFF";
}

/** #RRGGBB + alpha (0–1) → rgba() */
export function rgba(c: string, a: number): string {
  const n = parseInt(c.slice(1), 16);
  return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${a})`;
}

export function sizeFor(text: string, steps: [number, number][], min: number): number {
  for (const [maxLen, size] of steps) if (text.length <= maxLen) return size;
  return min;
}

export function initials(name: string): string {
  return name.split(/\s+/).filter(Boolean).slice(0, 2).map((p) => p[0]!.toUpperCase()).join("");
}

export function validPhoto(p: string | null | undefined): string | null {
  if (!p) return null;
  if (/^data:image\/(jpeg|jpg|png);base64,/.test(p)) return p;
  // Photos saved to Cloudinary (see src/lib/guest-photo.ts). Ask for a JPEG so the renderer can read it.
  if (/^https:\/\/res\.cloudinary\.com\//.test(p)) return p.replace("/upload/", "/upload/f_jpg,w_480,h_480,c_fill,g_face/");
  return null;
}

/** Background photos: data URL as-is; Cloudinary URLs get a JPEG at card size. */
export function validBackground(p: string | null | undefined): string | null {
  if (!p) return null;
  if (/^data:image\/(jpeg|jpg|png);base64,/.test(p)) return p;
  if (/^https:\/\/res\.cloudinary\.com\//.test(p)) return p.replace("/upload/", "/upload/f_jpg,w_1080,h_1500,c_fill,g_faces/");
  return null;
}

export function svgDataUrl(svg: string): string {
  return `data:image/svg+xml;base64,${Buffer.from(svg).toString("base64")}`;
}

export function formatEventDate(date: Date): string {
  return new Date(date).toLocaleDateString("en-GB", {
    weekday: "long", day: "numeric", month: "long", year: "numeric", timeZone: "UTC",
  });
}
