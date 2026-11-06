import test from "node:test";
import assert from "node:assert/strict";
import { pickUniqueSlug, slugBase } from "../src/lib/utils.ts";

/* ------------------------------ slugBase ------------------------------ */

test("latin names slugify exactly as before", () => {
  assert.equal(slugBase("Ghghgh"), "ghghgh");
  assert.equal(slugBase("Chocolate Truffle Delight"), "chocolate-truffle-delight");
  assert.equal(slugBase("  Tahiya's Cake!!  "), "tahiyas-cake");
});

test("a purely Bengali name never yields an empty slug", () => {
  const base = slugBase("চকলেট কেক", "cake");
  assert.ok(base.length > 0, "empty slug would collide on every insert");
  assert.ok(base.startsWith("cake-"), `expected a prefixed fallback, got "${base}"`);
  assert.notEqual(base, slugBase("ভ্যানিলা কেক", "cake"), "different names differ");
});

test("slugBase is deterministic — re-saving the same name derives the same slug", () => {
  assert.equal(slugBase("চকলেট কেক", "cake"), slugBase("চকলেট কেক", "cake"));
});

/* ---------------------------- pickUniqueSlug --------------------------- */

test("a free slug is taken as-is (the common case)", () => {
  assert.equal(pickUniqueSlug("ghghgh", []), "ghghgh");
  assert.equal(pickUniqueSlug("ghghgh", ["berry-cheesecake"]), "ghghgh");
});

test("a duplicate name appends -2, -3 ... instead of failing the save", () => {
  assert.equal(pickUniqueSlug("ghghgh", ["ghghgh"]), "ghghgh-2");
  assert.equal(pickUniqueSlug("ghghgh", ["ghghgh", "ghghgh-2"]), "ghghgh-3");
});

test("a longer slug sharing the prefix does not block the free base slug", () => {
  // `like 'choco%'` also matches "chocolate-cake" — that must not skip "choco".
  assert.equal(pickUniqueSlug("choco", ["chocolate-cake"]), "choco");
});
