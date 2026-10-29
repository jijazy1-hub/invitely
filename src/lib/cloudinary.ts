// src/lib/cloudinary.ts
import { v2 as cloudinary } from "cloudinary";

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME!,
  api_key: process.env.CLOUDINARY_API_KEY!,
  api_secret: process.env.CLOUDINARY_API_SECRET!,
});

export interface UploadResult {
  url: string;
  publicId: string;
  width: number;
  height: number;
  format: string;
}

/**
 * Upload a file buffer or base64 string to Cloudinary.
 */
export async function uploadToCloudinary(
  source: string | Buffer,
  options: {
    folder?: string;
    publicId?: string;
    transformation?: object[];
  } = {}
): Promise<UploadResult> {
  const { folder = "invitely", publicId, transformation } = options;

  // Convert Buffer to base64 data URI if needed
  const uploadSource =
    Buffer.isBuffer(source)
      ? `data:image/jpeg;base64,${source.toString("base64")}`
      : source;

  const result = await cloudinary.uploader.upload(uploadSource, {
    folder,
    public_id: publicId,
    transformation,
    resource_type: "auto",
  });

  return {
    url: result.secure_url,
    publicId: result.public_id,
    width: result.width,
    height: result.height,
    format: result.format,
  };
}

/**
 * Upload a guest photo — applies face-optimised cropping and resizing.
 */
export async function uploadGuestPhoto(
  source: string | Buffer,
  guestId: string
): Promise<UploadResult> {
  return uploadToCloudinary(source, {
    folder: "invitely/guests",
    publicId: `guest_${guestId}_${Date.now()}`,
    transformation: [
      { width: 400, height: 400, crop: "fill", gravity: "face" },
      { quality: "auto", fetch_format: "auto" },
    ],
  });
}

/**
 * Delete a file from Cloudinary by its public ID.
 */
export async function deleteFromCloudinary(publicId: string): Promise<void> {
  await cloudinary.uploader.destroy(publicId);
}

export default cloudinary;
