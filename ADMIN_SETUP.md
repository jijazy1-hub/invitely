# Invitely admin: setup (about 15 minutes)

## 1. Database (Supabase)
Supabase > SQL Editor > New query > paste `migration_admin.sql` > Run.
It only adds things (two columns, two tables), so it is safe on your live data.

## 2. Schema
Open `schema_additions.prisma.txt` and copy the two changes into `prisma/schema.prisma`
(the datasource block stays as it is).

## 3. Code
Unzip `admin-update-files.zip` into your `invitely/` app folder, merging and overwriting.
(Paths inside the zip are already relative to that folder.)
Then, from /workspaces/invitely:

    git add .
    git commit -m "Add admin dashboard, payments (Flutterwave/Paystack), analytics page"
    git push

## 4. Environment variables (Vercel > Settings > Environment Variables)
Add these, for Production (and Preview if you use it), then redeploy.

| Variable | Value |
|---|---|
| `ADMIN_EMAILS` | your email(s), comma separated. Must match the email you sign in with |
| `FLUTTERWAVE_SECRET_KEY` | Flutterwave dashboard > Settings > API Keys (Secret key) |
| `FLUTTERWAVE_WEBHOOK_HASH` | any long random string you invent; you paste the same string into Flutterwave |
| `PAYSTACK_SECRET_KEY` | Paystack dashboard > Settings > API Keys (Secret key) |

You only need the platform(s) you actually use. A platform with no key is hidden from customers.
Use the TEST keys first. Nothing needs changing in code to go live: swap in the live keys.

## 5. Webhooks
Open /admin/payments after deploying. It shows the exact webhook URL for each platform.
- Flutterwave: Settings > Webhooks. Paste the URL; set "Secret hash" to your FLUTTERWAVE_WEBHOOK_HASH.
- Paystack: Settings > API Keys & Webhooks. Paste the URL as the webhook URL.

## 6. First use
- Sign in with your admin email. An "Admin" link appears at the bottom of the sidebar (also: /admin).
- Users > "Sync from Clerk" once, to import everyone who has already signed up.
- Plans: set your real prices and limits.
- Test a purchase with a test card from a second account.
