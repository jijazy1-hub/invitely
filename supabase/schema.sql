-- ============================================================================
-- Invitely — database schema for Supabase
-- ----------------------------------------------------------------------------
-- HOW TO RUN (1 minute):
--   1. Open https://supabase.com/dashboard  →  your project  →  SQL Editor
--   2. Click "New query", paste this WHOLE file, press RUN.
--   3. You should see "Success. No rows returned".
--
-- It is safe to run more than once (everything uses IF NOT EXISTS / ON CONFLICT).
-- This mirrors prisma/schema.prisma exactly, so you do NOT need to run
-- `prisma db push` if you use this file.
-- ============================================================================

-- ─── users (synced from Clerk) ───────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS "users" (
  "id"        TEXT         NOT NULL,
  "email"     TEXT         NOT NULL,
  "name"      TEXT,
  "imageUrl"  TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "users_email_key" ON "users"("email");

-- ─── subscriptions ───────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS "subscriptions" (
  "id"                   TEXT         NOT NULL,
  "userId"               TEXT         NOT NULL,
  "plan"                 TEXT         NOT NULL DEFAULT 'FREE',
  "status"               TEXT         NOT NULL DEFAULT 'ACTIVE',
  "stripeCustomerId"     TEXT,
  "stripeSubscriptionId" TEXT,
  "stripePriceId"        TEXT,
  "currentPeriodStart"   TIMESTAMP(3),
  "currentPeriodEnd"     TIMESTAMP(3),
  "createdAt"            TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"            TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "subscriptions_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "subscriptions_userId_fkey" FOREIGN KEY ("userId")
    REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE UNIQUE INDEX IF NOT EXISTS "subscriptions_userId_key" ON "subscriptions"("userId");

-- ─── templates ───────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS "templates" (
  "id"           TEXT         NOT NULL,
  "name"         TEXT         NOT NULL,
  "description"  TEXT,
  "category"     TEXT         NOT NULL DEFAULT 'WEDDING',
  "thumbnailUrl" TEXT,
  "isPublic"     BOOLEAN      NOT NULL DEFAULT true,
  "createdBy"    TEXT,
  "config"       TEXT         NOT NULL DEFAULT '{}',
  "createdAt"    TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"    TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "templates_pkey" PRIMARY KEY ("id")
);

-- ─── events ──────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS "events" (
  "id"             TEXT         NOT NULL,
  "userId"         TEXT         NOT NULL,
  "name"           TEXT         NOT NULL,
  "slug"           TEXT         NOT NULL,
  "eventType"      TEXT         NOT NULL DEFAULT 'WEDDING',
  "date"           TIMESTAMP(3) NOT NULL,
  "time"           TEXT,
  "venue"          TEXT         NOT NULL,
  "description"    TEXT,
  "dressCode"      TEXT,
  "rsvpDeadline"   TIMESTAMP(3),
  "organizerName"  TEXT,
  "organizerPhone" TEXT,
  "organizerEmail" TEXT,
  "logoUrl"        TEXT,
  "coverUrl"       TEXT,
  "primaryColor"   TEXT         NOT NULL DEFAULT '#0A2810',
  "secondaryColor" TEXT         NOT NULL DEFAULT '#B8860B',
  "accentColor"    TEXT         NOT NULL DEFAULT '#F8F4E3',
  "templateId"     TEXT,
  "isPublished"    BOOLEAN      NOT NULL DEFAULT false,
  "requirePhoto"   BOOLEAN      NOT NULL DEFAULT true,
  "maxGuests"      INTEGER,
  "createdAt"      TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"      TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "events_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "events_userId_fkey" FOREIGN KEY ("userId")
    REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "events_templateId_fkey" FOREIGN KEY ("templateId")
    REFERENCES "templates"("id") ON DELETE SET NULL ON UPDATE CASCADE
);
CREATE UNIQUE INDEX IF NOT EXISTS "events_slug_key"   ON "events"("slug");
CREATE        INDEX IF NOT EXISTS "events_userId_idx" ON "events"("userId");
CREATE        INDEX IF NOT EXISTS "events_slug_idx"   ON "events"("slug");

-- ─── guests ──────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS "guests" (
  "id"          TEXT         NOT NULL,
  "eventId"     TEXT         NOT NULL,
  "name"        TEXT         NOT NULL,
  "phone"       TEXT         NOT NULL,
  "email"       TEXT,
  "invited"     BOOLEAN      NOT NULL DEFAULT true,
  "importedAt"  TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "importedVia" TEXT         NOT NULL DEFAULT 'MANUAL',
  CONSTRAINT "guests_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "guests_eventId_fkey" FOREIGN KEY ("eventId")
    REFERENCES "events"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE UNIQUE INDEX IF NOT EXISTS "guests_eventId_phone_key" ON "guests"("eventId", "phone");
CREATE        INDEX IF NOT EXISTS "guests_eventId_idx"       ON "guests"("eventId");
CREATE        INDEX IF NOT EXISTS "guests_phone_idx"         ON "guests"("phone");

-- ─── rsvps ───────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS "rsvps" (
  "id"         TEXT         NOT NULL,
  "guestId"    TEXT         NOT NULL,
  "status"     TEXT         NOT NULL DEFAULT 'PENDING',
  "attendance" BOOLEAN,
  "uniqueCode" TEXT,
  "seatNumber" INTEGER,
  "cardUrl"    TEXT,
  "email"      TEXT,
  "photoUrl"   TEXT,
  "guestPhoto" TEXT,
  "rsvpedAt"   TIMESTAMP(3),
  "updatedAt"  TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "createdAt"  TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "rsvps_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "rsvps_guestId_fkey" FOREIGN KEY ("guestId")
    REFERENCES "guests"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE UNIQUE INDEX IF NOT EXISTS "rsvps_guestId_key"    ON "rsvps"("guestId");
CREATE UNIQUE INDEX IF NOT EXISTS "rsvps_uniqueCode_key" ON "rsvps"("uniqueCode");
CREATE        INDEX IF NOT EXISTS "rsvps_uniqueCode_idx" ON "rsvps"("uniqueCode");

-- ─── checkins ────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS "checkins" (
  "id"          TEXT         NOT NULL,
  "eventId"     TEXT         NOT NULL,
  "guestId"     TEXT         NOT NULL,
  "checkedInAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "checkedInBy" TEXT,
  "notes"       TEXT,
  CONSTRAINT "checkins_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "checkins_eventId_fkey" FOREIGN KEY ("eventId")
    REFERENCES "events"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "checkins_guestId_fkey" FOREIGN KEY ("guestId")
    REFERENCES "guests"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE UNIQUE INDEX IF NOT EXISTS "checkins_guestId_key"  ON "checkins"("guestId");
CREATE        INDEX IF NOT EXISTS "checkins_eventId_idx"  ON "checkins"("eventId");

-- ─── Security: lock the tables away from Supabase's public REST API ──────────
-- Invitely talks to the database directly through Prisma (as the `postgres`
-- role, which bypasses RLS), so enabling RLS with no policies means nobody can
-- read your guest list through the public anon key.
ALTER TABLE "users"         ENABLE ROW LEVEL SECURITY;
ALTER TABLE "subscriptions" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "templates"     ENABLE ROW LEVEL SECURITY;
ALTER TABLE "events"        ENABLE ROW LEVEL SECURITY;
ALTER TABLE "guests"        ENABLE ROW LEVEL SECURITY;
ALTER TABLE "rsvps"         ENABLE ROW LEVEL SECURITY;
ALTER TABLE "checkins"      ENABLE ROW LEVEL SECURITY;

-- ─── Starter templates (same as prisma/seed.ts) ──────────────────────────────
INSERT INTO "templates" ("id","name","description","category","isPublic","config","updatedAt") VALUES
  ('classic-ivory-wedding','Classic Ivory Wedding','Elegant ivory and gold design, perfect for formal weddings','WEDDING',true,
   '{"primaryColor":"#0A2810","secondaryColor":"#B8860B","accentColor":"#F8F4E3"}',CURRENT_TIMESTAMP),
  ('modern-birthday','Modern Birthday','Vibrant and modern design for birthday celebrations','BIRTHDAY',true,
   '{"primaryColor":"#7C3AED","secondaryColor":"#F59E0B","accentColor":"#FDF4FF"}',CURRENT_TIMESTAMP),
  ('corporate-conference','Corporate Conference','Professional navy and silver for corporate events','CONFERENCE',true,
   '{"primaryColor":"#1E3A5F","secondaryColor":"#94A3B8","accentColor":"#F8FAFC"}',CURRENT_TIMESTAMP),
  ('vip-night','VIP Night','Black and gold luxury design for exclusive events','VIP_PARTY',true,
   '{"primaryColor":"#111111","secondaryColor":"#D4A843","accentColor":"#1A1A1A"}',CURRENT_TIMESTAMP),
  ('church-program','Church Program','Serene purple and white for church events','CHURCH',true,
   '{"primaryColor":"#4C1D95","secondaryColor":"#C4B5FD","accentColor":"#FAF5FF"}',CURRENT_TIMESTAMP)
ON CONFLICT ("id") DO NOTHING;
