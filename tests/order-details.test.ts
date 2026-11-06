import { test } from "node:test";
import assert from "node:assert/strict";
import { parseOrderDetails } from "../src/lib/whatsapp/order-details.ts";

/** Dhaka today as YYYY-MM-DD (mirrors `dhakaDateString`). */
const today = new Date(Date.now() + 6 * 3600_000).toISOString().slice(0, 10);

test("extracts address, phone, date and slot from one message", () => {
  const d = parseOrderDetails(
    "House 12, Road 3, Dhanmondi, Dhaka — 01712345678 — 7 Nov 2026 বিকাল",
  );
  assert.equal(d.phone, "8801712345678");
  assert.equal(d.deliveryDate, "2026-11-07");
  assert.equal(d.slot, "evening");
  assert.equal(d.address, "House 12, Road 3, Dhanmondi, Dhaka");
});

test("understands the screenshot-style message (trailing dots, bikal, 7th Nov)", () => {
  const d = parseOrderDetails("dhake, palash Narsingdi..... bikal 5.00 am, 7th Nov");
  // বিকাল wins over the contradictory `5.00 am`.
  assert.equal(d.slot, "evening");
  assert.equal(d.address, "dhake, palash Narsingdi");
  assert.equal(d.phone, undefined);
  // No year given → month/day only (the year rolls forward when past).
  assert.equal(d.deliveryDate?.slice(4), "-11-07");
  assert.ok(d.deliveryDate && d.deliveryDate >= today, "the date must not be in the past");
});

test("accepts every common BD phone format and keeps it out of the address", () => {
  assert.equal(parseOrderDetails("01712345678").phone, "8801712345678");
  assert.equal(parseOrderDetails("01712-345678").phone, "8801712345678");
  assert.equal(parseOrderDetails("+8801712345678").phone, "8801712345678");
  assert.equal(parseOrderDetails("880 1712345678").phone, "8801712345678");
  assert.equal(parseOrderDetails("1712345678").phone, "8801712345678");

  const d = parseOrderDetails("Vill: Rampur, 01911223344");
  assert.equal(d.phone, "8801911223344");
  assert.equal(d.address, "Vill: Rampur");
  assert.ok(!d.address?.includes("01911223344"));
});

test("an address with ordinary numbers is not mistaken for a phone", () => {
  const d = parseOrderDetails("House 12, Road 34, Dhanmondi 1209");
  assert.equal(d.phone, undefined);
  assert.equal(d.address, "House 12, Road 34, Dhanmondi 1209");
});

test("address-only replies leave phone, date and slot unset", () => {
  const d = parseOrderDetails("Flat 4B, Bashundhara R/A, Dhaka");
  assert.equal(d.address, "Flat 4B, Bashundhara R/A, Dhaka");
  assert.equal(d.phone, undefined);
  assert.equal(d.deliveryDate, undefined);
  assert.equal(d.slot, undefined);
});

test("parses ISO, day-first and Bengali-digit dates", () => {
  assert.equal(parseOrderDetails("2026-12-25").deliveryDate, "2026-12-25");
  assert.equal(parseOrderDetails("25/12/2026 house").deliveryDate, "2026-12-25");
  assert.equal(parseOrderDetails("৭ই নভেম্বর ২০২৬").deliveryDate, "2026-11-07");
  assert.equal(parseOrderDetails("১৫ জানুয়ারি ২০২৭").deliveryDate, "2027-01-15");
});

test("invalid calendar days are not dates", () => {
  const d = parseOrderDetails("32 Jan 2026");
  assert.equal(d.deliveryDate, undefined);
});

test("a year-less date rolls forward instead of landing in the past", () => {
  const d = parseOrderDetails("15 Jan");
  assert.ok(d.deliveryDate, "a parseable date is expected");
  assert.equal(d.deliveryDate?.slice(4), "-01-15");
  assert.ok(d.deliveryDate && d.deliveryDate >= today);
});

test("an explicitly dated past request is returned as typed (caller rejects it)", () => {
  const d = parseOrderDetails("2020-01-01");
  assert.equal(d.deliveryDate, "2020-01-01");
});

test("maps clock times to slots", () => {
  assert.equal(parseOrderDetails("9 am").slot, "morning");
  assert.equal(parseOrderDetails("12:30 pm").slot, "afternoon");
  assert.equal(parseOrderDetails("5 pm").slot, "evening");
  assert.equal(parseOrderDetails("11.00 pm").slot, "night");
  assert.equal(parseOrderDetails("3 am").slot, "night");
});

test("Bengali and romanised slot words are detected and stripped from the address", () => {
  const bn = parseOrderDetails("ঘরে দিন রাত");
  assert.equal(bn.slot, "night");
  assert.equal(bn.address, "ঘরে দিন");

  const roman = parseOrderDetails("my home dupur age");
  assert.equal(roman.slot, "afternoon");
  assert.equal(roman.address, "my home age");
});

test("English slot words set the slot but stay in the address", () => {
  const d = parseOrderDetails("Morning Glory apartment, morning");
  assert.equal(d.slot, "morning");
  assert.equal(d.address, "Morning Glory apartment, morning");
});

test("a leading address label is stripped", () => {
  // Bengali digits are normalised to ASCII on the way in (date parsing).
  assert.equal(parseOrderDetails("ঠিকানা: বাড়ি ১২, ধানমন্ডি").address, "বাড়ি 12, ধানমন্ডি");
  assert.equal(parseOrderDetails("Address: House 5, Uttara").address, "House 5, Uttara");
});

test("menu-ish or empty junk yields no details at all", () => {
  assert.deepEqual(parseOrderDetails("ok"), {});
  assert.deepEqual(parseOrderDetails("??"), {});
});
