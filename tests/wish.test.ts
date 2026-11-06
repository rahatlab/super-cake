import test from "node:test";
import assert from "node:assert/strict";
import { isWishDue, WISH_PROMO } from "../src/lib/whatsapp/wish-core.ts";
import { catalogPrice, normalizeUnitPrice } from "../src/lib/whatsapp/catalog-core.ts";
import type { Profile } from "../src/lib/types.ts";

function profile(patch: Partial<Profile> = {}): Profile {
  return {
    id: "u_1",
    name: "Rafiq",
    phone: "8801711111111",
    role: "customer",
    created_at: "2024-01-01T00:00:00.000Z",
    ...patch,
  };
}

/* ------------------------------- auto-wish ------------------------------- */

test("a birthday is due only on its month+day, regardless of birth year", () => {
  const p = profile({ birthdate: "1990-11-03" });

  assert.equal(isWishDue(p, "birthday", "2026-11-03"), true, "fires on the day");
  assert.equal(isWishDue(p, "birthday", "2026-11-04"), false, "not the day after");
  assert.equal(isWishDue(p, "birthday", "2026-12-03"), false, "same day, wrong month");
  assert.equal(isWishDue(p, "anniversary", "2026-11-03"), false, "no anniversary stored");
});

test("one greeting per year — the stamp from this year blocks it, last year does not", () => {
  const p = profile({ birthdate: "1990-11-03", last_birthday_wish: "2026-11-03" });
  assert.equal(isWishDue(p, "birthday", "2026-11-03"), false, "already sent this run/day");

  const lastYear = profile({ birthdate: "1990-11-03", last_birthday_wish: "2025-11-03" });
  assert.equal(isWishDue(lastYear, "birthday", "2026-11-03"), true, "last year's stamp expires");
});

test("anniversary matching is independent of the birthday", () => {
  const p = profile({
    birthdate: "1990-11-03",
    anniversary_date: "2015-06-21",
    last_anniversary_wish: "2026-06-21",
  });

  assert.equal(isWishDue(p, "anniversary", "2026-06-21"), false, "anniversary already greeted");
  assert.equal(isWishDue(p, "anniversary", "2026-11-03"), false, "wrong date for anniversary");
  assert.equal(isWishDue(p, "birthday", "2026-11-03"), true, "birthday still due");

  const nextYear = profile({ ...p, last_anniversary_wish: "2025-06-21" });
  assert.equal(isWishDue(nextYear, "anniversary", "2026-06-21"), true);
});

test("an empty or malformed milestone date never fires", () => {
  assert.equal(isWishDue(profile({}), "birthday", "2026-11-03"), false, "unset");
  assert.equal(
    isWishDue(profile({ birthdate: "" }), "birthday", "2026-11-03"),
    false,
    "cleared value",
  );
  assert.equal(
    isWishDue(profile({ birthdate: "1990/11/03" }), "birthday", "2026-11-03"),
    false,
    "wrong shape (no year slice to match)",
  );
});

test("the wish promo settings stay within the shop's discount policy", () => {
  assert.ok(WISH_PROMO.percent > 0 && WISH_PROMO.percent <= 100, "percent is 1-100");
  assert.ok(WISH_PROMO.maxDiscount > 0, "a cap exists, so the code can't run away");
  assert.ok(WISH_PROMO.validDays >= 1, "codes live at least a day");
});

/* ------------------------------ catalog prices ---------------------------- */

test("catalogPrice converts taka to Meta's base-unit integer", () => {
  assert.equal(catalogPrice(1500), 150000, "৳1,500 goes up as 150000 poisha");
  assert.equal(catalogPrice(0.5), 50, "half a taka is 50 poisha");
  assert.equal(catalogPrice(999.999), 100000, "rounds rather than truncating");
  assert.equal(catalogPrice(-10), 0, "never a negative price");
});

test("normalizeUnitPrice undoes a base-unit price but leaves a normal one alone", () => {
  assert.equal(normalizeUnitPrice(1500, 1500), 1500, "plain currency price is kept");
  assert.equal(normalizeUnitPrice(150000, 1500), 1500, "base-unit price is scaled down");
  assert.equal(normalizeUnitPrice(15000, 15000), 15000, "10x is not mistaken for cents");
  assert.equal(normalizeUnitPrice(2000, 1500), 2000, "a genuinely different price is trusted");
  assert.equal(normalizeUnitPrice(0, 1500), 1500, "missing price falls back to the real one");
  assert.equal(normalizeUnitPrice(Number.NaN, 1500), 1500, "garbage falls back too");
});
