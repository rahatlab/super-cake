export const MAX_IMAGE_EDGE = 1600;
export const IMAGE_JPEG_QUALITY = 0.82;

/**
 * Client-side resize/compress before upload (browser only). Longest edge is
 * capped at 1600px; JPEG/WebP are re-encoded at 0.82 quality, PNG keeps its
 * transparency. GIF/AVIF pass through untouched. Any failure returns the
 * original file so upload never breaks because of compression.
 *
 * Kept separate from `upload.ts` (which imports `fs`/`path`) so the client
 * form never pulls Node built-ins into the browser bundle.
 */
export async function compressImageFile(file: File): Promise<File> {
  if (typeof window === "undefined" || typeof createImageBitmap !== "function") return file;
  if (!/^image\/(jpeg|png|webp)$/i.test(file.type)) return file;
  try {
    const bitmap = await createImageBitmap(file);
    const scale = Math.min(1, MAX_IMAGE_EDGE / Math.max(bitmap.width, bitmap.height));
    const w = Math.max(1, Math.round(bitmap.width * scale));
    const h = Math.max(1, Math.round(bitmap.height * scale));
    const canvas = document.createElement("canvas");
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext("2d");
    if (!ctx) return file;
    ctx.drawImage(bitmap, 0, 0, w, h);
    bitmap.close?.();
    const type = file.type === "image/png" ? "image/png" : "image/jpeg";
    const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, type, IMAGE_JPEG_QUALITY));
    if (!blob || blob.size >= file.size) return file;
    const ext = type === "image/png" ? "png" : "jpg";
    return new File([blob], file.name.replace(/\.[^.]+$/, `.${ext}`), { type, lastModified: Date.now() });
  } catch {
    return file;
  }
}
