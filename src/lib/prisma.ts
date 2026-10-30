import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient };

// Supabase's Vercel integration provides POSTGRES_PRISMA_URL (pooled, Prisma-ready).
// DATABASE_URL is a fallback for local development.
// If none is set we don't throw at import time (that would break builds that don't need the
// database); Prisma reports a clear error the first time a query actually runs.
const databaseUrl =
  process.env.POSTGRES_PRISMA_URL ??
  process.env.POSTGRES_URL ??
  process.env.DATABASE_URL;

export const prisma =
  globalForPrisma.prisma ||
  new PrismaClient(databaseUrl ? { datasources: { db: { url: databaseUrl } } } : undefined);

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;

export default prisma;
