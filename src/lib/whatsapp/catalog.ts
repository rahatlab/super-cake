import { MIN_DELIVERY_LEAD_DAYS, SITE, WHATSAPP } from "@/lib/constants";
import { getStore } from "@/lib/store";
import { getCachedSettings } from "@/lib/store/cache";
import { dhakaDatePlus } from "@/lib/utils";
import type { Cake, Order, OrderItem } from "@/lib/types";
import {
  notifyAdminNewOrder,
  notifyOrderConfirmation,
  sendWhatsApp,
} from "@/lib/whatsapp";
import { logWhatsAppMessage } from "./log";
import { saveOrderDraft } from "./draft";
import { catalogPrice, normalizeUnitPrice } from "./catalog-core";

export { catalogPrice, normalizeUnitPrice };

const GRAPH = "https://graph.facebook.com/v26.0";
const REQUEST_TIMEOUT_MS = 15_000;
/** Small concurrency — Meta throttles a burst of product upserts. */
const CONCURRENCY = 4;

export interface CatalogSyncResult {
  ok: boolean;
  configured: boolean;
  pushed: number;
  failed: number;
  skipped: number;
  detail?: string;
}

/** One line of Meta's incoming `order` webhook payload. */
export interface CatalogOrderItem {
  product_retailer_id: string;
  quantity: number;
  item_price: number;
  currency?: string;
}

export interface CatalogOrderMessage {
  catalog_id?: string;
  text?: string;
  product_items?: CatalogOrderItem[];
}

function configured(): boolean {
  return Boolean(WHATSAPP.token && WHATSAPP.catalogId);
}

/** Absolute URL for an image stored as a site-relative path. */
function absoluteUrl(value: string): string {
  if (!value) return "";
  if (/^https?:\/\//i.test(value)) return value;
  return new URL(value, SITE.url).toString();
}

/** The price a customer sees first — cheapest available size. */
function referencePrice(cake: Cake): number {
  const available = (cake.sizes ?? [])
    .filter((s) => s.is_available && s.price > 0)
    .map((s) => s.price);
  return available.length ? Math.min(...available) : cake.base_price;
}

function productPayload(cake: Cake): Record<string, unknown> {
  const image = absoluteUrl(cake.image_urls?.[0] ?? "");
  return {
    // Stable identity: the slug is exactly what comes back in an order webhook.
    retailer_id: cake.slug,
    name: cake.name,
    description: cake.description || `${cake.name} — ${SITE.name}`,
    price: catalogPrice(referencePrice(cake)),
    currency: WHATSAPP.catalogCurrency,
    image_url: image,
    url: `${SITE.url}/cakes/${cake.slug}`,
    availability: cake.is_active ? "in stock" : "out of stock",
    condition: "new",
    category: WHATSAPP.catalogCategory,
    product_type: cake.category || "Cake",
    visibility: cake.is_active ? "published" : "staging",
    allow_upsert: true,
  };
}

async function graphPost(
  path: string,
  body: Record<string, unknown>,
): Promise<{ ok: boolean; detail: string; id?: string }> {
  try {
    const res = await fetch(`${GRAPH}${path}`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${WHATSAPP.token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
      cache: "no-store",
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    });
    const text = await res.text();
    if (!res.ok) return { ok: false, detail: text.slice(0, 500) };
    try {
      const json = JSON.parse(text) as { id?: string; success?: boolean };
      // Meta answers `{"success":true}` for product upserts, `{"id":...}` for
      // creation — accept either, but never a silent failure.
      if (json.success === false) return { ok: false, detail: text.slice(0, 500) };
      return { ok: true, detail: "ok", id: json.id };
    } catch {
      return { ok: true, detail: "ok (non-json)" };
    }
  } catch (e) {
    return { ok: false, detail: (e as Error).message };
  }
}

/**
 * Push every cake into the Meta catalog connected to this WhatsApp number, so
 * customers can order straight from the shared catalog in a chat.
 *
 * `retailer_id` is the cake slug — that is the join key used when Meta sends
 * an `order` webhook back.
 */
export async function syncCakesToCatalog(): Promise<CatalogSyncResult> {
  if (!configured()) {
    return {
      ok: false,
      configured: false,
      pushed: 0,
      failed: 0,
      skipped: 0,
      detail: "WHATSAPP_TOKEN / WHATSAPP_CATALOG_ID সেট করা নেই",
    };
  }

  const store = getStore();
  let cakes: Cake[];
  try {
    cakes = await store.listCakes({ includeInactive: true });
  } catch (e) {
    return {
      ok: false,
      configured: true,
      pushed: 0,
      failed: 0,
      skipped: 0,
      detail: (e as Error).message,
    };
  }

  const eligible = cakes.filter((c) => c.slug && (c.image_urls?.length ?? 0) > 0);
  const skipped = cakes.length - eligible.length;

  let pushed = 0;
  let failed = 0;
  const failures: string[] = [];

  for (let i = 0; i < eligible.length; i += CONCURRENCY) {
    const chunk = eligible.slice(i, i + CONCURRENCY);
    const results = await Promise.all(
      chunk.map(async (cake) => {
        const res = await graphPost(`/${WHATSAPP.catalogId}/products`, productPayload(cake));
        return { cake, res };
      }),
    );
    for (const { cake, res } of results) {
      if (res.ok) pushed += 1;
      else {
        failed += 1;
        if (failures.length < 3) failures.push(`${cake.name}: ${res.detail}`);
      }
    }
  }

  const detail = failures.length ? failures.join(" | ") : undefined;
  if (failed) console.warn("[catalog] sync failures:", detail);
  return { ok: failed === 0, configured: true, pushed, failed, skipped, detail };
}

/* ---------------- incoming catalog orders ---------------- */

function weightForPrice(cake: Cake, unitPrice: number): number | undefined {
  return (cake.sizes ?? []).find((s) => s.price === unitPrice)?.weight;
}

export interface CatalogOrderResult {
  ok: boolean;
  orderNo?: string;
  orderId?: string;
  detail?: string;
}

/**
 * Turn a Meta `type: "order"` webhook into a real pending store order.
 *
 * The catalog carries no address or delivery date, so the order is created as
 * `pending` with a placeholder address; the customer is asked for both over
 * WhatsApp (inside the window they just opened) and the admin is notified.
 * Stock is reserved best-effort — the admin confirms on the follow-up call.
 */
export async function createCatalogOrder(
  from: string,
  message: CatalogOrderMessage,
  metaMessageId?: string,
): Promise<CatalogOrderResult> {
  const items = message.product_items ?? [];
  if (!items.length) return { ok: false, detail: "no product_items" };

  const store = getStore();
  const settings = await getCachedSettings();

  const orderItems: OrderItem[] = [];
  for (const line of items) {
    const cake = line.product_retailer_id ? await store.getCakeBySlug(line.product_retailer_id) : null;
    if (!cake) {
      console.warn("[catalog] unknown retailer_id:", line.product_retailer_id);
      continue;
    }
    const unitPrice = normalizeUnitPrice(line.item_price, referencePrice(cake));
    const quantity = Math.min(20, Math.max(1, Math.round(line.quantity || 1)));
    orderItems.push({
      cake_id: cake.id,
      name: cake.name,
      slug: cake.slug,
      image: cake.image_urls?.[0],
      weight: weightForPrice(cake, unitPrice),
      unit_price: unitPrice,
      quantity,
    });
  }

  if (!orderItems.length) return { ok: false, detail: "no matching cakes" };

  const subtotal = orderItems.reduce((sum, i) => sum + i.unit_price * i.quantity, 0);
  const deliveryCharge =
    settings.free_delivery_enabled && subtotal >= settings.free_delivery_min
      ? 0
      : settings.delivery_charge;

  const firstCake = await store.getCakeById(orderItems[0].cake_id);
  const occasion = firstCake?.occasions?.[0] ?? "others";

  const reservation = await store.reserveStock(
    orderItems.map((i) => ({ cake_id: i.cake_id, quantity: i.quantity })),
  );
  if (!reservation.ok) console.warn("[catalog] stock reserve failed:", reservation.reason);

  let order: Order;
  try {
    order = await store.createOrder({
      customer_name: "WhatsApp ক্যাটালগ ক্রেতা",
      phone: from,
      occasion,
      items: orderItems,
      address: "ঠিকানা নিতে হবে — WhatsApp-এ জানান",
      delivery_date: dhakaDatePlus(MIN_DELIVERY_LEAD_DAYS),
      subtotal,
      discount_amount: 0,
      referral_discount: 0,
      delivery_charge: deliveryCharge,
      total: subtotal + deliveryCharge,
      payment_method: "cod",
      note: `Meta catalog order${message.text ? `: ${message.text.slice(0, 120)}` : ""}`,
      // Meta retries the webhook; the key makes the retry a no-op.
      idempotency_key: metaMessageId ? `wa-catalog:${metaMessageId}` : undefined,
    });
  } catch (e) {
    if (reservation.ok) {
      await store.releaseStock(
        orderItems.map((i) => ({ cake_id: i.cake_id, quantity: i.quantity })),
      );
    }
    return { ok: false, detail: (e as Error).message };
  }

  await logWhatsAppMessage({
    type: "catalog_order",
    to: from,
    status: "sent",
    detail: `${order.order_no} · ${orderItems.length} item(s)`,
    orderId: order.id,
    metaMessageId,
  });

  // Open a stepwise draft linked to this order — the customer's next replies
  // (name, phone, address, date) update the order instead of asking the admin.
  if (firstCake) {
    await saveOrderDraft(from, {
      cakeId: firstCake.id,
      quantity: orderItems.reduce((s, i) => s + i.quantity, 0),
      occasion,
      deliveryDate: dhakaDatePlus(MIN_DELIVERY_LEAD_DAYS),
      catalogOrderId: order.id,
      updatedAt: new Date().toISOString(),
    }).catch(() => undefined);
  }

  // The customer opened the 24h window — ask for what the catalog cannot ask.
  const reply = [
    `*${settings.store_name} — অর্ডার গৃহীত হয়েছে*`,
    "",
    ...orderItems.map((i) => `• ${i.name} ×${i.quantity}`),
    "",
    `*অর্ডার:* ${order.order_no}`,
    `*মোট:* ৳${order.total.toLocaleString("en-US")}`,
    "",
    "অর্ডারটি কনফার্ম করতে একটা একটা করে জানান:",
    "১. আপনার নাম",
    "২. ফোন নম্বর",
    "৩. ডেলিভারি ঠিকানা",
    "৪. তারিখ ও সময়",
  ].join("\n");
  const sent = await sendWhatsApp(from, reply);

  await Promise.allSettled([
    notifyAdminNewOrder(settings.whatsapp_phone, order.order_no, order.total, order.id),
    notifyOrderConfirmation({ order }),
  ]);

  return {
    ok: true,
    orderNo: order.order_no,
    orderId: order.id,
    detail: sent.detail,
  };
}
