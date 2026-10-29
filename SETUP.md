# Invitely — Setup (Supabase + Vercel + GitHub Codespaces)

The app reads **everything from Supabase**. Three things must be true for it to work:

1. The tables exist in Supabase  → Step 1
2. The app has the Supabase connection strings → Step 2
3. Clerk + Cloudinary keys are set → Step 2

---

## Step 1 — Create the tables in Supabase (once, 1 minute)

1. Supabase dashboard → your project → **SQL Editor** → **New query**
2. Open `supabase/schema.sql` from this project, copy **everything**, paste, click **Run**.
3. You should see `Success. No rows returned`. (Safe to run again; it never deletes data.)

Check: **Table Editor** should now list `users, subscriptions, events, guests, rsvps, checkins, templates`.

> This is the step that was missing. Without it, "Create event" fails because the `events` table doesn't exist.

---

## Step 2 — Vercel environment variables

### 2a. The Supabase variables (already created by the integration)
In your screenshot, the **Install Integration** dialog says
`This project already has an existing environment variable … SUPABASE_JWT_SECRET`.
That means the Supabase integration is **already installed** on the `invitely` project
(`supabase-cyan-paddle` is listed under Storage). **Close that dialog — don't reinstall, and don't set a Custom Prefix**
(a prefix would rename the variables and the app wouldn't find them).

Instead verify: Vercel → `invitely` → **Settings → Environment Variables** and confirm these exist
for **Production** and **Preview** (and Development if you want `vercel env pull`):

- `POSTGRES_PRISMA_URL`
- `POSTGRES_URL_NON_POOLING`

If they are missing: Storage tab → `supabase-cyan-paddle` → **Connect Project** (select all environments, leave prefix empty).

### 2b. Clerk + Cloudinary variables
Open `.env.vercel` (in this project's `invitely/` folder), copy all of it, then in
Vercel → Settings → Environment Variables → click the first **Key** box and **paste** — Vercel splits it into rows. Save.

### 2c. Root directory
Vercel → Settings → General → **Root Directory** must be `invitely` (the app lives in that sub-folder).

### 2d. Redeploy
Deployments → latest → **⋯ → Redeploy** (environment changes only apply to new deployments).

---

## Step 3 — Run it in GitHub Codespaces

In the Codespace terminal (repo root = the folder that contains the `invitely/` folder):

```bash
# 1. Drag invitely-fixed.zip into the file explorer (left sidebar), then:
unzip -o invitely-fixed.zip && rm invitely-fixed.zip

# 2. Remove files from the old version that are no longer used
rm -f invitely/src/lib/dev-store.ts invitely/fix.sh invitely/fix2.sh invitely/fix3.sh invitely/prisma/dev.db ..env.swp

# 3. Install + check
cd invitely
npm install

# 4. Supabase connection strings are ALREADY filled in invitely/.env — nothing to do.
#    (If you ever change the database password, update POSTGRES_PRISMA_URL and
#     POSTGRES_URL_NON_POOLING in .env, and in Vercel.)

# 5. Confirm everything is wired (prints ✅ / ❌ with the exact fix)
npm run db:check

# 6. Start the app
npm run dev
```

Codespaces will pop up "Open in browser" for port 3000. Sign up, then **Events → New Event**.

---

## Step 4 — Push to GitHub → Vercel auto-deploys

```bash
cd ..                      # back to the repo root
git add -A
git commit -m "Fix Supabase connection and event creation"
git push
```

Your `.env` and `.env.vercel` files contain real keys and are **git-ignored** — they will not be pushed.
Never remove them from `.gitignore`.

---

## Optional

- **Clerk webhook** (keeps user names/emails in sync): Clerk dashboard → Webhooks → add endpoint
  `https://<your-vercel-domain>/api/webhooks/clerk`, events `user.created, user.updated, user.deleted`.
  Not required — the app creates the user row itself the first time you create an event.
- **Plan limits**: off by default so you can test. Set `ENFORCE_PLAN_LIMITS=true` in Vercel to enforce
  Free = 1 event / 50 guests, Basic = 5 events / 500 guests.

---

## Troubleshooting

| You see | Meaning | Fix |
|---|---|---|
| "Database tables are missing…" | Step 1 not done on this Supabase project | Run `supabase/schema.sql` |
| "Cannot reach the database…" | Wrong/missing `POSTGRES_PRISMA_URL` or password | Re-do Step 2a / Step 3-4; run `npm run db:check` |
| "Your account record is not in the database yet" | First request raced the user sync | Refresh and retry |
| Free plan limit message | `ENFORCE_PLAN_LIMITS=true` | Set it to `false` or remove it |
| Build fails with `@prisma/client did not initialize` | Old cached install | Redeploy with "Use existing Build Cache" **unchecked** |
| Sign-in loops / 404 on `/dashboard` | Clerk keys missing on Vercel | Step 2b, then redeploy |
