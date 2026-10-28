import { promises as fs } from "fs";
import path from "path";
import { createClient } from "@supabase/supabase-js";
import { uid } from "./utils";

const MAX_BYTES = 5 * 1024 * 1024; // 5MB per file

type ImageKind = "jpg" | "png" | "webp" | "gif" | "avif";

const MIME: Record<ImageKind, string> = {
  jpg: "image/jpeg",
  png: "image/png",
  webp: "image/webp",
  gif: "image/gif",
  avif: "image/avif",
};

/**
 * Sniff the real image type from magic bytes. Never trust the browser-supplied
 * Content-Type or file extension: SVG is deliberately rejected because it can
 * carry scripts and is served from a public origin.
 */
function detectImage(buf: Buffer): ImageKind | null {
  if (buf.length < 12) return null;

  // JPEG: FF D8 FF
  if (buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) return "jpg";

  // PNG: 89 50 4E 47 0D 0A 1A 0A
  if (
    buf[0] === 0x89 &&
    buf[1] === 0x50 &&
    buf[2] === 0x4e &&
    buf[3] === 0x47 &&
    buf[4] === 0x0d &&
    buf[5] === 0x0a &&
    buf[6] === 0x1a &&
    buf[7] === 0x0a
  ) {
    return "png";
  }

  // GIF: GIF87a / GIF89a
  if (
    buf.subarray(0, 6).toString("ascii") === "GIF87a" ||
    buf.subarray(0, 6).toString("ascii") === "GIF89a"
  ) {
    return "gif";
  }

  // WEBP: RIFF....WEBP
  if (
    buf.subarray(0, 4).toString("ascii") === "RIFF" &&
    buf.subarray(8, 12).toString("ascii") === "WEBP"
  ) {
    return "webp";
  }

  // AVIF: ISO BMFF with ftyp brand avif/avis
  if (buf.subarray(4, 8).toString("ascii") === "ftyp") {
    const head = buf.subarray(0, 32).toString("ascii");
    if (head.includes("avif") || head.includes("avis")) return "avif";
  }

  return null;
}

export interface UploadResult {
  urls: string[];
  mode: "supabase" | "local";
  error?: string;
}

function isSupabase(): boolean {
  return Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY);
}

/**
 * Stores cake images.
 *
 * - Supabase configured -> uploads to the `cakes` public bucket and returns CDN URLs
 *   (production path; recommended).
 * - Otherwise           -> writes into /public/uploads so the demo works offline.
 *   On serverless hosts the filesystem is read-only, therefore real deployments
 *   should always provide Supabase credentials.
 */
export async function storeImages(files: File[]): Promise<UploadResult> {
  const valid = files.filter((f) => f && f.size > 0);
  if (!valid.length) return { urls: [], mode: "local", error: "কোনো ফাইল নেই" };

  const prepared: { buf: Buffer; kind: ImageKind }[] = [];

  for (const f of valid) {
    if (f.size > MAX_BYTES) {
      return { urls: [], mode: "local", error: `${f.name} — সর্বোচ্চ ৫MB` };
    }
    const buf = Buffer.from(await f.arrayBuffer());
    const kind = detectImage(buf);
    if (!kind) {
      return {
        urls: [],
        mode: "local",
        error: `${f.name} — শুধু JPG, PNG, WEBP, GIF বা AVIF ছবি আপলোড করুন`,
      };
    }
    prepared.push({ buf, kind });
  }

  if (isSupabase()) {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY!;
    const sb = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });

    const urls: string[] = [];
    for (const { buf, kind } of prepared) {
      const keyPath = `${uid("img")}.${kind}`;
      const { error } = await sb.storage.from("cakes").upload(keyPath, buf, {
        contentType: MIME[kind],
        upsert: false,
      });
      if (error) return { urls, mode: "supabase", error: error.message };
      const { data } = sb.storage.from("cakes").getPublicUrl(keyPath);
      urls.push(data.publicUrl);
    }
    return { urls, mode: "supabase" };
  }

  const dir = path.join(process.cwd(), "public", "uploads");
  await fs.mkdir(dir, { recursive: true });

  const urls: string[] = [];
  for (const { buf, kind } of prepared) {
    const name = `${uid("u")}.${kind}`;
    await fs.writeFile(path.join(dir, name), buf);
    urls.push(`/uploads/${name}`);
  }
  return { urls, mode: "local" };
}
