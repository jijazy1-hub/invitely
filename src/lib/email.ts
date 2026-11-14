// src/lib/email.ts
// Sends email through Resend (https://resend.com), using its HTTP API so no extra
// package is needed. Set in Vercel:
//   RESEND_API_KEY  re_...                    (Resend > API Keys)
//   EMAIL_FROM      "Invitely <invites@yourdomain.com>"  (a domain verified in Resend)
// Without RESEND_API_KEY, emails are skipped (logged) and everything else still works.
// Until you verify a domain, Resend's test sender (onboarding@resend.dev) only
// delivers to the email address on your Resend account.

export type Attachment = { filename: string; content: Buffer };

export function emailConfigured(): boolean {
  return !!process.env.RESEND_API_KEY?.trim();
}

export async function sendEmail(opts: {
  to: string;
  subject: string;
  html: string;
  text: string;
  replyTo?: string | null;
  attachments?: Attachment[];
}): Promise<boolean> {
  const key = process.env.RESEND_API_KEY?.trim();
  if (!key) {
    console.warn("[EMAIL] RESEND_API_KEY not set; skipping email to", opts.to);
    return false;
  }
  const from = process.env.EMAIL_FROM?.trim() || "Invitely <onboarding@resend.dev>";

  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        from,
        to: [opts.to],
        subject: opts.subject,
        html: opts.html,
        text: opts.text,
        ...(opts.replyTo ? { reply_to: opts.replyTo } : {}),
        ...(opts.attachments?.length
          ? { attachments: opts.attachments.map((a) => ({ filename: a.filename, content: a.content.toString("base64") })) }
          : {}),
      }),
    });
    if (!res.ok) {
      console.error("[EMAIL] Resend rejected the email:", res.status, await res.text().catch(() => ""));
      return false;
    }
    return true;
  } catch (error) {
    console.error("[EMAIL] Failed to send:", error);
    return false;
  }
}

export function escapeHtml(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#39;");
}
