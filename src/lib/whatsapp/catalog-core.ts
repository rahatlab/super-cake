/**
 * Pure helpers for the Meta WhatsApp catalog — no store, no network, so they
 * can be unit-tested under `node --test`.
 */

/**
 * Meta's Commerce API stores `price` as an int64 in the currency's base unit
 * (the docs example: `100` = 1.00). BDT therefore goes up as poisha.
 */
export function catalogPrice(amount: number): number {
  return Math.round(Math.max(0, amount) * 100);
}

/**
 * Meta reports the price the customer saw; in some regions it is the base
 * unit (100 = 1.00). If scaling down lands on the real price, use that —
 * otherwise a ৳1,500 cake would become a ৳150,000 order.
 */
export function normalizeUnitPrice(raw: number, expected: number): number {
  if (!Number.isFinite(raw) || raw <= 0) return expected;
  const scaled = raw / 100;
  if (expected > 0 && Math.abs(scaled - expected) <= Math.max(1, expected * 0.02)) {
    return Math.round(scaled);
  }
  return Math.round(raw);
}
