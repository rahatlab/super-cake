import { createHash } from "crypto";
import { MAX_REVIEW_PHOTOS } from "./constants";
import { detectImage, MAX_IMAGE_BYTES } from "./upload";

/**
 * Cloudinary uploads for customer review photos.
 *
 * Server-side signed upload (no unsigned preset, so the cloud can't be used as
 * a free image host by third parties). Images are validated by magic bytes
 * first — the browser-supplied MIME type is never trusted.
 *
 * Only the resulting `secure_url` is stored; `next/image` does the resizing and
 * format negotiation on the way out (`res.cloudinary.com` is allow-listed in
 * `next.config.ts`).
 */

export { MAX_REVIEW_PHOTOS };

interface CloudinaryConfig {
  cloudName: string;
  apiKey: string;
  apiSecret: string;
}

function config(): CloudinaryConfig | null {
  const cloudName = process.env.CLOUDINARY_CLOUD_NAME?.trim();
  const apiKey = process.env.CLOUDINARY_API_KEY?.trim();
  const apiSecret = process.env.CLOUDINARY_API_SECRET?.trim();
  if (!cloudName || !apiKey || !apiSecret) return null;
  return { cloudName, apiKey, apiSecret };
}

export function isCloudinaryConfigured(): boolean {
  return config() !== null;
}

/** Cloudinary expects the params alphabetically sorted, then sha1(params+secret). */
function sign(params: Record<string, string | number>, apiSecret: string): string {
  const toSign = Object.keys(params)
    .sort()
    .map((k) => `${k}=${params[k]}`)
    .join("&");
  return createHash("sha1").update(`${toSign}${apiSecret}`).digest("hex");
}

export interface PhotoUploadResult {
  urls: string[];
  error?: string;
}

const BN = {
  tooMany: `সর্বোচ্চ ${MAX_REVIEW_PHOTOS} টি ছবি আপলোড করা যাবে`,
  tooBig: (name: string) => `${name} — সর্বোচ্চ ৫MB`,
  badType: (name: string) => `${name} — শুধু JPG, PNG, WEBP, GIF বা AVIF ছবি দিন`,
  failed: "ছবি আপলোড করা যায়নি। আবার চেষ্টা করুন।",
};

export async function uploadReviewPhotos(
  files: File[],
  folder = "super-cake/reviews",
): Promise<PhotoUploadResult> {
  const valid = files.filter((f) => f && f.size > 0);
  if (!valid.length) return { urls: [] };

  if (valid.length > MAX_REVIEW_PHOTOS) return { urls: [], error: BN.tooMany };

  const cfg = config();
  if (!cfg) return { urls: [], error: BN.failed };

  const urls: string[] = [];

  for (const file of valid) {
    if (file.size > MAX_IMAGE_BYTES) return { urls, error: BN.tooBig(file.name) };

    const buf = Buffer.from(await file.arrayBuffer());
    if (!detectImage(buf)) return { urls, error: BN.badType(file.name) };

    const timestamp = Math.floor(Date.now() / 1000);
    const params = { folder, timestamp };
    const signature = sign(params, cfg.apiSecret);

    const body = new FormData();
    body.append("file", new Blob([new Uint8Array(buf)]), file.name || "review.jpg");
    body.append("api_key", cfg.apiKey);
    body.append("timestamp", String(timestamp));
    body.append("folder", folder);
    body.append("signature", signature);

    try {
      const res = await fetch(`https://api.cloudinary.com/v1_1/${cfg.cloudName}/image/upload`, {
        method: "POST",
        body,
        cache: "no-store",
      });

      if (!res.ok) {
        console.error("[cloudinary] upload failed", res.status, await res.text());
        return { urls, error: BN.failed };
      }

      const json = (await res.json()) as { secure_url?: string };
      if (!json.secure_url) return { urls, error: BN.failed };
      urls.push(json.secure_url);
    } catch (e) {
      console.error("[cloudinary] upload error", (e as Error).message);
      return { urls, error: BN.failed };
    }
  }

  return { urls };
}
