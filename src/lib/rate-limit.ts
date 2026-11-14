// src/lib/rate-limit.ts
// Small fixed-window rate limiter for the public (no-login) endpoints.
//
// It keeps counts in memory, so on Vercel each server instance counts on its own.
// That is enough to stop a script hammering one endpoint thousands of times
// (guessing phone numbers or admission codes), but it is not a hard global limit.
// For that, swap the Map for Upstash Redis / Vercel KV; the interface stays the same.
import { NextResponse } from "next/server";

type Bucket = { count: number; resetAt: number };
const buckets = new Map<string, Bucket>();
let lastSweep = Date.now();

function sweep(now: number) {
  if (now - lastSweep < 60_000) return;
  lastSweep = now;
  buckets.forEach((b, k) => {
    if (b.resetAt <= now) buckets.delete(k);
  });
}

/** Returns true if the call is allowed, false if `key` has used up `limit` calls in this window. */
export function hit(key: string, limit: number, windowMs: number): boolean {
  const now = Date.now();
  sweep(now);
  const b = buckets.get(key);
  if (!b || b.resetAt <= now) {
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    return true;
  }
  b.count += 1;
  return b.count <= limit;
}

/** Best-effort client IP. Vercel always sets x-forwarded-for. */
export function clientIp(req: Request): string {
  const fwd = req.headers.get("x-forwarded-for");
  if (fwd) return fwd.split(",")[0].trim();
  return req.headers.get("x-real-ip")?.trim() || "unknown";
}

/**
 * Apply one or more limits. Returns a ready-made 429 response if any is exceeded,
 * or null if the request may go ahead.
 */
export function rateLimit(
  rules: { key: string; limit: number; windowMs: number }[]
): NextResponse | null {
  for (const r of rules) {
    if (!hit(r.key, r.limit, r.windowMs)) {
      return NextResponse.json(
        { error: "Too many attempts. Please wait a few minutes and try again." },
        { status: 429 }
      );
    }
  }
  return null;
}

export const MINUTE = 60_000;
