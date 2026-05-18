// src/app/api/upload/route.ts
import { NextRequest, NextResponse } from "next/server";
import { uploadGuestPhoto } from "@/lib/cloudinary";
import prisma from "@/lib/prisma";

export const dynamic = "force-dynamic";

const MAX_SIZE_BYTES = 5 * 1024 * 1024; // 5 MB

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get("file") as File | null;
    const guestId = formData.get("guestId") as string | null;
    const slug = formData.get("slug") as string | null;

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    if (file.size > MAX_SIZE_BYTES) {
      return NextResponse.json(
        { error: "File too large. Maximum size is 5 MB." },
        { status: 413 }
      );
    }

    if (!file.type.startsWith("image/")) {
      return NextResponse.json(
        { error: "Only image files are allowed." },
        { status: 415 }
      );
    }

    // Convert file to buffer
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Determine a stable ID for the Cloudinary public_id
    const identifier = guestId ?? slug ?? "anon";
    const result = await uploadGuestPhoto(buffer, identifier);

    // Optionally persist the photo URL back to the RSVP if guestId provided
    if (guestId) {
      await prisma.rsvp.updateMany({
        where: { guest: { id: guestId } },
        data: { photoUrl: result.url },
      });
    }

    return NextResponse.json({ url: result.url, publicId: result.publicId });
  } catch (err) {
    console.error("[UPLOAD] Error:", err);
    return NextResponse.json(
      { error: "Upload failed. Please try again." },
      { status: 500 }
    );
  }
}
