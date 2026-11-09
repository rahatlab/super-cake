/**
 * Parse the customer's free-text reply while an order draft is open: pull
 * the delivery address, contact phone, date and time of day out of a single
 * natural-language message such as
 *
 *   House 12, Road 3, Dhanmondi — 01712345678 — 7 Nov 2026 বিকাল
 *   dhake, palash Narsingdi..... bikal 5.00 am, 7th Nov
 *
 * Deliberately dependency-free (type-only imports, no store, no libraries)
 * so it can be unit-tested by `node --test` — same convention as
 * `order-request.ts` and `whatsapp-menu.ts`.
 */

import type { OrderSlot } from "./order-request";

export interface ParsedOrderDetails {
  /** Text left over after phone / date / time tokens are removed. */
  address?: string;
  /** Digits in `8801…` form — the caller stores it on the order. */
  phone?: string;
  /** `YYYY-MM-DD` when the customer named a date. */
  deliveryDate?: string;
  /** Only set when the customer named a time of day. */
  slot?: OrderSlot;
}

/** Bengali digits → ASCII so `৭ই নভেম্বর` parses like `7ই নভেম্বর`. */
function toAsciiDigits(input: string): string {
  return input.replace(/[০-৯]/g, (d) => String("০১২৩৪৫৬৭৮৯".indexOf(d)));
}

/* ---------------- phone ---------------- */

/** BD mobile with arbitrary separators: `01712-345678`, `+880 17 12345678`. */
const PHONE_RE = /(?:\+?880|0)?1[3-9](?:[\s\-()]*\d){8}(?!\d)/g;
const PHONE_SHAPE = /^(?:880|0)?1[3-9]\d{8}$/;

/** Store numbers in one canonical form (`017…` → `88017…`). */
function normalizePhone(digits: string): string {
  if (digits.startsWith("880")) return digits;
  if (digits.startsWith("0")) return `88${digits}`;
  return `880${digits}`; // bare 10-digit `1712345678`
}

/** First valid BD mobile in `text`, plus the text with every match removed. */
function extractPhone(text: string): { phone?: string; rest: string } {
  const re = new RegExp(PHONE_RE.source, PHONE_RE.flags);
  let rest = text;
  let phone: string | undefined;
  let match: RegExpExecArray | null;
  while ((match = re.exec(text))) {
    const digits = match[0].replace(/\D/g, "");
    if (!PHONE_SHAPE.test(digits)) continue;
    if (!phone) phone = normalizePhone(digits);
    rest = rest.replace(match[0], " ");
  }
  return { phone, rest };
}

/* ---------------- date ---------------- */

const MONTHS: Record<string, number> = {
  jan: 1, january: 1, feb: 2, february: 2, mar: 3, march: 3,
  apr: 4, april: 4, may: 5, jun: 6, june: 6, jul: 7, july: 7,
  aug: 8, august: 8, sep: 9, sept: 9, september: 9,
  oct: 10, october: 10, nov: 11, november: 11, dec: 12, december: 12,
};

const MONTHS_BN: Record<string, number> = {
  "জানুয়ারি": 1,
  "ফেব্রুয়ারি": 2,
  "মার্চ": 3,
  "এপ্রিল": 4,
  "মে": 5,
  "জুন": 6,
  "জুলাই": 7,
  "আগস্ট": 8,
  "সেপ্টেম্বর": 9,
  "অক্টোবর": 10,
  "নভেম্বর": 11,
  "ডিসেম্বর": 12,
};

const BN_MONTH_ALT =
  "জানুয়ারি|ফেব্রুয়ারি|ফেব্রুয়ারি|মার্চ|এপ্রিল|মে|জুন|জুলাই|আগস্ট|সেপ্টেম্বর|অক্টোবর|নভেম্বর|ডিসেম্বর";

interface DateCandidate {
  y?: number;
  m: number;
  d: number;
}

interface DatePattern {
  source: string;
  flags: string;
  toParts(match: RegExpExecArray): DateCandidate | null;
}

const DATE_PATTERNS: DatePattern[] = [
  {
    // 2026-11-25
    source: String.raw`\b(\d{4})-(\d{2})-(\d{2})\b`,
    flags: "g",
    toParts: (m) => ({ y: Number(m[1]), m: Number(m[2]), d: Number(m[3]) }),
  },
  {
    // 25/11/2026, 25-11-2026, 25.11.2026 (day first — BD convention)
    source: String.raw`\b(\d{1,2})[/.\-](\d{1,2})[/.\-](\d{4})\b`,
    flags: "g",
    toParts: (m) => ({ y: Number(m[3]), m: Number(m[2]), d: Number(m[1]) }),
  },
  {
    // 7th Nov 2026 / 7 November
    source: String.raw`\b(\d{1,2})(?:st|nd|rd|th)?\s+(?:of\s+)?([A-Za-z]{3,})\.?(?:\s*,?\s+(\d{4}))?\b`,
    flags: "gi",
    toParts: (m) => {
      const month = MONTHS[m[2].toLowerCase()];
      return month ? { y: m[3] ? Number(m[3]) : undefined, m: month, d: Number(m[1]) } : null;
    },
  },
  {
    // Nov 7, 2026 / November 7
    source: String.raw`\b([A-Za-z]{3,})\.?\s+(\d{1,2})(?:st|nd|rd|th)?(?:\s*,?\s+(\d{4}))?\b`,
    flags: "gi",
    toParts: (m) => {
      const month = MONTHS[m[1].toLowerCase()];
      return month ? { y: m[3] ? Number(m[3]) : undefined, m: month, d: Number(m[2]) } : null;
    },
  },
  {
    // ৭ই নভেম্বর ২০২৬ (Bengali digits are already ASCII at this point)
    source: String.raw`(?:^|[^\d])(\d{1,2})(?:ই|তারিখ)?\s*(` + BN_MONTH_ALT + String.raw`)(?:\s*,?\s*(\d{4}))?`,
    flags: "g",
    toParts: (m) => {
      const month = MONTHS_BN[m[2]];
      return month ? { y: m[3] ? Number(m[3]) : undefined, m: month, d: Number(m[1]) } : null;
    },
  },
];

/** `YYYY-MM-DD` for a real calendar day, or null (e.g. 30 Feb). */
function isoOf(y: number, m: number, d: number): string | null {
  if (m < 1 || m > 12 || d < 1 || d > 31) return null;
  const dt = new Date(Date.UTC(y, m - 1, d));
  if (dt.getUTCFullYear() !== y || dt.getUTCMonth() !== m - 1 || dt.getUTCDate() !== d) {
    return null;
  }
  return dt.toISOString().slice(0, 10);
}

/**
 * Validate the candidate. A date without a year uses the current Dhaka year
 * and rolls forward when it has already passed ("15 Jan" said in November →
 * next January); an explicitly dated past request is returned as typed so the
 * caller can reject it with a clear message.
 */
function resolveDate(parts: DateCandidate): string | null {
  const now = new Date(Date.now() + 6 * 3600_000); // Dhaka = UTC+6
  const today = now.toISOString().slice(0, 10);
  const year = parts.y ?? now.getUTCFullYear();
  let iso = isoOf(year, parts.m, parts.d);
  if (!iso) return null;
  if (!parts.y && iso < today) {
    iso = isoOf(year + 1, parts.m, parts.d);
  }
  return iso;
}

/** First parseable date in `text`, plus the text with it removed. */
function extractDate(text: string): { date?: string; rest: string } {
  let rest = text;
  for (const pattern of DATE_PATTERNS) {
    const re = new RegExp(pattern.source, pattern.flags);
    let match: RegExpExecArray | null;
    while ((match = re.exec(rest))) {
      if (!match[0]) {
        re.lastIndex += 1;
        continue;
      }
      const parts = pattern.toParts(match);
      if (!parts) continue;
      const iso = resolveDate(parts);
      if (!iso) continue;
      rest = rest.replace(match[0], " ");
      return { date: iso, rest };
    }
  }
  return { rest };
}

/* ---------------- time of day ---------------- */

/**
 * Slot words that are safe to strip from the address: Bengali script and
 * romanised Bangla are never part of a street address. English words stay in
 * the address ("Morning Glory" must not lose its name) — they only set the
 * slot.
 */
const SLOT_WORDS_STRIPPABLE: { re: RegExp; value: OrderSlot }[] = [
  {
    re: /(?<![\p{L}])সকাল(?:ে|ের|বেলা)?(?![\p{L}])|\bsokal\b|\bsubah\b/iu,
    value: "morning",
  },
  {
    re: /(?<![\p{L}])দুপুর(?:ে|ের)?(?![\p{L}])|\bdupur\b/iu,
    value: "afternoon",
  },
  {
    re: /(?<![\p{L}])বিকাল(?:ে|ের)?(?![\p{L}])|\bbikal\b|\bbikel\b|\bsandhya\b/iu,
    value: "evening",
  },
  {
    re: /(?<![\p{L}])রাত(?:ে|ের|্রি|্রে)?(?![\p{L}])|\braat\b/iu,
    value: "night",
  },
];

/** English slot words — detected, but never removed from the address. */
const SLOT_WORDS_EN: { re: RegExp; value: OrderSlot }[] = [
  { re: /\bmorning\b/i, value: "morning" },
  { re: /\bafternoon\b/i, value: "afternoon" },
  { re: /\bevening\b/i, value: "evening" },
  { re: /\bnight\b/i, value: "night" },
];

/** `5 pm`, `5.00 am`, `10:30 pm`. */
const TIME_RE = /\b(\d{1,2})(?:[:.](\d{2}))?\s*(am|pm)\b/i;

function slotFromHour(hour: number, meridiem: string): OrderSlot {
  let h = hour % 12;
  if (meridiem.toLowerCase() === "pm") h += 12;
  if (h >= 5 && h <= 11) return "morning";
  if (h >= 12 && h <= 15) return "afternoon";
  if (h >= 16 && h <= 18) return "evening";
  return "night";
}

/**
 * Detect the time of day. Word wins over `am/pm` so the contradictory
 * "bikal 5.00 am" reads as evening (the customer said বিকাল first).
 * Returns every time token found so none of them leaks into the address.
 */
function detectSlot(text: string): { slot?: OrderSlot; strip: string[] } {
  const strip: string[] = [];
  let slot: OrderSlot | undefined;

  for (const { re, value } of SLOT_WORDS_STRIPPABLE) {
    const m = re.exec(text);
    if (m) {
      strip.push(m[0]);
      slot ??= value;
    }
  }

  if (!slot) {
    for (const { re, value } of SLOT_WORDS_EN) {
      const m = re.exec(text);
      if (m) {
        slot = value;
        break;
      }
    }
  }

  const time = TIME_RE.exec(text);
  if (time) {
    strip.push(time[0]);
    slot ??= slotFromHour(Number(time[1]), time[3]);
  }

  return { slot, strip };
}

/* ---------------- address ---------------- */

const ADDRESS_LABEL_RE =
  /^(?:delivery\s+address|shipping\s+address|address|addr|ঠিকানা)\s*[:\-–—]\s*/i;

const EDGE_PUNCT_RE = /^[()\[\]{}.,;:|/\\\-–—\s]+|[()\[\]{}.,;:|/\\\-–—\s]+$/g;

/** Leftover text → a usable address (or undefined when nothing is there). */
function buildAddress(text: string): string | undefined {
  let s = text.replace(/\s+/g, " ").trim();
  s = s.replace(ADDRESS_LABEL_RE, "");
  s = s.replace(EDGE_PUNCT_RE, "").trim();
  s = s.replace(/\s*\|\s*/g, ", ");
  return s.length >= 3 ? s : undefined;
}

/* ---------------- name ---------------- */

const NAME_PREFIX_RE =
  /^(?:আমার নাম|নাম|আমি|name|ami)\s*[:\-–—]?\s*/i;

/**
 * The customer's own name from a stepwise reply. One whole message is
 * expected here, so anything that looks like a phone number, a date or an
 * address is rejected — the stepwise prompt asks for those separately.
 */
export function parseCustomerName(input: string): string | undefined {
  let s = input.replace(/\s+/g, " ").trim().replace(NAME_PREFIX_RE, "").trim();
  s = s.replace(/^[()\[\]{}.,;:!?|/\\\-–—\s]+/, "").replace(/[()\[\]{}.,;:!?|/\\\-–—\s]+$/, "").trim();
  if (s.length < 2 || s.length > 50) return undefined;
  if (!/[\p{L}]/u.test(s)) return undefined;
  const digits = s.replace(/\D/g, "");
  if (digits.length >= 7) return undefined; // a phone number, not a name
  if (/\d/.test(s) && digits.length >= 3) return undefined;
  if (/^(cancel|stop|বাতিল|হ্যাঁ|হাঁ|হ|yes|ok|okay)$/i.test(s)) return undefined;
  return s;
}

/* ---------------- relative date words ---------------- */

/** Dhaka `YYYY-MM-DD` plus `offset` days (আজ/কাল/পরশু quick replies). */
function dhakaDatePlus(offset: number): string {
  const now = new Date(Date.now() + 6 * 3600_000 + offset * 86400_000);
  return now.toISOString().slice(0, 10);
}

function extractRelativeDate(text: string): { date?: string; rest: string } {
  const m = text.match(/আগামীকাল|পরশু|আজ|tomorrow|day\s+after|today/i);
  if (!m) return { rest: text };
  const w = m[0].toLowerCase();
  const offset = /আগামীকাল|কাল|tomorrow/.test(w) || w === "কাল" ? 1 : /পরশু|day\s+after/.test(w) ? 2 : 0;
  // পরশু must win over কাল (পরশু contains কাল? no — Bengali script differs, order above still safe)
  const rest = text.replace(m[0], " ");
  return { date: dhakaDatePlus(/পরশু/.test(w) ? 2 : offset), rest };
}

/* ---------------- entry point ---------------- */

/**
 * Extract whatever the customer supplied in one free-text message. Missing
 * fields stay `undefined` — the caller merges them into the open draft and
 * only offers the confirm button once address, phone and date are all set.
 */
export function parseOrderDetails(input: string): ParsedOrderDetails {
  const out: ParsedOrderDetails = {};
  let working = toAsciiDigits(input);

  const phone = extractPhone(working);
  if (phone.phone) out.phone = phone.phone;
  working = phone.rest;

  const relative = extractRelativeDate(working);
  if (relative.date) out.deliveryDate = relative.date;
  working = relative.rest;

  const date = extractDate(working);
  if (date.date) out.deliveryDate = date.date;
  working = date.rest;

  const slot = detectSlot(working);
  if (slot.slot) out.slot = slot.slot;
  for (const token of slot.strip) working = working.replace(token, " ");

  const address = buildAddress(working);
  if (address) out.address = address;

  return out;
}
