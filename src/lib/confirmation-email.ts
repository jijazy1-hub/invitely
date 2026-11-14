// src/lib/confirmation-email.ts
// The email a guest receives after confirming: their check-in code, seat, event
// details, a link to check in on their phone, and the admission card attached.
import prisma from "@/lib/prisma";
import { renderCardPng } from "@/lib/card";
import { sendEmail, escapeHtml } from "@/lib/email";
import { appUrl } from "@/lib/site";
import { storedPhoto } from "@/lib/guest-photo";
import { designForEvent } from "@/lib/event-design";

export async function sendConfirmationEmail(guestId: string, photo?: string | null): Promise<boolean> {
  const guest = await prisma.guest.findUnique({
    where: { id: guestId },
    include: { rsvp: true, event: { include: { template: true } } },
  });
  const rsvp = guest?.rsvp;
  if (!guest || !rsvp || rsvp.status !== "CONFIRMED" || !rsvp.uniqueCode) return false;
  const to = rsvp.email || guest.email;
  if (!to) return false;

  const { event } = guest;
  const code = rsvp.uniqueCode;
  const dateText = event.date.toLocaleDateString("en-GB", {
    weekday: "long", day: "numeric", month: "long", year: "numeric", timeZone: "UTC",
  });
  const when = event.time ? `${dateText} at ${event.time}` : dateText;
  const base = appUrl();
  const inviteLink = `${base}/invite/${event.slug}`;
  const arriveLink = `${base}/arrive/${event.slug}?code=${encodeURIComponent(code)}`;

  let card: Buffer | null = null;
  try {
    card = await renderCardPng({
      eventName: event.name, eventType: event.eventType, date: event.date, time: event.time,
      venue: event.venue, dressCode: event.dressCode, primaryColor: event.primaryColor,
      secondaryColor: event.secondaryColor, accentColor: event.accentColor,
      guestName: guest.name, seatNumber: rsvp.seatNumber, code, photo: photo ?? storedPhoto(rsvp),
    }, { design: designForEvent(event) });
  } catch (error) {
    console.error("[EMAIL] Card render failed; sending without attachment:", error);
  }

  const e = escapeHtml;
  const primary = /^#[0-9a-fA-F]{6}$/.test(event.primaryColor) ? event.primaryColor : "#0A2810";
  const gold = /^#[0-9a-fA-F]{6}$/.test(event.secondaryColor) ? event.secondaryColor : "#B8860B";

  const html = `<!doctype html><html><body style="margin:0;background:#f4f2ec;font-family:Arial,Helvetica,sans-serif;color:#1a1a1a">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f4f2ec;padding:24px 12px"><tr><td align="center">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background:#ffffff;border-radius:16px;overflow:hidden">
  <tr><td style="background:${primary};padding:32px 28px;text-align:center">
    <div style="color:${gold};font-size:12px;letter-spacing:4px;font-weight:bold">YOU'RE CONFIRMED</div>
    <div style="color:#ffffff;font-size:28px;font-weight:bold;margin-top:10px">${e(event.name)}</div>
  </td></tr>
  <tr><td style="padding:28px">
    <p style="margin:0 0 16px;font-size:16px">Hi ${e(guest.name)},</p>
    <p style="margin:0 0 20px;font-size:15px;line-height:1.5">Thank you for confirming. Your admission card is attached. Show it (or this email) at the entrance.</p>
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border:2px solid ${gold};border-radius:12px">
      <tr><td style="padding:18px;text-align:center">
        <div style="font-size:11px;letter-spacing:3px;color:#777;font-weight:bold">YOUR CHECK-IN CODE</div>
        <div style="font-size:30px;font-weight:bold;letter-spacing:3px;color:${primary};margin-top:6px;font-family:'Courier New',monospace">${e(code)}</div>
        <div style="font-size:14px;color:#444;margin-top:8px">Seat ${rsvp.seatNumber ?? "TBA"}</div>
      </td></tr>
    </table>
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-top:22px;font-size:14px;line-height:1.6">
      <tr><td style="color:#777;width:90px;vertical-align:top">When</td><td>${e(when)}</td></tr>
      <tr><td style="color:#777;vertical-align:top">Where</td><td>${e(event.venue)}</td></tr>
      ${event.dressCode ? `<tr><td style="color:#777;vertical-align:top">Dress code</td><td>${e(event.dressCode)}</td></tr>` : ""}
    </table>
    <p style="margin:24px 0 8px;font-size:14px;line-height:1.5"><b>At the venue:</b> scan the check-in QR code at the entrance, or tap the button below, to check yourself in with your phone.</p>
    <p style="margin:0 0 8px;text-align:center"><a href="${arriveLink}" style="display:inline-block;background:${primary};color:#ffffff;text-decoration:none;font-weight:bold;padding:12px 24px;border-radius:10px">Check in on arrival</a></p>
    <p style="margin:18px 0 0;font-size:12px;color:#888;line-height:1.5">Lost the card? Download it again at <a href="${inviteLink}" style="color:${primary}">${e(inviteLink)}</a> using your phone number and this email address. This card is personal; please don't share your code.</p>
  </td></tr>
</table></td></tr></table></body></html>`;

  const text = [
    `Hi ${guest.name},`,
    ``,
    `You're confirmed for ${event.name}.`,
    ``,
    `Check-in code: ${code}`,
    `Seat: ${rsvp.seatNumber ?? "TBA"}`,
    `When: ${when}`,
    `Where: ${event.venue}`,
    event.dressCode ? `Dress code: ${event.dressCode}` : "",
    ``,
    `Show the attached card or this code at the entrance, or check in on your phone: ${arriveLink}`,
    `Download your card again: ${inviteLink}`,
  ].filter((l) => l !== null).join("\n");

  return sendEmail({
    to,
    subject: `Your admission card for ${event.name} (${code})`,
    html,
    text,
    replyTo: event.organizerEmail,
    attachments: card ? [{ filename: `${guest.name.replace(/[^\w]+/g, "_")}-admission-card.png`, content: card }] : [],
  });
}
