// src/lib/rsvp.ts
// Recording RSVPs and handing out seat numbers safely.
//
// Seat numbers are "highest confirmed seat in this event + 1". Without a lock, two
// guests confirming at the same moment both read the same highest seat and get the
// same number. Every write here runs inside a transaction that first takes a
// Postgres advisory lock for the event, so RSVPs for one event are processed one at
// a time (other events are unaffected). The lock is released when the transaction ends.
import type { Prisma } from "@prisma/client";
import prisma from "@/lib/prisma";
import { generateUniqueCode } from "@/utils/codes";

type Tx = Prisma.TransactionClient;

export type RsvpResult = {
  status: "CONFIRMED" | "DECLINED";
  uniqueCode: string | null;
  seatNumber: number | null;
};

async function withEventLock<T>(eventId: string, fn: (tx: Tx) => Promise<T>): Promise<T> {
  return prisma.$transaction(
    async (tx) => {
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${eventId}))`;
      return fn(tx);
    },
    { maxWait: 10_000, timeout: 15_000 }
  );
}

/** Next free seat and a fresh admission code. Must be called while holding the event lock. */
async function nextSeatAndCode(tx: Tx, eventId: string) {
  const max = await tx.rsvp.aggregate({
    where: { status: "CONFIRMED", guest: { eventId } },
    _max: { seatNumber: true },
  });
  const seatNumber = (max._max.seatNumber ?? 0) + 1;

  // Collisions are astronomically unlikely, but check rather than let the insert fail
  // (a failed statement would abort the whole transaction).
  for (let i = 0; i < 5; i++) {
    const uniqueCode = generateUniqueCode();
    const taken = await tx.rsvp.findUnique({ where: { uniqueCode }, select: { id: true } });
    if (!taken) return { seatNumber, uniqueCode };
  }
  throw new Error("Could not generate a unique admission code");
}

/**
 * Record a guest's response. Returns `{ alreadyResponded: true }` if they had
 * already confirmed or declined (checked inside the lock, so a double-click or two
 * tabs can't create two RSVPs).
 */
export async function recordRsvp(
  eventId: string,
  guestId: string,
  email: string,
  willAttend: boolean
): Promise<{ alreadyResponded: true } | { alreadyResponded: false; rsvp: RsvpResult }> {
  return withEventLock(eventId, async (tx) => {
    const existing = await tx.rsvp.findUnique({ where: { guestId } });
    if (existing && (existing.status === "CONFIRMED" || existing.status === "DECLINED")) {
      return { alreadyResponded: true as const };
    }

    const now = new Date();
    let data: Prisma.RsvpUncheckedCreateInput;
    if (willAttend) {
      const { seatNumber, uniqueCode } = await nextSeatAndCode(tx, eventId);
      data = { guestId, status: "CONFIRMED", email, attendance: true, seatNumber, uniqueCode, rsvpedAt: now };
    } else {
      data = { guestId, status: "DECLINED", email, attendance: false, rsvpedAt: now };
    }

    const { guestId: _g, ...update } = data;
    const rsvp = await tx.rsvp.upsert({ where: { guestId }, create: data, update });
    await tx.guest.update({ where: { id: guestId }, data: { email } });

    return {
      alreadyResponded: false as const,
      rsvp: {
        status: rsvp.status as "CONFIRMED" | "DECLINED",
        uniqueCode: rsvp.uniqueCode,
        seatNumber: rsvp.seatNumber,
      },
    };
  });
}

/**
 * For confirmed RSVPs created before codes existed (old Airtable data): give them
 * a seat and code now. Returns the RSVP's code and seat either way.
 */
export async function ensureCodeAndSeat(eventId: string, guestId: string) {
  return withEventLock(eventId, async (tx) => {
    const rsvp = await tx.rsvp.findUnique({ where: { guestId } });
    if (!rsvp || rsvp.status !== "CONFIRMED") return null;
    if (rsvp.uniqueCode && rsvp.seatNumber) {
      return { uniqueCode: rsvp.uniqueCode, seatNumber: rsvp.seatNumber };
    }
    const fresh = await nextSeatAndCode(tx, eventId);
    const updated = await tx.rsvp.update({
      where: { guestId },
      data: {
        uniqueCode: rsvp.uniqueCode ?? fresh.uniqueCode,
        seatNumber: rsvp.seatNumber ?? fresh.seatNumber,
      },
    });
    return { uniqueCode: updated.uniqueCode!, seatNumber: updated.seatNumber! };
  });
}
