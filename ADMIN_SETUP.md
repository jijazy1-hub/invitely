# Invitely admin: setup (about 15 minutes)

## 1. Database (Supabase)
Supabase > SQL Editor > New query > paste the whole of `supabase/schema.sql` > Run.
It only adds what's missing (IF NOT EXISTS), so it is safe on your live data.

## 2. Schema
Nothing to do: `prisma/schema.prisma` already includes the Payment and PlanConfig models.

## 3. Code
Commit and push; Vercel deploys automatically.

## 4. Environment variables (Vercel > Settings > Environment Variables)
Add these, for Production (and Preview if you use it), then redeploy.

| Variable | Value |
|---|---|
| `ADMIN_EMAILS` | your email(s), comma separated. Must match the email you sign in with |
| `FLUTTERWAVE_SECRET_KEY` | Flutterwave dashboard > Settings > API Keys (Secret key) |
| `FLUTTERWAVE_WEBHOOK_HASH` | any long random string you invent; you paste the same string into Flutterwave |
| `PAYSTACK_SECRET_KEY` | Paystack dashboard > Settings > API Keys (Secret key) |
| `CHECKIN_SECRET` | optional; any long random string. Signs the staff check-in links |
| `RESEND_API_KEY` | resend.com > API Keys. Turns on confirmation emails with the card attached |
| `EMAIL_FROM` | e.g. `Invitely <invites@yourdomain.com>`; the domain must be verified in Resend > Domains |
| `NEXT_PUBLIC_SUPPORT_EMAIL` | shown on the home page Support section and in the privacy policy |
| `NEXT_PUBLIC_SUPPORT_WHATSAPP` | WhatsApp number, digits only, e.g. `2348012345678` |
| `NEXT_PUBLIC_APP_URL` | your live address, e.g. `https://invitely.ng` (used in emails and QR codes) |

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
