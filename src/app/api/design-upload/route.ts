import { NextResponse } from "next/server";
import { storeImages } from "@/lib/upload";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Upload a 3D design screenshot (data URL PNG from the canvas) and return
 * the stored public URL, to be saved on `custom_spec.design_image_url`.
 */
export async function POST(req: Request) {
  let body: { dataUrl?: string };
  try {
    body = (await req.json()) as { dataUrl?: string };
  } catch {
    return NextResponse.json({ error: "Bad request" }, { status: 400 });
  }
  const dataUrl = body.dataUrl ?? "";
  const match = dataUrl.match(/^data:image\/png;base64,(.+)$/);
  if (!match) return NextResponse.json({ error: "PNG data URL লাগবে" }, { status: 400 });

  const buf = Buffer.from(match[1], "base64");
  if (buf.length === 0 || buf.length > 5 * 1024 * 1024) {
    return NextResponse.json({ error: "ছবি খুব বড়" }, { status: 400 });
  }
  const file = new File([buf], "design.png", { type: "image/png" });
  const result = await storeImages([file]);
  if (!result.urls.length) {
    return NextResponse.json({ error: result.error ?? "আপলোড ব্যর্থ" }, { status: 400 });
  }
  return NextResponse.json({ url: result.urls[0], mode: result.mode });
}
