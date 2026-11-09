import { promises as fs } from "fs";
import path from "path";
import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { requireAdmin } from "@/lib/auth";
import { uid } from "@/lib/utils";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Upload a custom notification sound (admin only, ≤1MB WAV/MP3). */
export async function POST(req: Request) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  let body: { dataUrl?: string };
  try {
    body = (await req.json()) as { dataUrl?: string };
  } catch {
    return NextResponse.json({ error: "Bad request" }, { status: 400 });
  }
  const match = (body.dataUrl ?? "").match(/^data:audio\/([a-z0-9.+-]+);base64,([\s\S]+)$/i);
  if (!match) return NextResponse.json({ error: "Audio data URL লাগবে" }, { status: 400 });

  const buf = Buffer.from(match[2], "base64");
  if (buf.length === 0 || buf.length > 1024 * 1024) {
    return NextResponse.json({ error: "সর্বোচ্চ 1MB" }, { status: 400 });
  }
  const ext = match[1].includes("mpeg") ? "mp3" : match[1].includes("wav") ? "wav" : "bin";
  const mime = ext === "mp3" ? "audio/mpeg" : ext === "wav" ? "audio/wav" : "application/octet-stream";

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (url && key) {
    const sb = createClient(url, key, { auth: { persistSession: false } });
    const keyPath = `sounds/${uid("snd")}.${ext}`;
    const { error } = await sb.storage.from("cakes").upload(keyPath, buf, { contentType: mime, upsert: false });
    if (error) return NextResponse.json({ error: error.message }, { status: 400 });
    return NextResponse.json({ url: sb.storage.from("cakes").getPublicUrl(keyPath).data.publicUrl, mode: "supabase" });
  }

  const dir = path.join(process.cwd(), "public", "uploads");
  await fs.mkdir(dir, { recursive: true });
  const name = `${uid("snd")}.${ext}`;
  await fs.writeFile(path.join(dir, name), buf);
  return NextResponse.json({ url: `/uploads/${name}`, mode: "local" });
}
