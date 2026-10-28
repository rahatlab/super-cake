import type { OrderItem, PromoCode, Referral, Settings } from "./types";

export const REFERRAL_PERCENT = 5;
export const REFERRAL_MAX_DISCOUNT = 300;

export interface PriceBreakdown {
  subtotal: number;
  promo_code: string | null;
  discount_amount: number;
  referral_code: string | null;
  referral_discount: number;
  delivery_charge: number;
  total: number;
  /** e.g. ["Promo WELCOME10 saved ৳150", "Free delivery unlocked"] */
  notes: string[];
}

export function sumItems(items: Pick<OrderItem, "unit_price" | "quantity">[]): number {
  return items.reduce((s, i) => s + i.unit_price * i.quantity, 0);
}

export interface PromoResult {
  ok: boolean;
  discount: number;
  reason?: string;
  promo?: PromoCode;
}

/**
 * Promo expiry is a business-day deadline in Dhaka. Date-only values (from the
 * admin date input) stay valid until 23:59:59.999 Asia/Dhaka.
 */
export function promoExpiryMs(expiresAt: string | null | undefined): number | null {
  if (!expiresAt) return null;
  const raw = expiresAt.trim();
  const iso = /^\d{4}-\d{2}-\d{2}$/.test(raw) ? `${raw}T23:59:59.999+06:00` : raw;
  const ms = new Date(iso).getTime();
  return Number.isFinite(ms) ? ms : null;
}

/** Validate a promo code against a subtotal and return the discount amount. */
export function evaluatePromo(promo: PromoCode | null, subtotal: number): PromoResult {
  if (!promo) return { ok: false, discount: 0, reason: "কোড পাওয়া যায়নি" };
  if (!promo.is_active) return { ok: false, discount: 0, reason: "এই কোড বন্ধ আছে", promo };

  const expires = promoExpiryMs(promo.expires_at);
  if (expires != null && expires < Date.now()) {
    return { ok: false, discount: 0, reason: "কোডের মেয়াদ শেষ", promo };
  }
  if (promo.usage_limit > 0 && promo.used_count >= promo.usage_limit) {
    return { ok: false, discount: 0, reason: "কোডটি সবার কাছে শেষ হয়ে গেছে", promo };
  }
  if (subtotal < promo.min_order) {
    return {
      ok: false,
      discount: 0,
      reason: `ন্যূনতম ৳${promo.min_order} এর অর্ডারে এই কোড চলবে`,
      promo,
    };
  }
  let discount = Math.round((subtotal * promo.percent) / 100);
  if (promo.max_discount > 0) discount = Math.min(discount, promo.max_discount);
  return { ok: true, discount, promo };
}

export interface ReferralResult {
  ok: boolean;
  reason?: string;
  referral?: Referral;
}

/** Validate a referral code — arbitrary text must never earn a discount. */
export function evaluateReferral(referral: Referral | null, subtotal: number): ReferralResult {
  if (!referral) return { ok: false, reason: "রেফারেল কোড পাওয়া যায়নি" };
  if (!referral.is_active) return { ok: false, reason: "এই রেফারেল কোড বন্ধ আছে", referral };
  const expires = promoExpiryMs(referral.expires_at);
  if (expires != null && expires < Date.now()) {
    return { ok: false, reason: "রেফারেল কোডের মেয়াদ শেষ", referral };
  }
  if (referral.max_uses > 0 && referral.used_count >= referral.max_uses) {
    return { ok: false, reason: "এই রেফারেল কোড আর ব্যবহার করা যাবে না", referral };
  }
  if (subtotal <= 0) return { ok: false, reason: "রেফারেল প্রযোজ্য নয়", referral };
  return { ok: true, referral };
}

export function referralDiscount(subtotal: number): number {
  return Math.min(Math.round((subtotal * REFERRAL_PERCENT) / 100), REFERRAL_MAX_DISCOUNT);
}

/**
 * Free delivery only applies when the feature is enabled AND the payable
 * subtotal reaches the configured threshold. Disabled means always charged.
 */
export function deliveryCharge(subtotalAfterDiscount: number, settings: Settings): number {
  if (!settings.free_delivery_enabled) return Math.max(0, settings.delivery_charge);
  if (settings.free_delivery_min <= 0) return 0;
  if (subtotalAfterDiscount >= settings.free_delivery_min) return 0;
  return Math.max(0, settings.delivery_charge);
}

/** Build the final price breakdown — always recalculated server side. */
export function buildBreakdown(
  items: Pick<OrderItem, "unit_price" | "quantity">[],
  opts: {
    promo?: PromoCode | null;
    referralCode?: string | null;
    referralValid?: boolean;
    settings: Settings;
    promoResult?: PromoResult;
  },
): PriceBreakdown {
  const subtotal = sumItems(items);
  const notes: string[] = [];

  const promoResult = opts.promoResult ?? evaluatePromo(opts.promo ?? null, subtotal);
  const promoDiscount = promoResult.ok ? promoResult.discount : 0;

  const afterPromo = subtotal - promoDiscount;

  const hasReferral = Boolean(opts.referralCode?.trim() && opts.referralValid);
  const refDiscount = hasReferral ? referralDiscount(afterPromo) : 0;

  const payable = afterPromo - refDiscount;
  const delivery = deliveryCharge(payable, opts.settings);

  if (promoDiscount > 0) notes.push(`Promo ${opts.promo?.code ?? ""} — ৳${promoDiscount} ছাড়`);
  if (refDiscount > 0) notes.push(`Referral — ৳${refDiscount} ছাড়`);
  if (delivery === 0 && settingsFreeDelivery(opts.settings)) notes.push("🎉 ফ্রি ডেলিভারি");

  return {
    subtotal,
    promo_code: promoResult.ok ? (opts.promo?.code ?? null) : null,
    discount_amount: promoDiscount,
    referral_code: hasReferral && refDiscount > 0 ? opts.referralCode!.trim().toUpperCase() : null,
    referral_discount: refDiscount,
    delivery_charge: delivery,
    total: payable + delivery,
    notes,
  };
}

function settingsFreeDelivery(settings: Settings): boolean {
  return settings.free_delivery_enabled && settings.delivery_charge > 0;
}

/** Price for one item at a chosen weight (falls back to base price). */
export function priceForWeight(
  cake: { base_price: number; sizes?: { weight: number; price: number; is_available: boolean }[] },
  weight?: number,
): number {
  if (weight != null && cake.sizes?.length) {
    const match = cake.sizes.find((s) => Math.abs(s.weight - weight) < 0.01);
    if (match) return match.price;
  }
  return cake.base_price;
}
