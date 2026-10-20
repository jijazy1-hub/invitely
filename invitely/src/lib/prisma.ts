import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient };

// Supabase's Vercel integration provides POSTGRES_PRISMA_URL (pooled, Prisma-ready).
// DATABASE_URL is only a fallback for local development.
const databaseUrl =
  process.env.POSTGRES_PRISMA_URL ??
  process.env.POSTGRES_URL ??
  process.env.DATABASE_URL;

if (!databaseUrl) {
  throw new Error("No database URL set. Expected POSTGRES_PRISMA_URL (Supabase integration).");
}

export const prisma =
  globalForPrisma.prisma ||
  new PrismaClient({
    datasources: {
      db: {
        url: databaseUrl,
      },
    },
  });

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;

export default prisma;