/**
 * Parse a free-text WhatsApp order request and encode/decode the confirm
 * button payload.
 *
 * Deliberately dependency-free (no `@/` aliases, no store, no date math) so it
 * can be unit-tested by `node --test` and imported from both the auto-reply
 * builder and the webhook — same convention as `whatsapp-menu.ts`.
 *
 * Message shape the parser targets:
 *
 *   order Chocolate Premium 2 birthday 2lb 2026-11-25
 *   অর্ডার চকলেট প্রিমিয়াম ২টি জন্মদিন
 *
 * Everything after the trigger word is optional except the cake name; missing
 * fields fall back to sensible defaults (1 pc, 1 lb, "others", soonest date).
 */

export type OrderOccasion =
  | "birthday"
  | "anniversary"
  | "occasion"
  | "gift"
  | "others";

export type OrderSlot = "morning" | "afternoon" | "evening" | "night";

export interface OrderRequest {
  /** Remaining words — resolved to a catalog cake by the caller. */
  cakeQuery: string;
  quantity: number;
  /** lb — only set when the customer explicitly named a size. */
  weight?: number;
  occasion: OrderOccasion;
  /** `YYYY-MM-DD` when the customer asked for a specific date. */
  deliveryDate?: string;
  /** Only set when the customer named a time of day. */
  slot?: OrderSlot;
}

/** `order …` / `অর্ডার …` — returns the remainder ("" when nothing follows). */
export function splitOrderRequest(raw: string): string | null {
  const match = raw.trim().match(/^(?:order|অর্ডার)\s*[:\-–—]?\s*(.*)$/i);
  if (!match) return null;
  return match[1].trim();
}

/** Bengali digits → ASCII so `২টি` parses like `2টি`. */
function toAsciiDigits(input: string): string {
  return input.replace(/[০-৯]/g, (d) => String("০১২৩৪৫৬৭৮৯".indexOf(d)));
}

const OCCASION_WORDS: { re: RegExp; value: OrderOccasion }[] = [
  { re: /জন্মদিন|বার্থডে|birthday/i, value: "birthday" },
  { re: /বার্ষিকী|anniversary/i, value: "anniversary" },
  { re: /উপহার|gift/i, value: "gift" },
  { re: /অনুষ্ঠান|ইদ|eid|সাকসেস|success/i, value: "occasion" },
];

const SLOT_WORDS: { re: RegExp; value: OrderSlot }[] = [
  { re: /সকাল|morning/i, value: "morning" },
  { re: /দুপুর|afternoon|আবাহ্ন/i, value: "afternoon" },
  { re: /বিকাল|evening/i, value: "evening" },
  { re: /রাত|night/i, value: "night" },
];

/** Valid size weights in the catalog (mirrors `sizeRows`). */
const WEIGHT_RE = /(?:^|[^\d.])(0\.5|1|2|3)\s*(?:lb|lbs|pound|pounds|পাউন্ড)(?![\w])/i;

/**
 * Pull quantity / weight / date / occasion / slot out of a free-text order
 * request. Never throws — unknown leftovers stay in `cakeQuery` for the
 * fuzzy name lookup to resolve (or reject).
 */
export function parseOrderRequest(input: string): OrderRequest {
  const full = toAsciiDigits(input);
  let working = full;

  let deliveryDate: string | undefined;
  const dateMatch = working.match(/\b\d{4}-\d{2}-\d{2}\b/);
  if (dateMatch) {
    deliveryDate = dateMatch[0];
    working = working.replace(dateMatch[0], " ");
  }

  let weight: number | undefined;
  const weightMatch = working.match(WEIGHT_RE);
  if (weightMatch) {
    weight = Number(weightMatch[1]);
    working = working.replace(weightMatch[0], " ");
  }

  let quantity = 1;
  const qtyMatch = working.match(/(?:^|[^\d.])(\d{1,2})(?![\d.])/);
  if (qtyMatch) {
    const n = Number(qtyMatch[1]);
    if (n >= 1 && n <= 20) {
      quantity = n;
      working = working.replace(qtyMatch[0], " ");
    }
  }

  // Drop the unit words the quantity/weight extraction left behind
  // (`\b` doesn't work around Bengali characters, so match them directly).
  working = working
    .replace(/\b(?:x|pcs|pieces)\b/gi, " ")
    .replace(/টি|টা/g, " ");

  // Occasion and slot words are metadata, not part of the cake name —
  // detection still runs against the untouched original text.
  for (const { re } of OCCASION_WORDS) working = working.replace(re, " ");
  for (const { re } of SLOT_WORDS) working = working.replace(re, " ");

  const cakeQuery = working.replace(/[,|/]+/g, " ").replace(/\s+/g, " ").trim();

  const occasion =
    OCCASION_WORDS.find(({ re }) => re.test(full))?.value ?? "others";
  const slot = SLOT_WORDS.find(({ re }) => re.test(full))?.value;

  return { cakeQuery, quantity, weight, occasion, deliveryDate, slot };
}

/* ---------------- confirm-button payload ---------------- */

export interface OrderConfirmPayload {
  cakeId: string;
  quantity: number;
  weight?: number;
  occasion: OrderOccasion;
  deliveryDate: string;
  /** Absent when the customer did not name a time of day. */
  slot?: OrderSlot;
}

export type DecodedConfirm =
  | { action: "confirm"; payload: OrderConfirmPayload }
  | { action: "cancel" };

/** Button ids are capped at 256 bytes by Meta — this stays well under. */
export function encodeConfirmId(p: OrderConfirmPayload): string {
  return [
    "oc",
    "confirm",
    p.cakeId,
    String(p.quantity),
    p.weight != null ? String(p.weight) : "",
    p.occasion,
    p.deliveryDate,
    p.slot ?? "",
  ].join(":");
}

export const CANCEL_CONFIRM_ID = "oc:cancel";

/**
 * `oc:cancel` or `oc:confirm:<cakeId>:<qty>:<weight>:<occasion>:<date>:<slot>`.
 * Anything else returns null (not an order button).
 */
export function decodeConfirmId(id: string): DecodedConfirm | null {
  if (id === CANCEL_CONFIRM_ID) return { action: "cancel" };
  if (!id.startsWith("oc:confirm:")) return null;

  const parts = id.split(":");
  // oc, confirm, cakeId, qty, weight, occasion, date, slot → 8 parts
  if (parts.length !== 8) return null;

  const [, , cakeId, qtyRaw, weightRaw, occasion, deliveryDate, slotRaw] = parts;
  const quantity = Number(qtyRaw);
  if (!cakeId || !Number.isInteger(quantity) || quantity < 1 || quantity > 20) {
    return null;
  }
  if (!/^\d{4}-\d{2}-\d{2}$/.test(deliveryDate)) return null;

  const weight = weightRaw ? Number(weightRaw) : undefined;
  if (weight != null && !Number.isFinite(weight)) return null;

  return {
    action: "confirm",
    payload: {
      cakeId,
      quantity,
      weight,
      occasion: occasion as OrderOccasion,
      deliveryDate,
      slot: slotRaw ? (slotRaw as OrderSlot) : undefined,
    },
  };
}
