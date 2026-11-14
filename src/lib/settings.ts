// src/lib/settings.ts
// Platform-wide switches the admin controls (stored in the app_settings table).
// Reads never throw: if the table doesn't exist yet, defaults are used.
import prisma from "@/lib/prisma";

export type FeatureAccess = "PAID" | "FREE";

export const SETTING_KEYS = {
  premiumDesigns: "premium_card_designs", // "PAID" (paid plans only) | "FREE" (everyone)
} as const;

const cache = new Map<string, { value: string | null; at: number }>();
const TTL = 30_000;

export async function getSetting(key: string): Promise<string | null> {
  const hit = cache.get(key);
  if (hit && Date.now() - hit.at < TTL) return hit.value;
  try {
    const row = await prisma.appSetting.findUnique({ where: { key } });
    const value = row?.value ?? null;
    cache.set(key, { value, at: Date.now() });
    return value;
  } catch (error) {
    console.error("[SETTINGS] read failed (has supabase/schema.sql been run?):", error);
    return null;
  }
}

export async function setSetting(key: string, value: string): Promise<void> {
  await prisma.appSetting.upsert({ where: { key }, create: { key, value }, update: { value } });
  cache.set(key, { value, at: Date.now() });
}

export async function premiumDesignsAccess(): Promise<FeatureAccess> {
  return (await getSetting(SETTING_KEYS.premiumDesigns)) === "FREE" ? "FREE" : "PAID";
}
