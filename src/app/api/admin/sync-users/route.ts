// src/app/api/admin/sync-users/route.ts
// Pulls users from Clerk into the database. Use it to backfill people who signed up
// before the Clerk webhook was connected, or whose row has a placeholder email.
import { NextResponse } from "next/server";
import { clerkClient } from "@clerk/nextjs/server";
import prisma from "@/lib/prisma";
import { requireAdminApi } from "@/lib/admin";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

const PAGE = 100;
const MAX_USERS = 1000;

export async function POST() {
  const gate = await requireAdminApi();
  if (!gate.ok) return gate.response;

  try {
    const client = await clerkClient();
    let synced = 0;
    let total = 0;

    for (let offset = 0; offset < MAX_USERS; offset += PAGE) {
      const page = await client.users.getUserList({ limit: PAGE, offset, orderBy: "-created_at" });
      total = page.totalCount;
      if (page.data.length === 0) break;

      for (const u of page.data) {
        const email =
          u.primaryEmailAddress?.emailAddress ?? u.emailAddresses[0]?.emailAddress ?? `${u.id}@placeholder.invitely.app`;
        const name = [u.firstName, u.lastName].filter(Boolean).join(" ") || null;
        await prisma.user.upsert({
          where: { id: u.id },
          update: { email, name, imageUrl: u.imageUrl },
          create: { id: u.id, email, name, imageUrl: u.imageUrl, createdAt: new Date(u.createdAt) },
        });
        await prisma.subscription.upsert({
          where: { userId: u.id },
          update: {},
          create: { userId: u.id, plan: "FREE", status: "ACTIVE" },
        });
        synced++;
      }
      if (page.data.length < PAGE) break;
    }

    return NextResponse.json({ ok: true, synced, totalInClerk: total, truncated: total > MAX_USERS });
  } catch (error) {
    console.error("[ADMIN][SYNC] Failed:", error);
    return NextResponse.json({ error: "Couldn't sync users from Clerk." }, { status: 500 });
  }
}
