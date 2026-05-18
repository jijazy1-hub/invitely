// src/app/api/templates/route.ts
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import prisma from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET(_req: NextRequest) {
  try {
    const { userId } = await auth();

    // Collect public system templates + user's own templates (if logged in)
    const where = userId
      ? {
          OR: [
            { isPublic: true },
            { createdBy: userId },
          ],
        }
      : { isPublic: true };

    const templates = await prisma.template.findMany({
      where,
      orderBy: [{ isPublic: "desc" }, { createdAt: "asc" }],
    });

    return NextResponse.json({ templates });
  } catch (err) {
    console.error("[TEMPLATES] Error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
