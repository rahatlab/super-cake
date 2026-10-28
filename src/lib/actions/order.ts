"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { after } from "next/server";
import { getStore } from "@/lib/store";
import { getCurrentUser, createOrderAccessToken, createCartLeadToken, verifyReviewAccessToken } from "@/lib/auth";
import { rateLimit, clientIp } from "@/lib/rate-limit";
import { checkoutSchema, reviewSchema, trackSchema } from "@/lib/validators";
import { buildBreakdown, evaluatePromo, evaluateReferral, referralDiscount } from "@/lib/pricing";
import type { Order, Review } from "@/lib/types";
import { notifyAdminNewOrder, notifyOrderConfirmation } from "@/lib/whatsapp";
import { markCartConverted } from "@/lib/whatsapp/cart";
import type { StockLine } from "@/lib/store/store-interface";

export interface PlaceOrderState {
  error?: string;
  field?: string;
  orderNo?: string;
}

function parseJson<T>(raw: FormDataEntryValue | null, fallback: T): T {
  if (typeof raw !== "string" || !raw.trim()) return fallback;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

function normalizeIdempotencyKey(raw: FormDataEntryValue | null): string | null {
  const value = String(raw ?? "").trim();
  if (!value) return null;
  if (!/^[A-Za-z0-9_-]{8,80}$/.test(value)) return null;
  return value;
}

async function rollbackOrder(order: Order, stockLines: StockLine[]) {
  const store = getStore();
  try {
    await store.releaseStock(stockLines);
    if (order.promo_code) await store.releasePromo(order.id);
    if (order.referral_code) await store.releaseReferral(order.id);
    const payments = await store.listPayments();
    const payment = payments.find((p) => p.order_id === order.id && p.status === "pending_verify");
    if (payment) await store.updatePayment(payment.id, { status: "unpaid" });
    await store.updateOrder(order.id, {
      order_status: "cancelled",
      payment_status: "unpaid",
      idempotency_key: null,
    });
  } catch (e) {
    console.error("[order] rollback failed", (e as Error).message);
  }
}

/**
 * Creates an order.
 *
 * Pricing, stock and promo/referral usage are always validated/recomputed on
 * the server; client totals are treated as untrusted hints only.
 */
export async function placeOrderAction(
  _prev: PlaceOrderState,
  formData: FormData,
): Promise<PlaceOrderState> {
  const ip = clientIp(await headers());
  const limited = rateLimit(`order:${ip}`, 12, 60_000);
  if (!limited.ok) {
    return { error: `অল্প সময় পরে আবার চেষ্টা করুন (${limited.retryAfterSeconds}s)।` };
  }

  const raw = {
    customer_name: String(formData.get("customer_name") ?? "").trim(),
    phone: String(formData.get("phone") ?? "").trim(),
    email: String(formData.get("email") ?? "").trim(),
    occasion: String(formData.get("occasion") ?? "others"),
    items: parseJson<unknown[]>(formData.get("items"), []),
    custom_spec: parseJson<Record<string, unknown> | null>(formData.get("custom_spec"), null),
    address: String(formData.get("address") ?? "").trim(),
    delivery_date: String(formData.get("delivery_date") ?? ""),
    delivery_slot: String(formData.get("delivery_slot") ?? ""),
    promo_code: String(formData.get("promo_code") ?? "").trim() || null,
    referral_code: String(formData.get("referral_code") ?? "").trim().toUpperCase() || null,
    payment_method: String(formData.get("payment_method") ?? "cod"),
    bkash_trx_id: String(formData.get("bkash_trx_id") ?? "").trim().toUpperCase() || null,
    note: String(formData.get("note") ?? "").trim() || undefined,
    // provisional client totals — replaced by the server-computed values
    subtotal: 0,
    discount_amount: 0,
    referral_discount: 0,
    delivery_charge: 0,
    total: 0,
  };

  const parsed = checkoutSchema.safeParse(raw);
  if (!parsed.success) {
    const issue = parsed.error.issues[0];
    return { error: issue.message, field: String(issue.path[0] ?? "") };
  }

  const input = parsed.data;
  const store = getStore();
  const settings = await store.getSettings();

  if (input.payment_method === "cod" && !settings.cod_enabled) {
    return { error: "Cash on Delivery এখন বন্ধ আছে।", field: "payment_method" };
  }
  if (input.payment_method === "bkash" && !settings.bkash_enabled) {
    return { error: "bKash পেমেন্ট এখন বন্ধ আছে।", field: "payment_method" };
  }

  const idempotencyKey = normalizeIdempotencyKey(formData.get("idempotency_key"));
  if (idempotencyKey) {
    const existing = await store.findOrderByIdempotencyKey(idempotencyKey);
    if (existing) {
      redirect(
        `/order/success?${new URLSearchParams({
          no: existing.order_no,
          token: createOrderAccessToken(existing.id),
        }).toString()}`,
      );
    }
  }

  /* ---- re-price every line from the database (never trust the browser) ---- */
  const pricedItems: typeof input.items = [];
  const stockMap = new Map<string, number>();

  for (const item of input.items) {
    const cake = await store.getCakeById(item.cake_id);
    if (!cake || !cake.is_active) {
      return { error: `"${item.name}" এখন পাওয়া যাচ্ছে না।`, field: "items" };
    }
    if (cake.stock <= 0) {
      return { error: `"${cake.name}" এর স্টক শেষ।`, field: "items" };
    }

    const sizeList = cake.sizes ?? [];
    let unitPrice = cake.base_price;

    if (item.weight != null && sizeList.length > 0) {
      const size = sizeList.find((s) => Math.abs(s.weight - item.weight!) < 0.01);
      if (!size || !size.is_available) {
        return {
          error: `${cake.name} — ${item.weight} lb সাইজ এখন পাওয়া যাচ্ছে না।`,
          field: "items",
        };
      }
      unitPrice = size.price;
    }

    if (unitPrice <= 0) {
      return { error: `"${cake.name}" এর দাম ঠিক করা হয়নি।`, field: "items" };
    }

    stockMap.set(cake.id, (stockMap.get(cake.id) ?? 0) + item.quantity);
    for (const [cakeId, qty] of stockMap) {
      if (cakeId === cake.id && qty > cake.stock) {
        return { error: `"${cake.name}" এর স্টক যথেষ্ট নয় (আছে ${cake.stock}টি)।`, field: "items" };
      }
    }

    pricedItems.push({
      ...item,
      name: cake.name,
      slug: cake.slug,
      image: cake.image_urls[0] ?? item.image,
      unit_price: unitPrice,
    });
  }

  /* ---- server-side price recalculation ---- */
  const promo = input.promo_code ? await store.getPromoByCode(input.promo_code) : null;
  const subtotal = pricedItems.reduce((s, i) => s + i.unit_price * i.quantity, 0);
  const promoCheck = evaluatePromo(promo, subtotal);

  if (input.promo_code && !promoCheck.ok) {
    return { error: `Promo code: ${promoCheck.reason}`, field: "promo_code" };
  }

  let referralValid = false;
  if (input.referral_code) {
    const referral = await store.getReferralByCode(input.referral_code);
    const check = evaluateReferral(referral, subtotal);
    if (!check.ok) {
      return { error: `Referral: ${check.reason}`, field: "referral_code" };
    }
    referralValid = true;
  }

  const breakdown = buildBreakdown(pricedItems, {
    promo,
    referralCode: input.referral_code,
    referralValid,
    settings,
    promoResult: promoCheck,
  });

  /* ---- duplicate TrxID check (unique index is the final guard) ---- */
  if (input.payment_method === "bkash" && input.bkash_trx_id) {
    const payments = await store.listPayments();
    const duplicate = payments.some(
      (p) => p.trx_id && p.trx_id.toUpperCase() === input.bkash_trx_id!.toUpperCase(),
    );
    if (duplicate) {
      return { error: "এই bKash TrxID আগে ব্যবহার করা হয়েছে।", field: "bkash_trx_id" };
    }
  }

  const stockLines: StockLine[] = [...stockMap.entries()].map(([cake_id, quantity]) => ({
    cake_id,
    quantity,
  }));
  if (stockLines.length === 0) return { error: "কার্ট খালি", field: "items" };

  const reservation = await store.reserveStock(stockLines);
  if (!reservation.ok) {
    return { error: reservation.reason ?? "স্টক আপডেট করা যায়নি।", field: "items" };
  }

  const user = await getCurrentUser();
  let order: Order;
  try {
    order = await store.createOrder({
      customer_name: input.customer_name,
      phone: input.phone,
      email: input.email || undefined,
      occasion: input.occasion,
      items: pricedItems,
      custom_spec: input.custom_spec,
      address: input.address,
      delivery_date: input.delivery_date,
      delivery_slot: input.delivery_slot,
      subtotal: breakdown.subtotal,
      promo_code: breakdown.promo_code,
      discount_amount: breakdown.discount_amount,
      referral_code: breakdown.referral_code,
      referral_discount: breakdown.referral_discount,
      delivery_charge: breakdown.delivery_charge,
      total: breakdown.total,
      payment_method: input.payment_method,
      bkash_trx_id: input.bkash_trx_id,
      note: input.note,
      user_id: user?.id ?? null,
      idempotency_key: idempotencyKey,
    });
  } catch (e) {
    await store.releaseStock(stockLines);
    return { error: (e as Error).message };
  }

  /* ---- consume promo/referral usage; roll back the whole attempt on race ---- */
  if (order.promo_code) {
    const consumed = await store.consumePromo(order.promo_code, order.id, order.phone);
    if (!consumed.ok) {
      await rollbackOrder(order, stockLines);
      return { error: `Promo code: ${consumed.reason}`, field: "promo_code" };
    }
  }
  if (order.referral_code) {
    const consumed = await store.consumeReferral(order.referral_code, order.id, order.phone);
    if (!consumed.ok) {
      await rollbackOrder(order, stockLines);
      return { error: `Referral: ${consumed.reason}`, field: "referral_code" };
    }
  }

  /* ---- notifications (after response; never block checkout) ---- */
  after(async () => {
    await Promise.allSettled([
      notifyAdminNewOrder(settings.whatsapp_phone, order.order_no, order.total, order.id),
      notifyOrderConfirmation({
        phone: order.phone,
        customerName: order.customer_name,
        orderNo: order.order_no,
        total: order.total,
        orderId: order.id,
      }),
      markCartConverted(order.phone, order.id),
    ]);
  });

  redirect(
    `/order/success?${new URLSearchParams({
      no: order.order_no,
      token: createOrderAccessToken(order.id),
    }).toString()}`,
  );
}

/* ---------------- cart lead token (binds a phone to this browser) ---------------- */

export async function getCartLeadTokenAction(phone: string): Promise<{ token?: string; error?: string }> {
  const ip = clientIp(await headers());
  if (!rateLimit(`cart-token:${ip}`, 20, 60_000).ok) return { error: "অনেকবার চেষ্টা হয়েছে।" };

  const value = String(phone ?? "").trim();
  const digits = value.replace(/\D/g, "");
  if (digits.length < 10 || digits.length > 15) return { error: "সঠিক ফোন নম্বর দিন" };

  const user = await getCurrentUser();
  if (user && user.phone.replace(/\D/g, "").slice(-10) !== digits.slice(-10)) {
    return { error: "লগইন করা অ্যাকাউন্টের ফোন নম্বর ব্যবহার করুন" };
  }

  return { token: createCartLeadToken(value) };
}

/* ---------------- promo validation (client live apply) ---------------- */
export interface PromoCheckState {
  ok: boolean;
  discount: number;
  reason?: string;
}

export async function validatePromoAction(code: string, subtotal: number): Promise<PromoCheckState> {
  const trimmed = String(code ?? "").trim();
  if (!trimmed) return { ok: false, discount: 0, reason: "কোড লিখুন" };

  const store = getStore();
  const promo = await store.getPromoByCode(trimmed);
  const result = evaluatePromo(promo, Math.max(0, Number(subtotal) || 0));
  return { ok: result.ok, discount: result.discount, reason: result.reason };
}

/** Validate a referral code for the live checkout preview. */
export async function validateReferralAction(code: string, subtotal: number): Promise<PromoCheckState> {
  const trimmed = String(code ?? "").trim().toUpperCase();
  if (!trimmed) return { ok: false, discount: 0, reason: "কোড লিখুন" };
  const store = getStore();
  const referral = await store.getReferralByCode(trimmed);
  const result = evaluateReferral(referral, Math.max(0, Number(subtotal) || 0));
  if (!result.ok) return { ok: false, discount: 0, reason: result.reason };
  return { ok: true, discount: referralDiscount(Math.max(0, Number(subtotal) || 0)) };
}

/* ---------------- order tracking ---------------- */

export interface TrackResult {
  order?: Order;
  error?: string;
}

export async function trackOrderAction(
  _prev: TrackResult,
  formData: FormData,
): Promise<TrackResult> {
  const ip = clientIp(await headers());
  if (!rateLimit(`track:${ip}`, 30, 60_000).ok) {
    return { error: "অনেকবার চেষ্টা হয়েছে। কিছুক্ষণ পরে চেষ্টা করুন।" };
  }

  const parsed = trackSchema.safeParse({
    order_no: String(formData.get("order_no") ?? "").trim(),
    phone: String(formData.get("phone") ?? "").trim(),
  });
  if (!parsed.success) return { error: parsed.error.issues[0].message };

  const store = getStore();
  const order = await store.getOrderByNo(parsed.data.order_no);
  if (!order) return { error: "অর্ডার পাওয়া যায়নি। সঠিক অর্ডার আইডি দিন।" };

  const a = order.phone.replace(/\D/g, "").slice(-10);
  const b = parsed.data.phone.replace(/\D/g, "").slice(-10);
  if (a !== b) return { error: "অর্ডার আইডি ও ফোন নম্বর মিলছে না।" };

  return { order };
}

/* ---------------- reviews ---------------- */

export interface ReviewState {
  error?: string;
  success?: boolean;
}

export async function submitReviewAction(
  _prev: ReviewState,
  formData: FormData,
): Promise<ReviewState> {
  const ip = clientIp(await headers());
  if (!rateLimit(`review:${ip}`, 6, 60_000).ok) {
    return { error: "অল্প সময় পরে আবার চেষ্টা করুন।" };
  }

  const parsed = reviewSchema.safeParse({
    order_id: String(formData.get("order_id") ?? ""),
    access_token: String(formData.get("access_token") ?? "") || undefined,
    customer_name: String(formData.get("customer_name") ?? "").trim(),
    rating: Number(formData.get("rating") ?? 0),
    comment: String(formData.get("comment") ?? "").trim(),
  });
  if (!parsed.success) return { error: parsed.error.issues[0].message };

  const store = getStore();
  const order = await store.getOrderById(parsed.data.order_id);
  if (!order) return { error: "অর্ডার পাওয়া যায়নি।" };

  const tokenOrderId = verifyReviewAccessToken(parsed.data.access_token);
  const user = await getCurrentUser();
  const ownsBySession = Boolean(user && order.user_id === user.id);
  if (tokenOrderId !== order.id && !ownsBySession) {
    return { error: "এই অর্ডারে রিভিউ দেওয়ার অনুমতি নেই।" };
  }

  if (!["delivered", "completed"].includes(order.order_status)) {
    return { error: "ডেলিভারি সম্পন্ন হওয়ার পরেই রিভিউ দিতে পারবেন।" };
  }

  const existing: Review | null = await store.getReviewByOrder(order.id);
  if (existing) return { error: "আপনি ইতিমধ্যে এই অর্ডারে রিভিউ দিয়েছেন।" };

  const cakeSlug = order.items[0]?.slug ?? null;
  const cake = cakeSlug ? await store.getCakeBySlug(cakeSlug) : null;
  if (!cake) return { error: "অর্ডারের কেকটি খুঁজে পাওয়া যায়নি।" };

  try {
    await store.createReview({
      order_id: order.id,
      customer_name: parsed.data.customer_name || order.customer_name,
      rating: parsed.data.rating,
      comment: parsed.data.comment,
      cake_slug: cake.slug,
    });
  } catch (e) {
    const message = (e as Error).message;
    if (message.includes("duplicate") || message.includes("unique")) {
      return { error: "আপনি ইতিমধ্যে এই অর্ডারে রিভিউ দিয়েছেন।" };
    }
    return { error: "রিভিউ সেভ করা যায়নি। আবার চেষ্টা করুন।" };
  }

  void store.createNotification({
    type: "review",
    title: "নতুন রিভিউ",
    message: `${parsed.data.customer_name} ${parsed.data.rating} স্টার রিভিউ দিয়েছেন।`,
  }).catch(() => undefined);

  return { success: true };
}
