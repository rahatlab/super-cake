import { createHmac, timingSafeEqual } from "crypto";
import { after } from "next/server";
import { WHATSAPP } from "@/lib/constants";
import { markMessageRead, sendAutoReply, sendWhatsApp } from "@/lib/whatsapp";
import { buildAutoReply } from "@/lib/whatsapp/auto-reply";
import { createCatalogOrder } from "@/lib/whatsapp/catalog";
import { applyDeliveryStatus, logWhatsAppMessage } from "@/lib/whatsapp/log";
import { handleOrderConfirm } from "@/lib/whatsapp/order";
import { BUTTON_COMMANDS } from "@/lib/whatsapp-menu";
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
    button_reply?: { id?: string; title?: string };
    list_reply?: { id?: string; title?: string };
  };
  /** Customer ordered straight from our shared catalog (Meta `order` message). */
  order?: {
    catalog_id?: string;
    text?: string;
    product_items?: {
      product_retailer_id: string;
      quantity: number;
      item_price: number;
      currency?: string;
    }[];
  };
}

/** Delivery / read receipt Meta sends back for an outbound message. */
interface MetaStatus {
  id?: string;
  status?: string;
  errors?: { code?: number; title?: string; message?: string }[];
}

interface MetaWebhook {
  entry?: {
    changes?: {
      value?: {
        messages?: MetaMessage[];
        statuses?: MetaStatus[];
      };
    }[];
  }[];
}

/** Meta status callback → our log status. Anything else is ignored. */
const STATUS_MAP: Record<string, "sent" | "delivered" | "read" | "failed"> = {
  sent: "sent",
  delivered: "delivered",
  read: "read",
  failed: "failed",
};

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

/**
 * Quick-reply buttons carry a stable id, which is far more reliable than
 * matching the (localised, truncated) title. Map it back to the canonical
 * `1` / `2` / `3` command so the handler is shared with typed input.
 */
function resolveCommand(message: MetaMessage): string | null {
  const id =
    message.interactive?.button_reply?.id ?? message.interactive?.list_reply?.id ?? null;
  if (!id) return null;
  return BUTTON_COMMANDS[id] ?? null;
}

/** `VERIFY-123456` (also accepts spaces/dashes) — proof of phone ownership. */
function extractVerificationCode(text: string): string | null {
  const match = text.trim().match(/^verify[\s\-_:]*(\d{6})$/i);
  return match ? match[1] : null;
}

async function processStatuses(statuses: MetaStatus[]): Promise<void> {
  for (const status of statuses) {
    const mapped = status.status ? STATUS_MAP[status.status] : undefined;
    if (!status.id || !mapped) continue;

    const err = status.errors?.[0];
    const detail = err
      ? `${err.code ?? ""} ${err.message ?? err.title ?? "Meta error"}`.trim()
      : undefined;

    await applyDeliveryStatus(status.id, mapped, detail);
  }
}

async function processMessages(messages: MetaMessage[]): Promise<void> {
  for (const message of messages) {
    const from = message.from;
    if (!from || alreadyProcessed(message.id)) continue;

    // Catalog checkout: the customer tapped "order" inside our shared catalog.
    if (message.type === "order" && message.order) {
      if (message.id) await markMessageRead(message.id);
      try {
        const result = await createCatalogOrder(from, message.order, message.id);
        if (!result.ok) console.warn("[whatsapp webhook] catalog order failed:", result.detail);
      } catch (e) {
        console.error("[whatsapp webhook] catalog order error:", e);
      }
      continue;
    }

    // Order confirm/cancel buttons from a WhatsApp order prompt (`oc:…` ids
    // are not menu commands, so they are handled before resolveCommand).
    const buttonId =
      message.interactive?.button_reply?.id ?? message.interactive?.list_reply?.id ?? null;
    if (buttonId?.startsWith("oc:")) {
      if (message.id) await markMessageRead(message.id);
      try {
        const reply = await handleOrderConfirm({
          id: buttonId,
          from,
          metaMessageId: message.id,
        });
        if (reply) {
          const result = await sendAutoReply(from, reply);
          await logWhatsAppMessage({
            type: "order_confirm",
            to: from,
            status: result.ok ? "sent" : "failed",
            detail: result.detail,
            metaMessageId: result.messageId,
          });
        }
      } catch (e) {
        console.error("[whatsapp webhook] order confirm error:", e);
      }
      continue;
    }

    const text = resolveCommand(message) ?? extractText(message);
    if (!text) continue;

    // Blue ticks — the customer sees the message as read immediately.
    if (message.id) await markMessageRead(message.id);

    const code = extractVerificationCode(text);
    if (code) {
      const result = await verifyPhoneCode(from, code);
      const reply = result.ok
        ? "ফোন নম্বর যাচাই সম্পন্ন হয়েছে। এখন ওয়েবসাইটে ফিরে গিয়ে “যাচাই হয়েছে” বাটনে চাপ দিন।"
        : `${result.reason ?? "কোডটি মেলেনি বা মেয়াদ শেষ।"} ওয়েবসাইট থেকে নতুন কোড নিন।`;

      const sent = await sendWhatsApp(from, reply);
      await logWhatsAppMessage({
        type: "otp_verification",
        to: from,
        status: sent.ok ? "sent" : "failed",
        detail: sent.detail,
        metaMessageId: sent.messageId,
      });
      continue;
    }

    const reply = await buildAutoReply({ text, from });
    const result = await sendAutoReply(from, reply);
    await logWhatsAppMessage({
      type: "auto_reply",
      to: from,
      status: result.ok ? "sent" : "failed",
      detail: result.detail,
      metaMessageId: result.messageId,
    });
  }
}

async function processPayload(payload: MetaWebhook): Promise<void> {
  for (const entry of payload.entry ?? []) {
    for (const change of entry.changes ?? []) {
      const value = change.value;
      if (!value) continue;

      // Delivery/read receipts for messages we sent.
      if (value.statuses?.length) await processStatuses(value.statuses);
      // New inbound messages from customers.
      if (value.messages?.length) await processMessages(value.messages);
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
