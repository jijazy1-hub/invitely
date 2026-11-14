// src/lib/guest-photo.ts
// Saves the photo a guest adds when they RSVP, so it can be shown when they
// check in (on their phone and on the staff scanner) and drawn on their card.
//
// If Cloudinary is configured (CLOUDINARY_CLOUD_NAME/API_KEY/API_SECRET), the photo
// goes there and rsvps.photoUrl holds the link. Otherwise the small JPEG the
// browser made (~50–120 KB) is kept in rsvps.guestPhoto as a data URL.
import prisma from "@/lib/prisma";

const MAX_INLINE_BYTES = 400_000;

function cloudinaryConfigured(): boolean {
  return !!(process.env.CLOUDINARY_CLOUD_NAME && process.env.CLOUDINARY_API_KEY && process.env.CLOUDINARY_API_SECRET);
}

export function isPhotoDataUrl(v: unknown): v is string {
  return typeof v === "string" && /^data:image\/(jpeg|jpg|png);base64,[A-Za-z0-9+/=]+$/.test(v) && v.length < 1_500_000;
}

/** Stores the photo for a guest's RSVP. Never throws: a failed save must not break the RSVP. */
export async function saveGuestPhoto(guestId: string, dataUrl: string): Promise<void> {
  if (!isPhotoDataUrl(dataUrl)) return;
  try {
    if (cloudinaryConfigured()) {
      const { uploadGuestPhoto } = await import("@/lib/cloudinary");
      const result = await uploadGuestPhoto(dataUrl, guestId);
      await prisma.rsvp.update({ where: { guestId }, data: { photoUrl: result.url, guestPhoto: null } });
      return;
    }
    if (dataUrl.length <= MAX_INLINE_BYTES) {
      await prisma.rsvp.update({ where: { guestId }, data: { guestPhoto: dataUrl } });
    }
  } catch (error) {
    console.error("[PHOTO] Could not save guest photo:", error);
  }
}

/** Deletes an event's guest photos from Cloudinary (best effort). Inline photos go with the database rows. */
export async function deleteEventPhotos(eventId: string): Promise<void> {
  if (!cloudinaryConfigured()) return;
  try {
    const rows = await prisma.rsvp.findMany({
      where: { guest: { eventId }, photoUrl: { startsWith: "https://res.cloudinary.com/" } },
      select: { photoUrl: true },
    });
    if (!rows.length) return;
    const { deleteFromCloudinary } = await import("@/lib/cloudinary");
    await Promise.all(
      rows.map(async ({ photoUrl }) => {
        // .../upload/v1700000000/invitely/guests/guest_abc_123.jpg -> invitely/guests/guest_abc_123
        const m = photoUrl!.match(/\/upload\/(?:[^/]+\/)*?v\d+\/(.+?)\.[a-z0-9]+$/i);
        if (m) await deleteFromCloudinary(m[1]).catch(() => undefined);
      })
    );
  } catch (error) {
    console.error("[PHOTO] Could not delete event photos:", error);
  }
}

/** The stored photo (URL or data URL) for an RSVP, if any. */
export function storedPhoto(rsvp: { photoUrl: string | null; guestPhoto: string | null } | null | undefined): string | null {
  if (!rsvp) return null;
  if (rsvp.photoUrl && /^https:\/\//.test(rsvp.photoUrl)) return rsvp.photoUrl;
  if (isPhotoDataUrl(rsvp.guestPhoto)) return rsvp.guestPhoto;
  return null;
}
