// src/lib/admin.ts
// Who is an admin? Anyone whose Clerk user id is in ADMIN_USER_IDS, or whose
// VERIFIED email is in ADMIN_EMAILS (both comma-separated env vars).
// If neither variable is set, nobody is an admin (fails closed).
import { auth, currentUser } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

function parseList(value: string | undefined): string[] {
  return (value ?? "")
    .split(",")
    .map((v) => v.trim().toLowerCase())
    .filter(Boolean);
}

export type AdminContext = { userId: string; email: string | null };

export async function getAdminContext(): Promise<AdminContext | null> {
  const adminIds = parseList(process.env.ADMIN_USER_IDS);
  const adminEmails = parseList(process.env.ADMIN_EMAILS);
  if (adminIds.length === 0 && adminEmails.length === 0) return null;

  const { userId } = await auth();
  if (!userId) return null;

  if (adminIds.includes(userId.toLowerCase())) {
    return { userId, email: null };
  }

  const user = await currentUser();
  if (!user) return null;

  for (const e of user.emailAddresses) {
    const verified = e.verification?.status === "verified";
    if (verified && adminEmails.includes(e.emailAddress.toLowerCase())) {
      return { userId, email: e.emailAddress };
    }
  }
  return null;
}

/** For API routes: returns the admin context, or a ready-made 401/403 response. */
export async function requireAdminApi(): Promise<
  { ok: true; admin: AdminContext } | { ok: false; response: NextResponse }
> {
  try {
    const { userId } = await auth();
    if (!userId) {
      return { ok: false, response: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) };
    }
    const admin = await getAdminContext();
    if (!admin) {
      return { ok: false, response: NextResponse.json({ error: "Forbidden" }, { status: 403 }) };
    }
    return { ok: true, admin };
  } catch (error) {
    console.error("[ADMIN] auth check failed:", error);
    return { ok: false, response: NextResponse.json({ error: "Forbidden" }, { status: 403 }) };
  }
}
