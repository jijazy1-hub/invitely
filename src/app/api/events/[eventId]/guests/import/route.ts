// src/app/api/events/[eventId]/guests/import/route.ts
// Bulk guest import from pasted text, CSV/TXT or Excel. Every rejected line is
// reported with what's wrong and the format to use.
import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import prisma from "@/lib/prisma";
import { getUserPlan } from "@/lib/plans";
import { parseGuestText, parseGuestRows, LINE_FORMAT_HINT, type GuestRow, type ParseResult } from "@/utils/phone";

export const dynamic = "force-dynamic";

type Ctx = { params: { eventId: string } };
const MAX_ERRORS_SHOWN = 25;

async function parseFile(file: File): Promise<ParseResult | { error: string }> {
  const ext = file.name.split(".").pop()?.toLowerCase();
  const buffer = Buffer.from(await file.arrayBuffer());

  if (ext === "csv" || ext === "txt") return parseGuestText(buffer.toString("utf-8"));

  if (ext === "xlsx" || ext === "xls") {
    const XLSX = await import("xlsx");
    const workbook = XLSX.read(buffer, { type: "buffer" });
    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    const rows: unknown[][] = XLSX.utils.sheet_to_json(sheet, { header: 1, raw: false, blankrows: false });
    // Excel often drops the leading 0 from phone numbers stored as numbers (8012345678);
    // normalizePhone adds it back for 10-digit numbers.
    return parseGuestRows(rows.map((r) => (Array.isArray(r) ? r.map((c) => String(c ?? "")) : [])), 1);
  }

  if (ext === "docx" || ext === "doc") {
    return { error: "Word files can't be read reliably. Open the file, copy the guest list, and use Paste Text instead (one guest per line: Name, Phone)." };
  }

  return { error: `".${ext}" files aren't supported. Upload a .csv, .txt or .xlsx file with columns: Name, Phone.` };
}

// POST /api/events/[eventId]/guests/import
export async function POST(req: Request, { params }: Ctx) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const event = await prisma.event.findFirst({ where: { id: params.eventId, userId } });
  if (!event) return NextResponse.json({ error: "Event not found" }, { status: 404 });

  const report = { imported: 0, duplicates: 0, invalid: 0, errors: [] as string[] };

  let parsed: ParseResult;
  let via = "BULK_TEXT";
  try {
    const contentType = req.headers.get("content-type") || "";
    if (contentType.includes("application/json")) {
      const { text } = await req.json().catch(() => ({ text: "" }));
      parsed = parseGuestText(String(text || ""));
    } else {
      const formData = await req.formData();
      const file = formData.get("file") as File | null;
      if (!file) return NextResponse.json({ error: "No file provided", report }, { status: 400 });
      const result = await parseFile(file);
      if ("error" in result) return NextResponse.json({ error: result.error, report: { ...report, errors: [result.error] } }, { status: 400 });
      parsed = result;
      via = file.name.toLowerCase().endsWith(".csv") ? "CSV" : /\.xlsx?$/i.test(file.name) ? "EXCEL" : "TEXT";
    }
  } catch (error) {
    console.error("[IMPORT] parse failed:", error);
    return NextResponse.json({ error: "We couldn't read that file.", report: { ...report, errors: ["We couldn't read that file. Try saving it as CSV, or paste the list instead."] } }, { status: 400 });
  }

  report.invalid = parsed.invalid;
  report.errors = parsed.errors.slice(0, MAX_ERRORS_SHOWN);
  if (parsed.errors.length > MAX_ERRORS_SHOWN) {
    report.errors.push(`…and ${parsed.errors.length - MAX_ERRORS_SHOWN} more lines with problems.`);
  }

  if (parsed.rows.length === 0) {
    if (report.errors.length === 0) report.errors.push(`No guests found. Use the format: ${LINE_FORMAT_HINT}`);
    return NextResponse.json({ report });
  }

  // Duplicates within this batch
  const seen = new Set<string>();
  const unique: GuestRow[] = [];
  for (const r of parsed.rows) {
    if (seen.has(r.phone)) report.duplicates++;
    else {
      seen.add(r.phone);
      unique.push(r);
    }
  }

  // Already on the guest list
  const existing = await prisma.guest.findMany({
    where: { eventId: params.eventId, phone: { in: unique.map((r) => r.phone) } },
    select: { phone: true },
  });
  const existingPhones = new Set(existing.map((g) => g.phone));
  const fresh = unique.filter((r) => !existingPhones.has(r.phone));
  report.duplicates += unique.length - fresh.length;

  // Plan limit
  const plan = await getUserPlan(userId);
  const count = await prisma.guest.count({ where: { eventId: params.eventId } });
  const remaining = (plan.maxGuests ?? Infinity) - count;
  if (remaining <= 0 && fresh.length > 0) {
    return NextResponse.json(
      { error: `You've reached the ${plan.maxGuests}-guest limit of the ${plan.name} plan. Upgrade to add more.`, report: { ...report, errors: [`You've reached the ${plan.maxGuests}-guest limit of the ${plan.name} plan. Upgrade to add more.`, ...report.errors] } },
      { status: 403 }
    );
  }
  const toImport = fresh.slice(0, remaining);
  if (toImport.length < fresh.length) {
    report.errors.unshift(`${fresh.length - toImport.length} guests were not added: the ${plan.name} plan allows ${plan.maxGuests} guests per event.`);
  }

  if (toImport.length) {
    const result = await prisma.guest.createMany({
      data: toImport.map((g) => ({ eventId: params.eventId, name: g.name, phone: g.phone, email: g.email ?? null, importedVia: via })),
      skipDuplicates: true,
    });
    report.imported = result.count;
    report.duplicates += toImport.length - result.count;
  }

  return NextResponse.json({ report });
}
