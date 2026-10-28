import test from "node:test";
import assert from "node:assert/strict";
import {
  buildBreakdown,
  deliveryCharge,
  evaluatePromo,
  evaluateReferral,
  priceForWeight,
  referralDiscount,
} from "../src/lib/pricing.ts";
import { phoneKey, toE164, waLink } from "../src/lib/utils.ts";

const settings = {
  store_name: "Super Cake",
  tagline: "Test",
  phone: "+880 1700-000000",
  whatsapp_phone: "8801700000000",
  email: "test@example.com",
  address: "Dhaka",
  bkash_number: "01700000000",
  delivery_charge: 80,
  free_delivery_min: 2000,
  free_delivery_enabled: true,
  cod_enabled: true,
  bkash_enabled: true,
};

test("phoneKey keeps the last 10 digits", () => {
  assert.equal(phoneKey("+880 1712-345678"), "1712345678");
  assert.equal(phoneKey("01712345678"), "1712345678");
});

test("toE164 normalises local numbers", () => {
  assert.equal(toE164("01712345678"), "8801712345678");
  assert.equal(toE164("+8801712345678"), "8801712345678");
});

test("waLink uses the international number", () => {
  assert.ok(waLink("01712345678", "hi").startsWith("https://wa.me/8801712345678?text="));
});

test("promo honours min order, percent and cap", () => {
  const promo = {
    id: "p1",
    code: "WELCOME10",
    percent: 10,
    min_order: 1000,
    max_discount: 150,
    usage_limit: 0,
    used_count: 0,
    expires_at: null,
    is_active: true,
    description: "",
    created_at: "2026-01-01T00:00:00.000Z",
  };
  assert.equal(evaluatePromo(promo, 900).ok, false);
  assert.equal(evaluatePromo(promo, 1200).discount, 120);
  assert.equal(evaluatePromo(promo, 50_000).discount, 150);

  const expired = { ...promo, expires_at: "2020-01-01" };
  assert.equal(evaluatePromo(expired, 1200).ok, false);

  const exhausted = { ...promo, usage_limit: 5, used_count: 5 };
  assert.equal(evaluatePromo(exhausted, 1200).ok, false);
});

test("referral discount is 5% capped at 300", () => {
  assert.equal(referralDiscount(1000), 50);
  assert.equal(referralDiscount(10_000), 300);
});

test("referral rejects inactive, expired, exhausted and empty carts", () => {
  const base = {
    id: "r1",
    code: "FRIEND5",
    owner_id: "u_owner",
    used_count: 0,
    max_uses: 10,
    is_active: true,
    expires_at: null,
    created_at: "2026-01-01T00:00:00.000Z",
  };
  assert.equal(evaluateReferral(base, 1000).ok, true);
  assert.equal(evaluateReferral({ ...base, is_active: false }, 1000).ok, false);
  assert.equal(evaluateReferral({ ...base, expires_at: "2020-01-01" }, 1000).ok, false);
  assert.equal(evaluateReferral({ ...base, used_count: 10 }, 1000).ok, false);
  assert.equal(evaluateReferral(base, 0).ok, false);
});

test("free delivery applies only at the payable threshold", () => {
  assert.equal(deliveryCharge(2500, settings), 0);
  assert.equal(deliveryCharge(1500, settings), 80);
  assert.equal(deliveryCharge(2500, { ...settings, free_delivery_enabled: false }), 80);
  assert.equal(deliveryCharge(0, { ...settings, free_delivery_min: 0 }), 0);
});

test("breakdown applies promo then referral then delivery", () => {
  const promo = {
    id: "p1",
    code: "TEN",
    percent: 10,
    min_order: 0,
    max_discount: 0,
    usage_limit: 0,
    used_count: 0,
    expires_at: null,
    is_active: true,
    description: "",
    created_at: "2026-01-01T00:00:00.000Z",
  };
  const result = buildBreakdown([{ unit_price: 1000, quantity: 2 }], {
    promo,
    referralCode: "FRIEND5",
    referralValid: true,
    settings,
  });
  assert.equal(result.subtotal, 2000);
  assert.equal(result.discount_amount, 200);
  assert.equal(result.referral_discount, 90);
  assert.equal(result.delivery_charge, 80);
  assert.equal(result.total, 1790);
});

test("priceForWeight falls back to the base price", () => {
  const cake = {
    base_price: 1200,
    sizes: [
      { weight: 0.5, price: 800, is_available: true },
      { weight: 1, price: 1200, is_available: true },
    ],
  };
  assert.equal(priceForWeight(cake, 0.5), 800);
  assert.equal(priceForWeight(cake, 3), 1200);
  assert.equal(priceForWeight(cake), 1200);
});
