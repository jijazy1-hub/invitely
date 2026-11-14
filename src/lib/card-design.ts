// src/lib/card-design.ts
// The card designer's data model. Shared by the browser (designer page) and the
// server (saving + rendering), so no server-only imports here.
//
// "classic" is the free card (colours only). Every other layout, a background
// photo, ornaments, fonts and custom wording are premium (see src/lib/access.ts).

export type Layout = "classic" | "elegant" | "royal" | "modern" | "minimal";
export type TitleFont = "script" | "serif" | "classic" | "caps" | "sans";
export type Ornament = "floral" | "lines" | "deco" | "none";
export type Frame = "ornate" | "circle" | "rounded";

export type CardDesign = {
  layout: Layout;
  colors: {
    primary: string; // pills, code box, accents
    accent: string;  // gold: ornaments, labels, title
    paper: string;   // card background
    ink: string;     // main text
  };
  titleFont: TitleFont;
  header: string;    // e.g. "WELCOME TO OUR WEDDING"
  title: string;     // e.g. "Joe & Fatima"; empty = event name
  subtitle: string;  // e.g. "GUEST CHECK-IN CARD"
  footer: string;
  background: string | null; // data:image/jpeg URL or Cloudinary https URL
  backgroundFade: number;    // 0–90: how much the paper colour covers the photo
  /** Size of the stored photo, so it can be fitted to each layout's shape. */
  backgroundWidth: number;
  backgroundHeight: number;
  /** Point to keep in view when trimming (0–1 across / down the photo), e.g. the faces. */
  focusX: number;
  focusY: number;
  /** 1 = just fills the space; up to 3 = zoomed in. */
  zoom: number;
  ornament: Ornament;
  frame: Frame;
  showVenue: boolean;
  showDressCode: boolean;
  showSeat: boolean;
};

export const LAYOUTS: { key: Layout; name: string; description: string; premium: boolean }[] = [
  { key: "classic", name: "Classic Ticket", description: "Clean ticket with your colours", premium: false },
  { key: "elegant", name: "Elegant Photo", description: "Faded couple photo, floral corners, script names", premium: true },
  { key: "royal", name: "Royal", description: "Rich dark card with gold borders", premium: true },
  { key: "modern", name: "Modern", description: "Big photo banner, bold type", premium: true },
  { key: "minimal", name: "Minimal", description: "Lots of white space, fine lines", premium: true },
];

export const TITLE_FONTS: { key: TitleFont; name: string }[] = [
  { key: "script", name: "Script" },
  { key: "serif", name: "Elegant serif" },
  { key: "classic", name: "Classic serif" },
  { key: "caps", name: "Roman capitals" },
  { key: "sans", name: "Modern sans" },
];

export const ORNAMENTS: { key: Ornament; name: string }[] = [
  { key: "floral", name: "Floral corners" },
  { key: "lines", name: "Fine gold lines" },
  { key: "deco", name: "Art deco" },
  { key: "none", name: "None" },
];

export const FRAMES: { key: Frame; name: string }[] = [
  { key: "ornate", name: "Ornate gold ring" },
  { key: "circle", name: "Simple circle" },
  { key: "rounded", name: "Rounded square" },
];

const HEADERS: Record<string, string> = {
  WEDDING: "WELCOME TO OUR WEDDING",
  BIRTHDAY: "YOU'RE INVITED TO",
  CONFERENCE: "WELCOME TO",
  CONCERT: "LIVE IN CONCERT",
  CHURCH: "YOU ARE WARMLY INVITED TO",
  SEMINAR: "WELCOME TO",
  VIP_PARTY: "AN EXCLUSIVE EVENING",
  BURIAL: "IN LOVING MEMORY",
  PRIVATE_DINNER: "YOU'RE INVITED TO DINNER",
  OTHER: "YOU'RE INVITED TO",
};

export function defaultHeader(eventType: string): string {
  return HEADERS[eventType] ?? HEADERS.OTHER;
}

export function defaultDesign(eventType: string, colors?: { primary?: string; secondary?: string; paper?: string }): CardDesign {
  return {
    layout: "classic",
    colors: {
      primary: hexOr(colors?.primary, "#0A2810"),
      accent: hexOr(colors?.secondary, "#B8860B"),
      paper: hexOr(colors?.paper, "#F8F4E3"),
      ink: "#1F2A24",
    },
    titleFont: "script",
    header: defaultHeader(eventType),
    title: "",
    subtitle: "GUEST CHECK-IN CARD",
    footer: "PERSONAL ADMISSION CARD · NOT TRANSFERABLE",
    background: null,
    backgroundFade: 72,
    backgroundWidth: 1080,
    backgroundHeight: 1500,
    focusX: 0.5,
    focusY: 0.35,
    zoom: 1,
    ornament: "floral",
    frame: "ornate",
    showVenue: true,
    showDressCode: true,
    showSeat: true,
  };
}

/** Ready-made starting points shown in the designer. */
export const DESIGN_PRESETS: { id: string; name: string; design: Partial<CardDesign> & { layout: Layout; colors: CardDesign["colors"] } }[] = [
  { id: "ivory-gold", name: "Ivory & Gold", design: { layout: "elegant", titleFont: "script", ornament: "floral", frame: "ornate", colors: { primary: "#0B3D2E", accent: "#B8860B", paper: "#F6EFE0", ink: "#1F2A24" } } },
  { id: "blush-rose", name: "Blush Rose", design: { layout: "elegant", titleFont: "script", ornament: "floral", frame: "ornate", colors: { primary: "#8E3B55", accent: "#C29A6B", paper: "#FBF1EF", ink: "#4A2633" } } },
  { id: "lavender", name: "Lavender Dream", design: { layout: "elegant", titleFont: "script", ornament: "floral", frame: "ornate", colors: { primary: "#5B3F8C", accent: "#A88BC9", paper: "#F6F2FB", ink: "#2E2244" } } },
  { id: "royal-emerald", name: "Royal Emerald", design: { layout: "royal", titleFont: "caps", ornament: "deco", frame: "ornate", colors: { primary: "#0F4D36", accent: "#D4AF37", paper: "#0B2E22", ink: "#F5EBD0" } } },
  { id: "midnight-gala", name: "Midnight Gala", design: { layout: "royal", titleFont: "serif", ornament: "deco", frame: "ornate", colors: { primary: "#2A2A2A", accent: "#D4A843", paper: "#121212", ink: "#F3E9D2" } } },
  { id: "burgundy", name: "Burgundy Velvet", design: { layout: "royal", titleFont: "script", ornament: "lines", frame: "ornate", colors: { primary: "#6D1A2B", accent: "#E0B872", paper: "#3A0D17", ink: "#FBEFE3" } } },
  { id: "ankara", name: "Ankara Bold", design: { layout: "modern", titleFont: "sans", ornament: "none", frame: "circle", colors: { primary: "#0F6E6E", accent: "#F29E38", paper: "#FFF8EE", ink: "#1B1B1B" } } },
  { id: "sunset", name: "Sunset Coral", design: { layout: "modern", titleFont: "serif", ornament: "none", frame: "circle", colors: { primary: "#D9534F", accent: "#F4A259", paper: "#FFFFFF", ink: "#222222" } } },
  { id: "ocean", name: "Ocean Blue", design: { layout: "modern", titleFont: "sans", ornament: "none", frame: "rounded", colors: { primary: "#1E3A5F", accent: "#4FA3D1", paper: "#FFFFFF", ink: "#14213D" } } },
  { id: "pure-minimal", name: "Pure Minimal", design: { layout: "minimal", titleFont: "classic", ornament: "lines", frame: "circle", colors: { primary: "#222222", accent: "#9C8B6E", paper: "#FFFFFF", ink: "#111111" } } },
  { id: "sage", name: "Sage Garden", design: { layout: "minimal", titleFont: "script", ornament: "floral", frame: "circle", colors: { primary: "#5E7D63", accent: "#A3B18A", paper: "#FAFAF5", ink: "#2F3E33" } } },
];

/** Colour swatches offered in the designer (primary / accent / paper / ink). */
export const COLOR_SWATCHES = [
  "#0A2810", "#0B3D2E", "#0F6E6E", "#1E3A5F", "#14213D", "#5B3F8C", "#8E3B55", "#6D1A2B", "#D9534F", "#E0574F",
  "#B8860B", "#D4AF37", "#E0B872", "#C29A6B", "#F29E38", "#A88BC9", "#4FA3D1", "#A3B18A", "#9C8B6E", "#888888",
  "#FFFFFF", "#FAFAF5", "#F8F4E3", "#F6EFE0", "#FBF1EF", "#F6F2FB", "#FFF8EE", "#121212", "#0B2E22", "#3A0D17",
  "#111111", "#1F2A24", "#2E2244", "#4A2633", "#F5EBD0", "#FBEFE3",
];

function hexOr(v: unknown, fallback: string): string {
  return typeof v === "string" && /^#[0-9a-fA-F]{6}$/.test(v) ? v : fallback;
}

function str(v: unknown, fallback: string, max: number): string {
  if (typeof v !== "string") return fallback;
  return v.replace(/[\u0000-\u001F\u007F]/g, "").slice(0, max);
}

function num(v: unknown, fallback: number, min: number, max: number): number {
  const n = Number(v);
  return Number.isFinite(n) ? Math.min(max, Math.max(min, n)) : fallback;
}

/**
 * Where to draw a photo so it fills a box (like CSS "cover"), keeps the focus
 * point in view and never leaves gaps. Used by the card renderer and the designer.
 */
export function coverBox(imgW: number, imgH: number, boxW: number, boxH: number, focusX: number, focusY: number, zoom = 1) {
  const scale = Math.max(boxW / imgW, boxH / imgH) * Math.max(1, zoom);
  const width = imgW * scale;
  const height = imgH * scale;
  const clamp = (v: number, min: number) => Math.min(0, Math.max(min, v));
  const left = clamp(boxW / 2 - focusX * width, boxW - width);
  const top = clamp(boxH / 2 - focusY * height, boxH - height);
  return { width, height, left, top };
}

/** The shape (width × height) the background photo fills in each layout. */
export function backgroundBoxFor(layout: Layout): { w: number; h: number } {
  if (layout === "modern") return { w: 1080, h: 640 };
  if (layout === "minimal") return { w: 1080, h: 1500 };
  return { w: 1020, h: 1440 };
}

function pick<T extends string>(v: unknown, options: readonly T[], fallback: T): T {
  return options.includes(v as T) ? (v as T) : fallback;
}

export function isValidBackground(v: unknown): v is string {
  if (typeof v !== "string") return false;
  if (/^https:\/\/res\.cloudinary\.com\/[^\s"'<>]+$/.test(v)) return true;
  return /^data:image\/(jpeg|jpg|png);base64,[A-Za-z0-9+/=]+$/.test(v) && v.length <= 1_200_000;
}

/** Cleans anything from the browser or the database into a safe, complete design. */
export function sanitizeDesign(input: unknown, eventType = "OTHER"): CardDesign {
  const d = defaultDesign(eventType);
  const x = (input && typeof input === "object" ? input : {}) as Record<string, any>;
  const c = (x.colors && typeof x.colors === "object" ? x.colors : {}) as Record<string, unknown>;
  const fade = Number(x.backgroundFade);
  return {
    layout: pick(x.layout, ["classic", "elegant", "royal", "modern", "minimal"] as const, d.layout),
    colors: {
      primary: hexOr(c.primary, d.colors.primary),
      accent: hexOr(c.accent, d.colors.accent),
      paper: hexOr(c.paper, d.colors.paper),
      ink: hexOr(c.ink, d.colors.ink),
    },
    titleFont: pick(x.titleFont, ["script", "serif", "classic", "caps", "sans"] as const, d.titleFont),
    header: str(x.header, d.header, 48),
    title: str(x.title, "", 48),
    subtitle: str(x.subtitle, d.subtitle, 48),
    footer: str(x.footer, d.footer, 70),
    background: isValidBackground(x.background) ? x.background : null,
    backgroundFade: Number.isFinite(fade) ? Math.min(90, Math.max(0, Math.round(fade))) : d.backgroundFade,
    // Photos saved before trimming existed were already cut to 1080 × 1500.
    backgroundWidth: num(x.backgroundWidth, 1080, 50, 6000),
    backgroundHeight: num(x.backgroundHeight, 1500, 50, 6000),
    focusX: num(x.focusX, d.focusX, 0, 1),
    focusY: num(x.focusY, d.focusY, 0, 1),
    zoom: num(x.zoom, 1, 1, 3),
    ornament: pick(x.ornament, ["floral", "lines", "deco", "none"] as const, d.ornament),
    frame: pick(x.frame, ["ornate", "circle", "rounded"] as const, d.frame),
    showVenue: typeof x.showVenue === "boolean" ? x.showVenue : d.showVenue,
    showDressCode: typeof x.showDressCode === "boolean" ? x.showDressCode : d.showDressCode,
    showSeat: typeof x.showSeat === "boolean" ? x.showSeat : d.showSeat,
  };
}

/** Anything other than the classic card counts as a premium design. */
export function isPremiumDesign(d: CardDesign): boolean {
  return d.layout !== "classic";
}

/** Template rows that hold an event's own design use this category. */
export const CUSTOM_DESIGN_CATEGORY = "CUSTOM_DESIGN";

/** Reads a design out of a template's config JSON, if it holds one. */
export function designFromTemplateConfig(config: string | null | undefined, eventType: string): CardDesign | null {
  if (!config) return null;
  try {
    const parsed = JSON.parse(config);
    if (parsed && typeof parsed === "object" && parsed.kind === "design") return sanitizeDesign(parsed.design, eventType);
  } catch {
    /* not a design */
  }
  return null;
}
