/** Merge class names, dropping falsy values. */
export function cn(...parts: (string | false | null | undefined)[]): string {
  return parts.filter(Boolean).join(" ");
}

/**
 * Current epoch milliseconds. Server components may read the clock once per
 * request; keeping it in a helper avoids React's client-render purity lint.
 */
export function nowMs(): number {
  return Date.now();
}

/** Format amount as Bangladeshi Taka: 1200 -> ৳1,200 */
export function formatBDT(amount: number): string {
  return "৳" + new Intl.NumberFormat("en-BD", { maximumFractionDigits: 0 }).format(Math.round(amount));
}

/** 1 -> "1 lb", 0.5 -> "½ lb" */
export function weightLabel(w: number): string {
  if (w === 0.5) return "½ lb";
  return `${w} lb`;
}

export function slugify(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, "")
    .replace(/[\s_-]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

/* ---------------- timezone-safe helpers (Asia/Dhaka) ---------------- */

export const DHAKA_TIMEZONE = "Asia/Dhaka";

const dhakaDateFormatter = new Intl.DateTimeFormat("en-CA", {
  timeZone: DHAKA_TIMEZONE,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

/** Current date in Dhaka as YYYY-MM-DD. */
export function dhakaDateString(date: Date = new Date()): string {
  return dhakaDateFormatter.format(date);
}

/** Current date in Dhaka as YYMMDD (used in order numbers). */
export function dhakaStamp(date: Date = new Date()): string {
  return dhakaDateString(date).slice(2).replace(/-/g, "");
}

/** Add a number of whole days to a YYYY-MM-DD string (calendar-safe). */
export function addDateDays(dateStr: string, days: number): string {
  const [y, m, d] = dateStr.split("-").map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d));
  dt.setUTCDate(dt.getUTCDate() + days);
  return dt.toISOString().slice(0, 10);
}

/** Dhaka today + offset days as YYYY-MM-DD. */
export function dhakaDatePlus(days: number, from: Date = new Date()): string {
  return addDateDays(dhakaDateString(from), days);
}

/** Parse a YYYY-MM-DD calendar date as UTC midnight (comparison-safe). */
export function dateOnlyUtc(dateStr: string): number | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) return null;
  const [y, m, d] = dateStr.split("-").map(Number);
  const t = Date.UTC(y, m - 1, d);
  const check = new Date(t);
  if (check.getUTCFullYear() !== y || check.getUTCMonth() !== m - 1 || check.getUTCDate() !== d) {
    return null;
  }
  return t;
}

/* ---------------- random / ids ---------------- */

const ORDER_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

function secureRandomString(length: number, alphabet: string): string {
  const cryptoObj = globalThis.crypto;
  if (cryptoObj?.getRandomValues) {
    const bytes = new Uint8Array(length);
    cryptoObj.getRandomValues(bytes);
    let out = "";
    for (let i = 0; i < length; i++) out += alphabet[bytes[i] % alphabet.length];
    return out;
  }
  let out = "";
  for (let i = 0; i < length; i++) {
    out += alphabet[Math.floor(Math.random() * alphabet.length)];
  }
  return out;
}

/** Human-friendly but unguessable: SC-YYMMDD-XXXXXXXX (8 crypto chars). */
export function generateOrderNo(date: Date = new Date()): string {
  return `SC-${dhakaStamp(date)}-${secureRandomString(8, ORDER_ALPHABET)}`;
}

export const ORDER_NO_RE = /^SC-\d{6}-[A-Z0-9]{6,16}$/i;

export function generateCode(len = 8): string {
  return secureRandomString(len, ORDER_ALPHABET);
}

export function uid(prefix = "id"): string {
  return `${prefix}_${Date.now().toString(36)}${secureRandomString(8, ORDER_ALPHABET).toLowerCase()}`;
}

/* ---------------- dates ---------------- */

export function formatDate(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString("en-BD", {
      day: "numeric",
      month: "short",
      year: "numeric",
      timeZone: DHAKA_TIMEZONE,
    });
  } catch {
    return iso;
  }
}

export function formatDateTime(iso: string): string {
  try {
    return new Date(iso).toLocaleString("en-BD", {
      day: "numeric",
      month: "short",
      year: "numeric",
      hour: "numeric",
      minute: "2-digit",
      timeZone: DHAKA_TIMEZONE,
    });
  } catch {
    return iso;
  }
}

/* ---------------- phone helpers ---------------- */

/** Only digits from a phone number (for WhatsApp deep links). */
export function phoneDigits(phone: string): string {
  return phone.replace(/\D/g, "");
}

/** Last 10 digits — stable key for Bangladeshi numbers. */
export function phoneKey(phone: string): string {
  return phoneDigits(phone).slice(-10);
}

/** Normalise any local number to international format without '+'. */
export function toE164(phone: string): string {
  let p = phoneDigits(phone);
  if (p.startsWith("00")) p = p.slice(2);
  if (p.startsWith("0")) p = "88" + p;
  return p;
}

export function waLink(phone: string, message: string): string {
  let p = phoneDigits(phone);
  if (p.startsWith("00")) p = p.slice(2);
  if (p.startsWith("0")) p = "88" + p;
  return `https://wa.me/${p}?text=${encodeURIComponent(message)}`;
}

export function orderStatusMessage(orderNo: string, status: string, store = "Super Cake"): string {
  const map: Record<string, string> = {
    pending: `আপনার অর্ডার (${orderNo}) পেয়েছি। শীঘ্রই নিশ্চিত করবো। 🎂`,
    confirmed: `আপনার অর্ডার (${orderNo}) নিশ্চিত হয়েছে ✅ আমরা তৈরি শুরু করছি।`,
    baking: `আপনার কেক (${orderNo}) এখন তৈরি হচ্ছে 🍰`,
    out_for_delivery: `আপনার কেক (${orderNo}) ডেলিভারির পথে 🚗`,
    delivered: `আপনার কেক (${orderNo}) পৌঁছে গেছে 🎉 খুশির মুহূর্ত উপভোগ করুন!`,
    completed: `অর্ডার (${orderNo}) সম্পন্ন 🌟 আপনার রিভিউ দিতে ভুলবেন না!`,
    cancelled: `দুঃখিত, অর্ডার (${orderNo}) বাতিল করা হয়েছে।`,
  };
  return `${store}: ${map[status] ?? status}`;
}
