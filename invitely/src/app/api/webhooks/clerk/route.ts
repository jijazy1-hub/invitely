// src/app/api/webhooks/clerk/route.ts
// Syncs Clerk users to the PostgreSQL users table
// Set this URL as a webhook endpoint in your Clerk dashboard:
// https://your-domain.com/api/webhooks/clerk
// Events to listen: user.created, user.updated, user.deleted

import { NextResponse } from "next/server";
import { Webhook } from "svix";
import { headers } from "next/headers";
import prisma from "@/lib/prisma";

type ClerkUserEvent = {
  type: "user.created" | "user.updated" | "user.deleted";
  data: {
    id: string;
    email_addresses: { email_address: string }[];
    first_name: string | null;
    last_name: string | null;
    image_url: string | null;
  };
};

export async function POST(req: Request) {
  const WEBHOOK_SECRET = process.env.CLERK_WEBHOOK_SECRET;
  if (!WEBHOOK_SECRET) {
    return NextResponse.json({ error: "Webhook secret not configured" }, { status: 500 });
  }

  const headerPayload = headers();
  const svixId = headerPayload.get("svix-id");
  const svixTimestamp = headerPayload.get("svix-timestamp");
  const svixSignature = headerPayload.get("svix-signature");

  if (!svixId || !svixTimestamp || !svixSignature) {
    return NextResponse.json({ error: "Missing svix headers" }, { status: 400 });
  }

  const body = await req.text();
  const wh = new Webhook(WEBHOOK_SECRET);

  let event: ClerkUserEvent;
  try {
    event = wh.verify(body, {
      "svix-id": svixId,
      "svix-timestamp": svixTimestamp,
      "svix-signature": svixSignature,
    }) as ClerkUserEvent;
  } catch {
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  const { id, email_addresses, first_name, last_name, image_url } = event.data;
  const email = email_addresses[0]?.email_address ?? "";
  const name = [first_name, last_name].filter(Boolean).join(" ") || null;

  switch (event.type) {
    case "user.created":
      await prisma.user.create({
        data: { id, email, name, imageUrl: image_url },
      });
      // Create a default free subscription
      await prisma.subscription.create({
        data: { userId: id, plan: "FREE", status: "ACTIVE" },
      });
      break;

    case "user.updated":
      await prisma.user.update({
        where: { id },
        data: { email, name, imageUrl: image_url },
      });
      break;

    case "user.deleted":
      await prisma.user.delete({ where: { id } }).catch(() => null);
      break;
  }

  return NextResponse.json({ received: true });
}
