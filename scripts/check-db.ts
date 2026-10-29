// Run with:  npm run db:check
// Tells you in plain English whether the app can talk to Supabase and whether the tables exist.
import { PrismaClient } from "@prisma/client";
import fs from "fs";

// tiny .env loader so this script works without extra packages
for (const file of [".env", ".env.local"]) {
  if (!fs.existsSync(file)) continue;
  for (const line of fs.readFileSync(file, "utf8").split(/\r?\n/)) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*"?([^"]*)"?\s*$/);
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2];
  }
}

async function main() {
  const url =
    process.env.POSTGRES_PRISMA_URL ?? process.env.DATABASE_URL ?? process.env.POSTGRES_URL;
  if (!url) {
    console.error("❌ No database URL found. Set POSTGRES_PRISMA_URL in .env.local (see SETUP.md).");
    process.exit(1);
  }
  const host = url.replace(/^.*@/, "").replace(/[/?].*$/, "");
  console.log("→ Connecting to", host);

  const prisma = new PrismaClient({ datasourceUrl: url });
  try {
    await prisma.$queryRaw`select 1`;
    console.log("✅ Connected to Supabase");
  } catch (e: any) {
    console.error("❌ Could not connect:", e.message?.split("\n").slice(-3).join(" "));
    process.exit(1);
  }

  for (const t of ["users", "subscriptions", "events", "guests", "rsvps", "checkins", "templates"]) {
    try {
      const rows: any[] = await prisma.$queryRawUnsafe(`select count(*)::int as n from "${t}"`);
      console.log(`✅ table ${t.padEnd(14)} rows: ${rows[0].n}`);
    } catch {
      console.error(`❌ table ${t} is missing → run supabase/schema.sql in the Supabase SQL Editor`);
      process.exitCode = 1;
    }
  }
  await prisma.$disconnect();
}

main();
