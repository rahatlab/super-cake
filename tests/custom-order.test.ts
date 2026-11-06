import test from "node:test";
import assert from "node:assert/strict";
import { checkoutSchema } from "../src/lib/validators.ts";
import { customExtras, EXTRA_TIER_FEE, tiersForWeight } from "../src/lib/custom-design.ts";
import { dhakaDatePlus } from "../src/lib/utils.ts";
import { MIN_DELIVERY_LEAD_DAYS } from "../src/lib/constants.ts";

/** Minimal valid checkout payload; `custom_spec` is varied per test. */
function payload(custom_spec: Record<string, unknown> | null) {
  return {
    customer_name: "Rahat Hossain",
    phone: "01712345678",
    email: "",
    occasion: "others",
    items: [
      {
        cake_id: "cake_1",
        name: "Custom Cake",
        slug: "custom-cake",
        unit_price: 1500,
        quantity: 1,
      },
    ],
    custom_spec,
    address: "House 1, Road 1, Dhanmondi, Dhaka",
    delivery_date: dhakaDatePlus(MIN_DELIVERY_LEAD_DAYS),
    delivery_slot: "evening",
    payment_method: "cod",
    subtotal: 1500,
    discount_amount: 0,
    referral_discount: 0,
    delivery_charge: 80,
    total: 1580,
  };
}

test("custom_spec keeps every 3D design choice from /custom-order", () => {
  const parsed = checkoutSchema.safeParse(
    payload({
      message_on_cake: "Happy Birthday",
      design_notes: "নীল dinosaur theme",
      reference_image: "https://example.com/ref.png",
      budget: 2500,
      cake_shape: "heart",
      frosting_color: "#f5e6d3",
      message_font: "script",
      message_color: "#c0182b",
      decoration: "flowers",
      tiers: 4,
      syrup: "honey",
    }),
  );

  assert.ok(parsed.success, parsed.success ? "" : parsed.error.message);
  const spec = parsed.data.custom_spec!;
  assert.equal(spec.cake_shape, "heart");
  assert.equal(spec.frosting_color, "#f5e6d3");
  assert.equal(spec.message_font, "script");
  assert.equal(spec.message_color, "#c0182b");
  assert.equal(spec.decoration, "flowers");
  assert.equal(spec.tiers, 4);
  assert.equal(spec.syrup, "honey");
  assert.equal(spec.design_notes, "নীল dinosaur theme");
  assert.equal(spec.budget, 2500);
});

test("custom_spec rejects an unknown cake shape", () => {
  const parsed = checkoutSchema.safeParse(payload({ cake_shape: "spiral" }));
  assert.equal(parsed.success, false);
});

test("custom_spec rejects an unknown decoration", () => {
  const parsed = checkoutSchema.safeParse(payload({ decoration: "confetti" }));
  assert.equal(parsed.success, false);
});

test("custom_spec rejects an unknown syrup infusion", () => {
  const parsed = checkoutSchema.safeParse(payload({ syrup: "whisky" }));
  assert.equal(parsed.success, false);
});

test("custom_spec rejects a tier count outside 1–4", () => {
  assert.equal(checkoutSchema.safeParse(payload({ tiers: 0 })).success, false);
  assert.equal(checkoutSchema.safeParse(payload({ tiers: 5 })).success, false);
  assert.equal(checkoutSchema.safeParse(payload({ tiers: 2.5 })).success, false);
});

test("customExtras matches the live quote: extra tiers + crown + syrup", () => {
  // 1 kg → baseline 1 tier; 4 tiers = 3 extra, macaron crown, honey syrup.
  const quote = customExtras({ tiers: 4, decoration: "macarons", syrup: "honey" }, 1);
  assert.equal(quote, 3 * EXTRA_TIER_FEE + 450 + 150);

  // Baseline tiers with free options never add anything.
  assert.equal(
    customExtras({ tiers: tiersForWeight(3), decoration: "none", syrup: "none" }, 3),
    0,
  );
  // No spec (non-custom order) → 0.
  assert.equal(customExtras(null, 2), 0);
  // Unknown ids fall back to 0 instead of throwing (zod already rejected them).
  assert.equal(customExtras({ decoration: "nope", syrup: "nope" } as never, 2), 0);
  // Fewer tiers than the baseline never discount the size price.
  assert.equal(tierFeeProbe(1, 3), 0);
});

/** Local wrapper so the test reads declaratively. */
function tierFeeProbe(tiers: number, weight: number): number {
  return customExtras({ tiers }, weight);
}

test("custom_spec stays optional for non-custom orders", () => {
  const parsed = checkoutSchema.safeParse(payload(null));
  assert.ok(parsed.success, parsed.success ? "" : parsed.error.message);
  assert.equal(parsed.data.custom_spec, null);
});
