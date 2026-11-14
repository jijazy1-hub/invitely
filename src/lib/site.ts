// src/lib/site.ts
// Site-wide settings. Set these in Vercel > Settings > Environment Variables.
//   NEXT_PUBLIC_APP_URL            https://your-domain.com
//   NEXT_PUBLIC_SUPPORT_EMAIL      support@your-domain.com
//   NEXT_PUBLIC_SUPPORT_WHATSAPP   2348012345678  (international format, digits only)
//   NEXT_PUBLIC_SUPPORT_PHONE      +234 801 234 5678 (shown as text, optional)
//   NEXT_PUBLIC_COMPANY_NAME       Legal name shown in the privacy policy (optional)

export function appUrl(): string {
  const url = process.env.NEXT_PUBLIC_APP_URL?.trim() || (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "http://localhost:3000");
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
