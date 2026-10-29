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
| Card generation JSX layout | Refactored into `src/lib/card-generator.ts` (event-dynamic) |
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

## 4. Folder Structure

```
invitely/
├── prisma/
│   └── schema.prisma              # DB schema
├── src/
│   ├── app/
│   │   ├── (auth)/                # Clerk auth pages
│   │   │   ├── sign-in/[[...sign-in]]/page.tsx
│   │   │   └── sign-up/[[...sign-up]]/page.tsx
│   │   ├── (dashboard)/           # Protected dashboard
│   │   │   ├── layout.tsx         # Sidebar layout
│   │   │   ├── dashboard/page.tsx # Overview
│   │   │   ├── events/
│   │   │   │   ├── page.tsx       # All events
│   │   │   │   ├── new/page.tsx   # Create event
│   │   │   │   └── [eventId]/
│   │   │   │       ├── page.tsx   # Event detail
│   │   │   │       ├── guests/page.tsx
│   │   │   │       └── analytics/page.tsx
│   │   │   ├── templates/page.tsx
│   │   │   ├── analytics/page.tsx
│   │   │   ├── billing/page.tsx
│   │   │   └── settings/page.tsx
│   │   ├── invite/[slug]/page.tsx # Public RSVP page
│   │   ├── checkin/[slug]/page.tsx # QR check-in scanner
│   │   ├── api/
│   │   │   ├── webhooks/clerk/route.ts
│   │   │   ├── events/route.ts    # GET/POST events
│   │   │   ├── events/[eventId]/
│   │   │   │   ├── route.ts       # GET/PUT/DELETE event
│   │   │   │   └── guests/
│   │   │   │       ├── route.ts   # GET/POST guests
│   │   │   │       └── import/route.ts # Bulk import
│   │   │   ├── invite/[slug]/
│   │   │   │   ├── check-guest/route.ts
│   │   │   │   ├── rsvp/route.ts
│   │   │   │   └── generate-card/route.tsx
│   │   │   └── checkin/route.ts   # Check-in via QR
│   │   ├── globals.css
│   │   └── layout.tsx
│   ├── components/
│   │   ├── ui/                    # shadcn/ui components
│   │   ├── dashboard/
│   │   │   ├── sidebar.tsx
│   │   │   ├── stats-card.tsx
│   │   │   └── event-card.tsx
│   │   ├── events/
│   │   │   ├── event-form.tsx
│   │   │   └── guest-import.tsx
│   │   ├── invite/
│   │   │   └── rsvp-form.tsx
│   │   └── checkin/
│   │       └── qr-scanner.tsx
│   ├── lib/
│   │   ├── prisma.ts              # Prisma singleton
│   │   ├── cloudinary.ts          # File uploads
│   │   └── card-generator.ts     # Dynamic card generation
│   ├── utils/
│   │   ├── phone.ts               # normalizePhone (reused)
│   │   └── codes.ts               # generateUniqueCode (reused)
│   ├── hooks/
│   │   └── use-event.ts
│   └── types/
│       └── index.ts
├── .env.example
├── package.json
└── tailwind.config.ts
```

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
