// src/app/api/events/[eventId]/guests/import/route.ts
import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import prisma from "@/lib/prisma";
import { describeDbError, getPlan, guestLimit, limitsEnforced } from "@/lib/plan";
import { normalizePhone, isValidPhone, parseBulkGuestText } from "@/utils/phone";

export const dynamic = "force-dynamic";

type Ctx = { params: { eventId: string } };
type GuestRow = { name: string; phone: string };

async function verifyOwner(userId: string, eventId: string) {
  return prisma.event.findFirst({ where: { id: eventId, userId } });
}

function dedupeRows(rows: GuestRow[]): GuestRow[] {
  const seen = new Set<string>();
  return rows.filter((r) => {
    if (seen.has(r.phone)) return false;
    seen.add(r.phone);
    return true;
  });
}

async function parseFileBuffer(buffer: Buffer, filename: string): Promise<GuestRow[]> {
  const ext = filename.split(".").pop()?.toLowerCase();

  if (ext === "csv" || ext === "txt") {
    const text = buffer.toString("utf-8");
    return parseBulkGuestText(text);
  }

  if (ext === "xlsx" || ext === "xls") {
    const XLSX = await import("xlsx");
    const workbook = XLSX.read(buffer, { type: "buffer" });
    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    const rows: any[] = XLSX.utils.sheet_to_json(sheet, { header: 1 });
    const results: GuestRow[] = [];
    for (const row of rows) {
      if (!Array.isArray(row) || row.length < 2) continue;
      const name = String(row[0] || "").trim();
      const phone = normalizePhone(String(row[1] || "").trim());
      if (name && isValidPhone(phone)) results.push({ name, phone });
    }
    return results;
  }

  if (ext === "docx") {
    // Extract plain text from docx by parsing XML
    // Simple approach: convert buffer to string and extract text patterns
    const text = buffer.toString("latin1");
    const matches = text.match(/[A-Za-z\s]+,\s*0?\d{10,11}/g) || [];
    const results: GuestRow[] = [];
    for (const match of matches) {
      const [name, phone] = match.split(",").map((s) => s.trim());
      const normalized = normalizePhone(phone);
      if (name && isValidPhone(normalized)) results.push({ name, phone: normalized });
    }
    return results;
  }

  return [];
}

// POST /api/events/[eventId]/guests/import
export async function POST(req: Request, { params }: Ctx) {
  try {
    return await handleImport(req, params);
  } catch (err) {
    console.error("[IMPORT]", err);
    return NextResponse.json(
      {
        error: describeDbError(err),
        report: { imported: 0, duplicates: 0, invalid: 0, errors: [describeDbError(err)] },
      },
      { status: 500 }
    );
  }
}

async function handleImport(req: Request, params: { eventId: string }) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const event = await verifyOwner(userId, params.eventId);
  if (!event) return NextResponse.json({ error: "Event not found" }, { status: 404 });

  let parsedRows: GuestRow[] = [];
  const contentType = req.headers.get("content-type") || "";

  if (contentType.includes("application/json")) {
    // Text paste import
    const { text } = await req.json();
    parsedRows = parseBulkGuestText(String(text || ""));
  } else {
    // File import
    const formData = await req.formData();
    const file = formData.get("file") as File | null;
    if (!file) return NextResponse.json({ error: "No file provided" }, { status: 400 });

    const buffer = Buffer.from(await file.arrayBuffer());
    parsedRows = await parseFileBuffer(buffer, file.name);
  }

  const report = { imported: 0, duplicates: 0, invalid: 0, errors: [] as string[] };

  if (parsedRows.length === 0) {
    return NextResponse.json({
      report: { ...report, errors: ["No valid guest entries found in the input"] },
    });
  }

  // Dedupe within this batch
  const deduped = dedupeRows(parsedRows);
  report.duplicates += parsedRows.length - deduped.length;

  // Plan limits (only enforced when ENFORCE_PLAN_LIMITS=true)
  let remaining = Infinity;
  if (limitsEnforced()) {
    const plan = await getPlan(userId);
    const existingCount = await prisma.guest.count({ where: { eventId: params.eventId } });
    remaining = guestLimit(plan) - existingCount;
    if (remaining <= 0) {
      return NextResponse.json({
        error: `You've reached the guest limit for your ${plan} plan.`,
        report,
      }, { status: 403 });
    }
  }

  // Trim to remaining slots
  const toImport = Number.isFinite(remaining) ? deduped.slice(0, remaining) : deduped;

  // Batch insert — skip existing phones (upsert with skipDuplicates)
  const results = await prisma.$transaction(
    toImport.map((g) =>
      prisma.guest.upsert({
        where: { eventId_phone: { eventId: params.eventId, phone: g.phone } },
        update: {},
        create: {
          eventId: params.eventId,
          name: g.name,
          phone: g.phone,
          importedVia: "BULK_TEXT",
        },
      })
    )
  );

  report.imported = results.length;

  return NextResponse.json({ report });
}
