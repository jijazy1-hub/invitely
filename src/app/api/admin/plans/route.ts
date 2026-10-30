// src/app/api/admin/plans/route.ts
// PUT { plans: [{ key, name, priceNgn, maxEvents, maxGuests, features: string[] }] }
import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { requireAdminApi } from "@/lib/admin";
import { isPlanKey } from "@/lib/plans";

export const dynamic = "force-dynamic";

function limitOrNull(v: unknown): number | null | "invalid" {
  if (v === null || v === undefined || v === "") return null;
  return Number.isInteger(v) && (v as number) >= 1 && (v as number) <= 1_000_000 ? (v as number) : "invalid";
}

export async function PUT(req: Request) {
  const gate = await requireAdminApi();
  if (!gate.ok) return gate.response;

  const body = await req.json().catch(() => null);
  const input = body?.plans;
  if (!Array.isArray(input) || input.length === 0) {
    return NextResponse.json({ error: "No plans supplied." }, { status: 400 });
  }

  const rows: { key: string; name: string; priceNgn: number; maxEvents: number | null; maxGuests: number | null; features: string }[] = [];
  for (const p of input) {
    if (!isPlanKey(p?.key)) return NextResponse.json({ error: "Unknown plan." }, { status: 400 });
    const name = typeof p.name === "string" ? p.name.trim() : "";
    if (name.length < 1 || name.length > 40) {
      return NextResponse.json({ error: `${p.key}: name must be 1 to 40 characters.` }, { status: 400 });
    }
    const price = p.key === "FREE" ? 0 : p.priceNgn;
    if (!Number.isInteger(price) || price < 0 || price > 10_000_000) {
      return NextResponse.json({ error: `${p.key}: price must be a whole number of naira.` }, { status: 400 });
    }
    const maxEvents = limitOrNull(p.maxEvents);
    const maxGuests = limitOrNull(p.maxGuests);
    if (maxEvents === "invalid" || maxGuests === "invalid") {
      return NextResponse.json({ error: `${p.key}: limits must be whole numbers, or empty for unlimited.` }, { status: 400 });
    }
    const features = Array.isArray(p.features)
      ? p.features.map((f: unknown) => String(f).trim()).filter(Boolean)
      : [];
    if (features.length > 20 || features.some((f: string) => f.length > 120)) {
      return NextResponse.json({ error: `${p.key}: up to 20 features, 120 characters each.` }, { status: 400 });
    }
    rows.push({ key: p.key, name, priceNgn: price, maxEvents, maxGuests, features: features.join("\n") });
  }

  try {
    await prisma.$transaction(
      rows.map((r) =>
        prisma.planConfig.upsert({
          where: { key: r.key },
          create: r,
          update: { name: r.name, priceNgn: r.priceNgn, maxEvents: r.maxEvents, maxGuests: r.maxGuests, features: r.features },
        })
      )
    );
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("[ADMIN][PLANS] Failed:", error);
    return NextResponse.json({ error: "Couldn't save the plans." }, { status: 500 });
  }
}
