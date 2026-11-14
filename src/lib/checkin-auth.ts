// src/lib/checkin-auth.ts
// Who may check guests in (and see check-in numbers) for an event:
//   1. The event's organiser, signed in with Clerk.
//   2. A platform admin (see src/lib/admin.ts).
//   3. Door staff holding the event's staff link (/checkin/<slug>?key=...).
//      The key is an HMAC of the event id, so it can't be guessed or reused for
//      another event, and staff don't need an account.
import crypto from "crypto";
import { auth } from "@clerk/nextjs/server";
import prisma from "@/lib/prisma";
import { getAdminContext } from "@/lib/admin";

function secret(): string | null {
  // CHECKIN_SECRET is preferred. Falling back to CLERK_SECRET_KEY (always set in
  // this app) means staff links work without extra setup. Changing CHECKIN_SECRET
  // invalidates every staff link that has been handed out.
  return process.env.CHECKIN_SECRET?.trim() || process.env.CLERK_SECRET_KEY?.trim() || null;
}

/** The staff key for an event, or null if no secret is configured. Server-side only. */
export function staffKeyFor(eventId: string): string | null {
  const s = secret();
  if (!s) return null;
  return crypto.createHmac("sha256", s).update(`invitely-checkin:${eventId}`).digest("base64url").slice(0, 32);
}

function validStaffKey(eventId: string, given: string | null): boolean {
  if (!given) return false;
  const expected = staffKeyFor(eventId);
  if (!expected) return false;
  const a = Buffer.from(given);
  const b = Buffer.from(expected);
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

export type CheckinAccess =
  | { ok: true; eventId: string; checkedInBy: string }
  | { ok: false; status: 401 | 403 | 404; error: string };

export async function authorizeCheckin(req: Request, slug: string): Promise<CheckinAccess> {
  const event = await prisma.event.findUnique({ where: { slug }, select: { id: true, userId: true } });
  if (!event) return { ok: false, status: 404, error: "Event not found." };

  const key = req.headers.get("x-checkin-key") ?? new URL(req.url).searchParams.get("key");
  if (validStaffKey(event.id, key)) {
    return { ok: true, eventId: event.id, checkedInBy: "staff-link" };
  }

  let userId: string | null = null;
  try {
    userId = (await auth()).userId ?? null;
  } catch {
    userId = null;
  }

  if (!userId) {
    return {
      ok: false,
      status: 401,
      error: "Sign in as the event organiser, or open the staff check-in link from your event page.",
    };
  }
  if (userId === event.userId) return { ok: true, eventId: event.id, checkedInBy: userId };

  const admin = await getAdminContext().catch(() => null);
  if (admin) return { ok: true, eventId: event.id, checkedInBy: `admin:${userId}` };

  return { ok: false, status: 403, error: "You don't have access to check in guests for this event." };
}
