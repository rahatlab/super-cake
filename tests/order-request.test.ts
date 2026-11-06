import { test } from "node:test";
import assert from "node:assert/strict";
import {
  CANCEL_CONFIRM_ID,
  decodeConfirmId,
  encodeConfirmId,
  parseOrderRequest,
  splitOrderRequest,
} from "../src/lib/whatsapp/order-request.ts";

test("splitOrderRequest only fires on an order/অর্ডার prefix", () => {
  assert.equal(splitOrderRequest("order Chocolate 2"), "Chocolate 2");
  assert.equal(splitOrderRequest("অর্ডার চকলেট ২টি"), "চকলেট ২টি");
  assert.equal(splitOrderRequest("ORDER birthday cake"), "birthday cake");
  assert.equal(splitOrderRequest("status please"), null);
  assert.equal(splitOrderRequest("please order"), null);
});

test("parseOrderRequest extracts quantity, size, occasion and date", () => {
  const req = parseOrderRequest("Chocolate Truffle 2 birthday 2lb 2026-11-25");
  assert.equal(req.cakeQuery, "Chocolate Truffle");
  assert.equal(req.quantity, 2);
  assert.equal(req.weight, 2);
  assert.equal(req.occasion, "birthday");
  assert.equal(req.deliveryDate, "2026-11-25");
});

test("parseOrderRequest understands Bengali digits and words", () => {
  const req = parseOrderRequest("চকলেট ট্রাফল ২টি জন্মদিন রাত");
  assert.equal(req.cakeQuery, "চকলেট ট্রাফল");
  assert.equal(req.quantity, 2);
  assert.equal(req.occasion, "birthday");
  assert.equal(req.slot, "night");
});

test("parseOrderRequest keeps leftovers in cakeQuery and defaults the rest", () => {
  const req = parseOrderRequest("Royal Chocolate");
  assert.equal(req.cakeQuery, "Royal Chocolate");
  assert.equal(req.quantity, 1);
  assert.equal(req.weight, undefined);
  assert.equal(req.occasion, "others");
  assert.equal(req.deliveryDate, undefined);
  assert.equal(req.slot, undefined);
});

test("confirm-id roundtrips through encode/decode", () => {
  const id = encodeConfirmId({
    cakeId: "cake-123",
    quantity: 2,
    weight: 1.5,
    occasion: "anniversary",
    deliveryDate: "2026-12-01",
    slot: "evening",
  });
  const decoded = decodeConfirmId(id);
  assert.ok(decoded && decoded.action === "confirm");
  if (decoded?.action === "confirm") {
    assert.equal(decoded.payload.cakeId, "cake-123");
    assert.equal(decoded.payload.quantity, 2);
    assert.equal(decoded.payload.weight, 1.5);
    assert.equal(decoded.payload.occasion, "anniversary");
    assert.equal(decoded.payload.deliveryDate, "2026-12-01");
    assert.equal(decoded.payload.slot, "evening");
  }
});

test("decode accepts an empty weight/slot and the cancel id", () => {
  const id = encodeConfirmId({
    cakeId: "c1",
    quantity: 1,
    occasion: "others",
    deliveryDate: "2026-11-20",
  });
  const decoded = decodeConfirmId(id);
  assert.ok(decoded && decoded.action === "confirm");
  if (decoded?.action === "confirm") {
    assert.equal(decoded.payload.weight, undefined);
    assert.equal(decoded.payload.slot, undefined);
  }
  assert.deepEqual(decodeConfirmId(CANCEL_CONFIRM_ID), { action: "cancel" });
});

test("decode rejects malformed, out-of-range and non-order ids", () => {
  assert.equal(decodeConfirmId("menu_status"), null);
  assert.equal(decodeConfirmId("oc:confirm:only:3"), null);
  assert.equal(
    decodeConfirmId("oc:confirm:c1:99::others:2026-11-20:"),
    null,
    "quantity above 20 must not decode",
  );
  assert.equal(
    decodeConfirmId("oc:confirm:c1:1::others:not-a-date:"),
    null,
    "a bad delivery date must not decode",
  );
});
