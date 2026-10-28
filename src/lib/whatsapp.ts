import {
  ORDER_STATUS_META,
  SITE,
  WHATSAPP,
  WHATSAPP_TEMPLATES,
} from "./constants";
import type { OrderStatus } from "./types";
import { formatBDT, orderStatusMessage, toE164 } from "./utils";
import { logWhatsAppMessage } from "./whatsapp/log";

const GRAPH = "https://graph.facebook.com/v26.0";
const REQUEST_TIMEOUT_MS = 10_000;

export { toE164 };

export interface WsResult {
  ok: boolean;
  mode: "cloud_api" | "template" | "link_only" | "disabled";
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
  });
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
export async function notifyOrderConfirmation(input: {
  phone: string;
  customerName: string;
  orderNo: string;
  total: number;
  orderId?: string;
}): Promise<WsResult> {
  const fallback = `${SITE.name}: ধন্যবাদ ${input.customerName}! আপনার অর্ডার ${input.orderNo} গ্রহণ করা হয়েছে। মোট ${formatBDT(input.total)}।`;
  const result = await sendWithFallback(
    input.phone,
    WHATSAPP_TEMPLATES.orderConfirmation,
    [input.customerName, input.orderNo, formatBDT(input.total)],
    fallback,
  );
  await logResult("order_confirmation", input.phone, result, {
    orderId: input.orderId,
    templateName: WHATSAPP.templatesEnabled ? WHATSAPP_TEMPLATES.orderConfirmation : undefined,
  });
  return result;
}

/** Notify a customer about an order status change. */
export async function notifyOrderStatus(input: {
  phone: string;
  orderNo: string;
  status: string;
  storeName?: string;
  orderId?: string;
}): Promise<WsResult> {
  const statusBn = ORDER_STATUS_META[input.status as OrderStatus]?.bn ?? input.status;
  const fallback = orderStatusMessage(
    input.orderNo,
    input.status,
    input.storeName ?? SITE.name,
  );
  const result = await sendWithFallback(
    input.phone,
    WHATSAPP_TEMPLATES.orderStatusUpdate,
    [input.orderNo, statusBn, `${SITE.url}/track`],
    fallback,
  );
  await logResult("order_status_update", input.phone, result, {
    orderId: input.orderId,
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
