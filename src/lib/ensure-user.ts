import { currentUser } from "@clerk/nextjs/server";
import prisma from "@/lib/prisma";

/**
 * Makes sure a row exists in the `users` table for the signed-in Clerk user.
 * (The Clerk webhook normally does this, but it can't run on localhost and may
 * not be configured yet — so every write path calls this as a safety net.)
 */
export async function ensureUser(userId: string) {
  const existing = await prisma.user.findUnique({ where: { id: userId } });
  if (existing) return existing;

  let email = `${userId}@placeholder.invitely.app`;
  let name: string | null = null;
  let imageUrl: string | null = null;

  try {
    const u = await currentUser();
    if (u) {
      email = u.emailAddresses?.[0]?.emailAddress ?? email;
      name = [u.firstName, u.lastName].filter(Boolean).join(" ") || null;
      imageUrl = u.imageUrl ?? null;
    }
  } catch {
    /* fall back to placeholder values */
  }

  try {
    return await prisma.user.upsert({
      where: { id: userId },
      update: {},
      create: { id: userId, email, name, imageUrl },
    });
  } catch (err: any) {
    // Email already used by an older row (e.g. from a different Clerk instance)
    if (err?.code === "P2002") {
      return prisma.user.upsert({
        where: { id: userId },
        update: {},
        create: { id: userId, email: `${userId}@placeholder.invitely.app`, name, imageUrl },
      });
    }
    throw err;
  }
}
