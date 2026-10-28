import { createHmac, timingSafeEqual } from "crypto";
import { after } from "next/server";
import { WHATSAPP } from "@/lib/constants";
import { sendWhatsApp } from "@/lib/whatsapp";
import { buildAutoReply } from "@/lib/whatsapp/auto-reply";
import { logWhatsAppMessage } from "@/lib/whatsapp/log";
import { verifyPhoneCode } from "@/lib/otp";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

interface MetaMessage {
  id?: string;
  from?: string;
  timestamp?: string;
  type?: string;
  text?: { body?: string };
  button?: { text?: string };
  interactive?: {
    button_reply?: { title?: string };
    list_reply?: { title?: string };
  };
}

interface MetaWebhook {
  entry?: {
    changes?: {
      value?: {
        messages?: MetaMessage[];
      };
    }[];
  }[];
}

/** Best-effort in-process dedupe for Meta retries (webhook always acks fast). */
const seenMessages = new Map<string, number>();
const SEEN_LIMIT = 500;

function alreadyProcessed(id: string | undefined): boolean {
  if (!id) return false;
  const now = Date.now();
  if (seenMessages.has(id)) return true;
  seenMessages.set(id, now);
  if (seenMessages.size > SEEN_LIMIT) {
    for (const [key, ts] of seenMessages) {
      if (now - ts > 60 * 60_000) seenMessages.delete(key);
    }
    while (seenMessages.size > SEEN_LIMIT) {
      const oldest = seenMessages.keys().next().value;
      if (oldest === undefined) break;
      seenMessages.delete(oldest);
    }
  }
  return false;
}

function verifySignature(raw: string, signature: string | null): boolean {
  if (!WHATSAPP.appSecret) {
    if (process.env.NODE_ENV === "production") {
      console.error("[whatsapp webhook] WHATSAPP_APP_SECRET is missing in production");
      return false;
    }
    // Local/dev mode: signature verification is optional until the App Secret
    // is added to the environment.
    return true;
  }
  if (!signature?.startsWith("sha256=")) return false;

  const expected = createHmac("sha256", WHATSAPP.appSecret).update(raw).digest("hex");
  const received = signature.slice("sha256=".length);

  try {
    const a = Buffer.from(expected, "hex");
    const b = Buffer.from(received, "hex");
    return a.length === b.length && timingSafeEqual(a, b);
  } catch {
    return false;
  }
}

function extractText(message: MetaMessage): string | null {
  if (message.type === "text") return message.text?.body ?? null;
  if (message.type === "button") return message.button?.text ?? null;
  if (message.type === "interactive") {
    return (
      message.interactive?.button_reply?.title ??
      message.interactive?.list_reply?.title ??
      null
    );
  }
  return null;
}

/** `VERIFY-123456` (also accepts spaces/dashes) — proof of phone ownership. */
function extractVerificationCode(text: string): string | null {
  const match = text.trim().match(/^verify[\s\-_:]*(\d{6})$/i);
  return match ? match[1] : null;
}

async function processPayload(payload: MetaWebhook): Promise<void> {
  for (const entry of payload.entry ?? []) {
    for (const change of entry.changes ?? []) {
      const messages = change.value?.messages ?? [];
      for (const message of messages) {
        const from = message.from;
        const text = extractText(message);
        if (!from || !text) continue;
        if (alreadyProcessed(message.id)) continue;

        const code = extractVerificationCode(text);
        if (code) {
          const result = await verifyPhoneCode(from, code);
          const reply = result.ok
            ? "✅ ফোন নম্বর যাচাই সম্পন্ন হয়েছে। এখন ওয়েবসাইটে ফিরে গিয়ে “যাচাই হয়েছে” বাটনে চাপ দিন।"
            : `❌ ${result.reason ?? "কোডটি মেলেনি বা মেয়াদ শেষ।"} ওয়েবসাইট থেকে নতুন কোড নিন।`;

          const sent = await sendWhatsApp(from, reply);
          await logWhatsAppMessage({
            type: "otp_verification",
            to: from,
            status: sent.ok ? "sent" : "failed",
            detail: sent.detail,
          });
          continue;
        }

        const reply = await buildAutoReply({ text, from });
        const result = await sendWhatsApp(from, reply);
        await logWhatsAppMessage({
          type: "auto_reply",
          to: from,
          status: result.ok ? "sent" : "failed",
          detail: result.detail,
        });
      }
    }
  }
}

export async function GET(req: Request) {
  const url = new URL(req.url);
  const mode = url.searchParams.get("hub.mode");
  const token = url.searchParams.get("hub.verify_token");
  const challenge = url.searchParams.get("hub.challenge");

  if (mode === "subscribe" && token && token === WHATSAPP.verifyToken) {
    return new Response(challenge ?? "", { status: 200 });
  }
  return new Response("Forbidden", { status: 403 });
}

export async function POST(req: Request) {
  const raw = await req.text();

  if (!verifySignature(raw, req.headers.get("x-hub-signature-256"))) {
    return new Response("Invalid signature", { status: 401 });
  }

  let payload: MetaWebhook;
  try {
    payload = JSON.parse(raw) as MetaWebhook;
  } catch {
    return new Response("Bad request", { status: 400 });
  }

  // Acknowledge Meta immediately; do the actual replies after the response.
  after(async () => {
    try {
      await processPayload(payload);
    } catch (e) {
      console.error("[whatsapp webhook]", e);
    }
  });

  return new Response("OK", { status: 200 });
}
