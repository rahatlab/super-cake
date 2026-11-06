import {
  ORDER_STATUS_META,
  SITE,
  WHATSAPP,
  WHATSAPP_TEMPLATES,
} from "./constants";
import type { Order, OrderStatus } from "./types";
import { formatBDT, formatDate, orderStatusHeadline, toE164 } from "./utils";
import { clampReplyButtons, type WsButton } from "./whatsapp-menu";
import { logWhatsAppMessage } from "./whatsapp/log";

const GRAPH = "https://graph.facebook.com/v26.0";
const REQUEST_TIMEOUT_MS = 10_000;

export { toE164 };
export type { WsButton };

export interface WsResult {
  ok: boolean;
  mode: "cloud_api" | "template" | "interactive" | "link_only" | "disabled";
  detail?: string;
  messageId?: string;
  template?: string;
}

function disabledReason(): string {
  if (!WHATSAPP.automationEnabled) return "WhatsApp automation disabled";
  return "WhatsApp Cloud API not configured";
}

function canSend(): boolean {
  return Boolean(WHATSAPP.automationEnabled && WHATSAPP.token && WHATSAPP.phoneId);
}

async function postMessage(payload: Record<string, unknown>): Promise<WsResult> {
  try {
    const res = await fetch(`${GRAPH}/${WHATSAPP.phoneId}/messages`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${WHATSAPP.token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
      cache: "no-store",
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    });

    const text = await res.text();
    if (!res.ok) {
      return { ok: false, mode: "cloud_api", detail: text.slice(0, 800) };
    }

    let messageId: string | undefined;
    try {
      const json = JSON.parse(text) as { messages?: { id?: string }[] };
      messageId = json.messages?.[0]?.id;
    } catch {
      // Meta returned 200 but not JSON — still treat it as sent.
    }
    return { ok: true, mode: "cloud_api", messageId };
  } catch (e) {
    return { ok: false, mode: "cloud_api", detail: (e as Error).message };
  }
}

/**
 * Send a free-form WhatsApp text through the Meta Cloud API.
 *
 * Free-form text only delivers inside the 24h customer-service window or to
 * numbers added as test recipients. Use `sendTemplate` for business-initiated
 * messages outside that window.
 */
export async function sendWhatsApp(to: string, body: string): Promise<WsResult> {
  if (!canSend()) return { ok: false, mode: "disabled", detail: disabledReason() };

  return postMessage({
    messaging_product: "whatsapp",
    to: toE164(to),
    type: "text",
    text: { preview_url: false, body },
  });
}

/**
 * Mark an inbound message as read so the customer sees the blue ticks.
 * Best-effort: a failure here must never delay the actual reply.
 */
export async function markMessageRead(messageId: string): Promise<void> {
  if (!canSend() || !messageId) return;
  try {
    await fetch(`${GRAPH}/${WHATSAPP.phoneId}/messages`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${WHATSAPP.token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        messaging_product: "whatsapp",
        status: "read",
        message_id: messageId,
      }),
      cache: "no-store",
      signal: AbortSignal.timeout(5_000),
    });
  } catch {
    // Read receipts are cosmetic — ignore.
  }
}

/**
 * Send an interactive quick-reply button message.
 *
 * Only valid inside the 24-hour customer-service window, which is exactly
 * where auto-replies run (they are always a response to an inbound message).
 * Meta allows at most 3 buttons with a 20-character title each, so anything
 * longer is truncated rather than rejected by the API.
 */
export async function sendInteractiveButtons(
  to: string,
  body: string,
  buttons: WsButton[],
): Promise<WsResult> {
  if (!canSend()) return { ok: false, mode: "disabled", detail: disabledReason() };
  if (!buttons.length) return sendWhatsApp(to, body);

  const trimmed = clampReplyButtons(buttons).map((b) => ({
    type: "reply",
    reply: { id: b.id, title: b.title },
  }));

  return postMessage({
    messaging_product: "whatsapp",
    to: toE164(to),
    type: "interactive",
    interactive: {
      type: "button",
      body: { text: body.slice(0, 1024) },
      action: { buttons: trimmed },
    },
  });
}

/**
 * Send an auto-reply, preferring interactive quick-reply buttons and falling
 * back to the plain numbered text if Meta rejects the interactive payload
 * (out of window, template-only account, etc.).
 */
export async function sendAutoReply(
  to: string,
  reply: { text: string; fallbackText?: string; buttons?: WsButton[] },
): Promise<WsResult> {
  if (reply.buttons?.length) {
    const interactive = await sendInteractiveButtons(to, reply.text, reply.buttons);
    if (interactive.ok) return interactive;
    return sendWhatsApp(to, reply.fallbackText ?? reply.text);
  }
  return sendWhatsApp(to, reply.text);
}

/** Send a Meta-approved message template with body parameters. */
export async function sendTemplate(
  to: string,
  name: string,
  params: (string | number)[],
  language = WHATSAPP.templateLang,
): Promise<WsResult> {
  if (!canSend()) return { ok: false, mode: "disabled", detail: disabledReason() };

  const result = await postMessage({
    messaging_product: "whatsapp",
    to: toE164(to),
    type: "template",
    template: {
      name,
      language: { code: language },
      components: params.length
        ? [
            {
              type: "body",
              parameters: params.map((p) => ({ type: "text", text: String(p) })),
            },
          ]
        : [],
    },
  });

  return { ...result, mode: result.ok ? "template" : result.mode, template: name };
}

/**
 * Try the approved template first (when enabled), then fall back to free-form
 * text. The fallback keeps local/demo mode working before templates exist.
 */
async function sendWithFallback(
  to: string,
  templateName: string,
  params: (string | number)[],
  fallbackText: string,
): Promise<WsResult> {
  if (WHATSAPP.templatesEnabled) {
    const template = await sendTemplate(to, templateName, params);
    if (template.ok) return template;

    const fallback = await sendWhatsApp(to, fallbackText);
    return {
      ...fallback,
      detail: fallback.ok
        ? `template failed: ${template.detail}`
        : `${template.detail} | fallback: ${fallback.detail}`,
    };
  }

  return sendWhatsApp(to, fallbackText);
}

async function logResult(
  type: string,
  to: string,
  result: WsResult,
  opts: { orderId?: string; cartId?: string; templateName?: string } = {},
): Promise<void> {
  await logWhatsAppMessage({
    type,
    to,
    status: result.ok ? "sent" : "failed",
    detail: result.detail,
    templateName: result.template ?? opts.templateName,
    orderId: opts.orderId,
    cartId: opts.cartId,
    metaMessageId: result.messageId,
  });
}

/* ---------------- rich, structured order messages ---------------- */

const PAYMENT_BN: Record<string, string> = {
  paid: "পরিশোধিত",
  pending_verify: "যাচাই বাকি",
  unpaid: "বাকি",
  refunded: "ফেরত দেওয়া হয়েছে",
};

const PAYMENT_METHOD_BN: Record<string, string> = {
  cod: "ক্যাশ অন ডেলিভারি",
  bkash: "bKash",
};

const SLOT_BN: Record<string, string> = {
  morning: "সকাল (৯টা–১২টা)",
  afternoon: "দুপুর (১২টা–৪টা)",
  evening: "বিকাল (৪টা–৮টা)",
  night: "রাত (৮টা–১০টা)",
};

/** One `• Item ×2 (1 lb)` line per cart line, capped so the message stays short. */
function itemLines(order: Order, max = 6): string[] {
  const lines = order.items.slice(0, max).map((i) => {
    const weight = i.weight ? ` (${i.weight} lb)` : "";
    return `• ${i.name} ×${i.quantity}${weight}`;
  });
  const extra = order.items.length - max;
  if (extra > 0) lines.push(`… আরও ${extra} টি`);
  return lines;
}

/**
 * A structured order summary using WhatsApp's native `*bold*` markup.
 * Free-form WhatsApp text is used here because it always works inside the
 * 24h window; the approved template carries only the three parameters Meta
 * requires.
 *
 * `status` is passed explicitly because callers notify from a stale copy of
 * the order (read before the update), so `order.order_status` can be the
 * previous state.
 */
function orderSummary(
  order: Order,
  storeName: string,
  headline: string,
  status: OrderStatus = order.order_status,
): string {
  const statusBn = ORDER_STATUS_META[status]?.bn ?? status;
  const delivery = [
    order.delivery_date,
    order.delivery_slot ? SLOT_BN[order.delivery_slot] ?? order.delivery_slot : null,
  ]
    .filter(Boolean)
    .join(" · ");

  return [
    `*${storeName}*`,
    "",
    headline,
    "",
    `*অর্ডার:* ${order.order_no}`,
    `*স্ট্যাটাস:* ${statusBn}`,
    "",
    "*আইটেম:*",
    ...itemLines(order).map((l) => `   ${l}`),
    "",
    `*ডেলিভারি:* ${delivery}`,
    `*পেমেন্ট:* ${PAYMENT_BN[order.payment_status] ?? order.payment_status} · ${
      PAYMENT_METHOD_BN[order.payment_method] ?? order.payment_method
    }`,
    `*মোট:* ${formatBDT(order.total)}`,
    "",
    `*ট্র্যাক করুন:* ${SITE.url}/track`,
  ].join("\n");
}

/** Notify the shop owner about a new order. */
export async function notifyAdminNewOrder(
  adminPhone: string,
  orderNo: string,
  total: number,
  orderId?: string,
): Promise<WsResult> {
  const fallback = `${SITE.name}: নতুন অর্ডার এসেছে ${orderNo} — মোট ${formatBDT(total)}। ড্যাশবোর্ড থেকে দেখুন।`;
  const result = await sendWithFallback(
    adminPhone,
    WHATSAPP_TEMPLATES.newOrderAdmin,
    [orderNo, formatBDT(total), `${SITE.url}/admin/orders`],
    fallback,
  );
  await logResult("new_order_admin", adminPhone, result, {
    orderId,
    templateName: WHATSAPP.templatesEnabled ? WHATSAPP_TEMPLATES.newOrderAdmin : undefined,
  });
  return result;
}

/** Confirm a newly placed order to the customer. */
export async function notifyOrderConfirmation(input: { order: Order }): Promise<WsResult> {
  const { order } = input;
  const fallback = orderSummary(
    order,
    SITE.name,
    `ধন্যবাদ ${order.customer_name}! আপনার অর্ডার গ্রহণ করা হয়েছে।`,
  );
  const result = await sendWithFallback(
    order.phone,
    WHATSAPP_TEMPLATES.orderConfirmation,
    [order.customer_name, order.order_no, formatBDT(order.total)],
    fallback,
  );
  await logResult("order_confirmation", order.phone, result, {
    orderId: order.id,
    templateName: WHATSAPP.templatesEnabled ? WHATSAPP_TEMPLATES.orderConfirmation : undefined,
  });
  return result;
}

/** Notify a customer about an order status change. */
export async function notifyOrderStatus(input: {
  order: Order;
  status: OrderStatus;
  storeName?: string;
}): Promise<WsResult> {
  const { order, status } = input;
  const storeName = input.storeName ?? SITE.name;
  const statusBn = ORDER_STATUS_META[status]?.bn ?? status;
  const fallback = orderSummary(order, storeName, orderStatusHeadline(order.order_no, status), status);
  const result = await sendWithFallback(
    order.phone,
    WHATSAPP_TEMPLATES.orderStatusUpdate,
    [order.order_no, statusBn, `${SITE.url}/track`],
    fallback,
  );
  await logResult("order_status_update", order.phone, result, {
    orderId: order.id,
    templateName: WHATSAPP.templatesEnabled ? WHATSAPP_TEMPLATES.orderStatusUpdate : undefined,
  });
  return result;
}

/** Ask a customer for a review after delivery/completion. */
export async function notifyReviewRequest(input: {
  phone: string;
  customerName: string;
  orderNo: string;
  orderId: string;
}): Promise<WsResult> {
  const reviewUrl = `${SITE.url}/review/${input.orderId}`;
  const fallback = `${SITE.name}: ধন্যবাদ ${input.customerName}! আপনার অর্ডার ${input.orderNo} সম্পন্ন হয়েছে। আপনার অভিজ্ঞতা জানান — রিভিউ দিন: ${reviewUrl}`;
  const result = await sendWithFallback(
    input.phone,
    WHATSAPP_TEMPLATES.orderReviewRequest,
    [input.customerName, input.orderNo, reviewUrl],
    fallback,
  );
  await logResult("order_review_request", input.phone, result, {
    orderId: input.orderId,
    templateName: WHATSAPP.templatesEnabled ? WHATSAPP_TEMPLATES.orderReviewRequest : undefined,
  });
  return result;
}

/** Remind a customer about an abandoned cart (marketing — opt-in only). */
export async function notifyAbandonedCart(input: {
  phone: string;
  itemName: string;
  cartId?: string;
}): Promise<WsResult> {
  const cartUrl = `${SITE.url}/order`;
  const fallback = `${SITE.name}: আপনার কার্টে ${input.itemName} অপেক্ষা করছে। অর্ডার সম্পন্ন করুন: ${cartUrl}`;
  const result = await sendWithFallback(
    input.phone,
    WHATSAPP_TEMPLATES.abandonedCart,
    [input.itemName, cartUrl],
    fallback,
  );
  await logResult("abandoned_cart", input.phone, result, {
    cartId: input.cartId,
    templateName: WHATSAPP.templatesEnabled ? WHATSAPP_TEMPLATES.abandonedCart : undefined,
  });
  return result;
}

/**
 * Birthday / anniversary greeting with a personal promo code (sent by the
 * daily cron — outside any 24h window, so an approved template is required;
 * the free-form fallback still works in demo mode where the window is open).
 */
export async function notifyWish(input: {
  phone: string;
  name: string;
  kind: "birthday" | "anniversary";
  code: string;
  percent: number;
  maxDiscount: number;
  expiresAt: string;
}): Promise<WsResult> {
  const templateName =
    input.kind === "birthday"
      ? WHATSAPP_TEMPLATES.birthdayWish
      : WHATSAPP_TEMPLATES.anniversaryWish;
  const headline =
    input.kind === "birthday" ? "জন্মদিনের শুভেচ্ছা" : "বার্ষিকীর শুভেচ্ছা";
  const storeUrl = `${SITE.url}/cakes`;

  const fallback = [
    `*${SITE.name}*`,
    "",
    `*${headline}, ${input.name}!*`,
    input.kind === "birthday"
      ? "আপনার বিশেষ দিনে আমরা আন্তরিক শুভেচ্ছা জানাচ্ছি — ভালো থাকুন, আরও অনেক কেক কেটে উদ্‌যাপন করুন!"
      : "আপনার বিশেষ দিনে আমরা আন্তরিক শুভেচ্ছা জানাচ্ছি — এই উপলক্ষে একটি বিশেষ উপহার আপনার জন্য!",
    "",
    `*প্রোমো কোড:* ${input.code}`,
    `*ছাড়:* ${input.percent}% (সর্বোচ্চ ৳${input.maxDiscount})`,
    `*মেয়াদ:* ${formatDate(input.expiresAt)} পর্যন্ত`,
    "",
    `*এখনই অর্ডার করুন:* ${storeUrl}`,
  ].join("\n");

  const result = await sendWithFallback(
    input.phone,
    templateName,
    [input.name, input.code, `${input.percent}%`, formatDate(input.expiresAt)],
    fallback,
  );
  await logResult(`${input.kind}_wish`, input.phone, result, {
    templateName: WHATSAPP.templatesEnabled ? templateName : undefined,
  });
  return result;
}
