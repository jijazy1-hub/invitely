// src/app/api/admin/settings/route.ts
// Admin-only feature switches.  PUT { premiumDesigns: "PAID" | "FREE" }
import { NextResponse } from "next/server";
import { requireAdminApi } from "@/lib/admin";
import { SETTING_KEYS, setSetting, premiumDesignsAccess } from "@/lib/settings";

export const dynamic = "force-dynamic";

export async function GET() {
  const gate = await requireAdminApi();
  if (!gate.ok) return gate.response;
  return NextResponse.json({ premiumDesigns: await premiumDesignsAccess() });
}

export async function PUT(req: Request) {
  const gate = await requireAdminApi();
  if (!gate.ok) return gate.response;

  const body = await req.json().catch(() => ({}));
  const v = body?.premiumDesigns;
  if (v !== "PAID" && v !== "FREE") {
    return NextResponse.json({ error: "premiumDesigns must be PAID or FREE." }, { status: 400 });
  }
  try {
    await setSetting(SETTING_KEYS.premiumDesigns, v);
    return NextResponse.json({ premiumDesigns: v });
  } catch (error) {
    console.error("[ADMIN][SETTINGS]", error);
    return NextResponse.json(
      { error: "Couldn't save. Run supabase/schema.sql in Supabase (it creates the app_settings table), then try again." },
      { status: 500 }
    );
  }
}
