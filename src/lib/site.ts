// src/lib/site.ts
// Site-wide settings. Set these in Vercel > Settings > Environment Variables.
//   NEXT_PUBLIC_APP_URL            https://your-domain.com
//   NEXT_PUBLIC_SUPPORT_EMAIL      support@your-domain.com
//   NEXT_PUBLIC_SUPPORT_WHATSAPP   2348012345678  (international format, digits only)
//   NEXT_PUBLIC_SUPPORT_PHONE      +234 801 234 5678 (shown as text, optional)
//   NEXT_PUBLIC_COMPANY_NAME       Legal name shown in the privacy policy (optional)

/**
 * The PUBLIC address of the site, used in invite links, QR codes and emails.
 *
 * Order:
 *   1. NEXT_PUBLIC_APP_URL (set this in Vercel, e.g. https://invitely-nine.vercel.app)
 *   2. VERCEL_PROJECT_PRODUCTION_URL: your production domain, set by Vercel automatically
 *   3. VERCEL_URL, but only on preview deployments
 *
 * Never use VERCEL_URL in production: it is the per-deployment address
 * (project-abc123-team.vercel.app), which Vercel hides behind a Vercel login,
 * so guests would be asked to sign in to Vercel.
 */
export function appUrl(): string {
  const explicit = process.env.NEXT_PUBLIC_APP_URL?.trim();
  const production = process.env.VERCEL_PROJECT_PRODUCTION_URL?.trim();
  const deployment = process.env.VERCEL_URL?.trim();
  const isPreview = process.env.VERCEL_ENV === "preview";
  let url = explicit
    || (production ? `https://${production}` : "")
    || (isPreview && deployment ? `https://${deployment}` : "")
    || "http://localhost:3000";
  if (!/^https?:\/\//.test(url)) url = `https://${url}`;
  return url.replace(/\/+$/, "");
}

export const site = {
  name: "Invitely",
  companyName: process.env.NEXT_PUBLIC_COMPANY_NAME?.trim() || "Invitely",
  supportEmail: process.env.NEXT_PUBLIC_SUPPORT_EMAIL?.trim() || "",
  supportWhatsapp: (process.env.NEXT_PUBLIC_SUPPORT_WHATSAPP ?? "").replace(/\D/g, ""),
  supportPhone: process.env.NEXT_PUBLIC_SUPPORT_PHONE?.trim() || "",
};

export function whatsappLink(message = "Hello Invitely support, I need help with"): string | null {
  return site.supportWhatsapp ? `https://wa.me/${site.supportWhatsapp}?text=${encodeURIComponent(message)}` : null;
}
