# Invitely — Multi-Event Invitation SaaS Platform
## Architecture & Migration Guide

---

## 1. Codebase Analysis — What Exists

### Current Project Summary
The existing project is a **single-tenant, single-event** wedding RSVP system built with:
- `src/app/page.tsx` — One monolithic RSVP page (verify phone → upload photo → RSVP → download card)
- `src/lib/airtable.ts` — Airtable as the database (guests, RSVP status, seat numbers, unique codes)
- `src/app/api/check-guest/` — Verifies guest by phone number
- `src/app/api/rsvp/` — Submits RSVP (assigns seat + unique code)
- `src/app/api/generate-card/route.tsx` — Generates PNG card via `next/og` ImageResponse
- `src/lib/pdf.ts` — Alternative PDF card via `pdf-lib`
- Event details hardcoded via `NEXT_PUBLIC_*` env vars

### What Is Reusable
| Existing Logic | Reuse Strategy |
|---|---|
| Phone normalization (`normalizePhone`) | Moved to `src/utils/phone.ts` |
| Unique code generation (`generateUniqueCode`) | Moved to `src/utils/codes.ts` (generalized) |
| Card generation JSX layout | Lives in `src/app/api/invite/[slug]/generate-card/route.tsx` (event-dynamic) |
| QR code generation (qrcode library) | Reused as-is |
| RSVP form flow (verify → RSVP → download) | Refactored into `src/app/invite/[slug]/page.tsx` |
| Seat number assignment logic | Adapted to PostgreSQL query |
| PDF card template (`pdf.ts`) | Kept as a template option |

### What Must Be Rebuilt
- **Database layer**: Airtable → PostgreSQL via Prisma
- **Authentication**: None exists → Clerk auth for multi-user
- **Event system**: Single hardcoded event → multi-event with slugs
- **Dashboard**: None → Full SaaS dashboard
- **Guest import**: None → Bulk CSV/Excel/text import
- **Template system**: Hardcoded wedding card → dynamic, event-type templates
- **Check-in system**: None → QR scan check-in
- **Subscription system**: None → plan-gated features

---

## 2. Database Design

### Why PostgreSQL + Prisma
- Airtable has no relational joins, no transactions, rate limits, and can't support multi-tenant queries at scale
- PostgreSQL via Supabase gives us row-level security, real-time subscriptions, and free tier
- Prisma gives type safety, migrations, and query builder

### Schema Overview (see `prisma/schema.prisma`)

```
users (via Clerk, synced via webhooks)
  └── events (one user → many events)
        ├── guests (one event → many guests)
        │     └── rsvps (one guest → one rsvp per event)
        │           └── checkins (one rsvp → one checkin)
        ├── templates (event has one active template)
        └── subscriptions (user level)
```

---

## 3. Migration Strategy

### Phase 1 — Infrastructure (Week 1)
1. Set up Supabase project (PostgreSQL)
2. Set up Clerk for authentication
3. Install Prisma, run `prisma migrate dev`
4. Set up Cloudinary for file storage

### Phase 2 — Auth + Dashboard Shell (Week 1-2)
1. Add Clerk middleware for route protection
2. Build dashboard layout with sidebar
3. Sync Clerk user webhooks → `users` table

### Phase 3 — Event + Guest System (Week 2)
1. Build event CRUD
2. Build guest management (manual + bulk import)
3. Phone normalization + deduplication

### Phase 4 — RSVP System Migration (Week 2-3)
1. Port RSVP flow to `/invite/[slug]`
2. Replace Airtable calls with Prisma queries
3. Preserve card generation, make it event-dynamic

### Phase 5 — Check-in + Analytics (Week 3)
1. QR check-in scanner page
2. Dashboard analytics
3. Subscription gates

---

## 4. Folder Structure (as built)

```
invitely/
├── prisma/
│   ├── schema.prisma              # DB schema (Prisma)
│   └── seed.ts                    # Starter templates
├── supabase/schema.sql            # Same schema as plain SQL for the Supabase SQL editor
├── scripts/check-db.ts            # `npm run db:check`
├── src/
│   ├── middleware.ts              # Clerk route protection
│   ├── app/
│   │   ├── page.tsx               # Marketing landing page
│   │   ├── (auth)/                # Clerk sign-in / sign-up
│   │   ├── (dashboard)/           # Organiser dashboard (events, guests, templates,
│   │   │                          #   analytics, billing, settings)
│   │   ├── (admin)/admin/         # Platform admin (users, plans, payments)
│   │   ├── invite/[slug]/page.tsx # Public RSVP page
│   │   ├── checkin/[slug]/page.tsx# Door scanner (organiser, admin or staff link)
│   │   └── api/
│   │       ├── events/…           # Event + guest CRUD, CSV/Excel import, analytics
│   │       ├── invite/[slug]/     # event, check-guest, rsvp, my-card, generate-card
│   │       ├── checkin/           # Check-in (authorised)
│   │       ├── billing/           # checkout + provider callback
│   │       ├── webhooks/          # clerk, flutterwave, paystack
│   │       ├── admin/             # plans, user plans, sync users
│   │       ├── templates/, guests/, upload/
│   ├── components/                # admin/, billing/, dashboard/, events/
│   ├── lib/
│   │   ├── prisma.ts, cloudinary.ts, utils.ts, ensure-user.ts
│   │   ├── admin.ts               # Who is an admin (env vars)
│   │   ├── plans.ts, plan.ts      # Plan definitions and limits
│   │   ├── payments.ts            # Flutterwave / Paystack
│   │   ├── rsvp.ts                # RSVP + seat assignment under a per-event lock
│   │   ├── checkin-auth.ts        # Check-in access + signed staff links
│   │   └── rate-limit.ts          # Limits on public endpoints
│   ├── utils/phone.ts, codes.ts   # Phone normalisation, admission codes (crypto RNG)
│   └── types/index.ts
```

### Security notes
- **Check-in** needs the organiser's login, an admin login, or the staff link
  shown on the event page (`?key=` is an HMAC of the event id).
- **Admission codes** are 8 characters from a crypto RNG and are never returned
  by the phone lookup. Returning guests need phone **and** the email they gave
  at RSVP to get their card again (`/api/invite/[slug]/my-card`).
- **Seats** are assigned inside a transaction holding a Postgres advisory lock
  per event, so simultaneous RSVPs can't share a seat.
- **Public endpoints** are rate limited per IP (in memory, per server instance).

---

## 5. Environment Variables

See `.env.example` for all required variables.

Key groups:
- `DATABASE_URL` — Supabase PostgreSQL connection
- `CLERK_*` — Authentication
- `CLOUDINARY_*` — File storage
- `NEXT_PUBLIC_APP_URL` — For generating invite URLs

---

## 6. Scalability Concerns

### Multi-tenancy
- All DB queries filtered by `userId` from Clerk session
- Events → Guests → RSVPs all cascade-deleted when user removes an event
- No cross-tenant data leakage possible at query level

### Performance
- Guest lists can be large → paginated API responses (cursor-based)
- Card generation is CPU-intensive → cache generated cards in Cloudinary
- QR check-in uses unique_code as lookup key (indexed)

### Subscription Gating
- `subscriptions` table tracks plan per user
- Free: 1 event, 50 guests
- Basic: 5 events, 500 guests
- Premium: Unlimited events, unlimited guests

---

## 7. Deployment

### Vercel (Recommended)
1. Push to GitHub
2. Connect to Vercel
3. Add environment variables
4. Deploy

### Database
- Supabase managed PostgreSQL (free tier: 500MB, 2 projects)
- Run `npx prisma migrate deploy` in build step

### File Storage
- Cloudinary free tier: 25GB storage, 25GB monthly bandwidth

---

## 8. Key Technical Decisions

| Decision | Choice | Reason |
|---|---|---|
| Auth | Clerk | Best Next.js App Router support, webhook sync |
| Database | Supabase PostgreSQL | Free tier, Prisma compatible, RLS |
| ORM | Prisma | Type-safe, migration system |
| File Storage | Cloudinary | Easy image transformation, CDN |
| UI | Tailwind + shadcn/ui | Consistent, accessible |
| Card Generation | next/og (ImageResponse) | Reuses existing logic, fast |
