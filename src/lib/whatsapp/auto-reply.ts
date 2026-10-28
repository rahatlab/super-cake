import { ORDER_STATUS_META, SITE } from "@/lib/constants";
import { getStore } from "@/lib/store";
import type { Order, Settings } from "@/lib/types";
import { formatBDT, phoneDigits, waLink } from "@/lib/utils";
import { markPhoneOptedOut, markPhoneSubscribed } from "./log";
import { markCartOptIn } from "./cart";

export interface AutoReplyInput {
  text: string;
  from: string;
}

const GREETINGS = [
  "hi",
  "hello",
  "hey",
  "salam",
  "assalamu alaikum",
  "আসসালামু আলাইকুম",
  "হ্যালো",
  "সালাম",
];

const OPT_OUT_WORDS = ["stop", "unsubscribe", "band", "bondho", "বন্ধ"];
const OPT_IN_WORDS = ["start", "subscribe", "চালু"];

/** Compare the last 10 digits so +8801…, 8801… and 01… all match. */
function samePhone(a: string, b: string): boolean {
  const da = phoneDigits(a);
  const db = phoneDigits(b);
  return da.length >= 10 && db.length >= 10 && da.slice(-10) === db.slice(-10);
}

function menuText(storeName: string): string {
  return [
    `${storeName} e swagatam! 🎂`,
    "",
    "1️⃣ Order status",
    "2️⃣ Cakes dekhte",
    "3️⃣ Contact",
    "",
    "Order number (SC-...) pathale status jante parben.",
  ].join("\n");
}

function orderReply(order: Order, settings: Settings): string {
  const status = ORDER_STATUS_META[order.order_status]?.bn ?? order.order_status;
  const payment =
    order.payment_status === "paid"
      ? "Paid ✅"
      : order.payment_status === "pending_verify"
        ? "Verify hocche"
        : order.payment_status === "refunded"
          ? "Refunded"
          : "Unpaid";

  return [
    `${settings.store_name} — Order ${order.order_no}`,
    `Status: ${status}`,
    `Payment: ${payment}`,
    `Total: ${formatBDT(order.total)}`,
    `Delivery: ${order.delivery_date}${order.delivery_slot ? ` (${order.delivery_slot})` : ""}`,
    `Track: ${SITE.url}/track`,
  ].join("\n");
}

function contactReply(settings: Settings): string {
  return [
    `${settings.store_name}`,
    `Phone: ${settings.phone}`,
    `WhatsApp: ${settings.whatsapp_phone}`,
    `Email: ${settings.email}`,
    `Address: ${settings.address}`,
    `Chat: ${waLink(settings.whatsapp_phone, "Assalamu alaikum")}`,
  ].join("\n");
}

/**
 * Build a helpful auto-reply for an incoming WhatsApp message.
 * Free-form replies are allowed because the customer just messaged us
 * (the 24-hour customer-service window is open).
 */
export async function buildAutoReply({ text, from }: AutoReplyInput): Promise<string> {
  const raw = text.trim();
  const lower = raw.toLowerCase();
  const store = getStore();

  try {
    const settings = await store.getSettings();

    /* ---------- opt-out / opt-in ---------- */
    if (OPT_OUT_WORDS.some((word) => lower === word || lower.startsWith(`${word} `))) {
      await markPhoneOptedOut(from, "customer requested on WhatsApp");
      return "আপনাকে WhatsApp reminder list থেকে সরিয়ে নেওয়া হয়েছে। আবার চাইলে 'start' লিখুন।";
    }
    if (OPT_IN_WORDS.some((word) => lower === word)) {
      await markPhoneSubscribed(from);
      await markCartOptIn(from);
      return "আপনি আবার WhatsApp update পাবেন। ধন্যবাদ! 🎂";
    }

    /* ---------- order number (SC-YYMMDD-XXXXXXXX) ---------- */
    const orderNoMatch = raw.match(/SC-\d{6}-[A-Z0-9]{6,16}/i);
    if (orderNoMatch) {
      const orderNo = orderNoMatch[0].toUpperCase();
      const order = await store.getOrderByNo(orderNo);
      if (!order || !samePhone(order.phone, from)) {
        return `Order ${orderNo} এর তথ্য দেখাতে পারছি না। Order number ta check করুন, অথবা যে WhatsApp নম্বর দিয়ে অর্ডার করেছিলেন সেখান থেকে মেসেজ দিন।`;
      }
      return orderReply(order, settings);
    }

    /* ---------- phone number lookup ---------- */
    const digits = phoneDigits(raw);
    const looksLikePhone = /^[0-9+\-\s()]+$/.test(raw) && digits.length >= 10 && digits.length <= 13;
    if (looksLikePhone) {
      if (!samePhone(digits, from)) {
        return "নিরাপত্তার জন্য শুধু আপনার নিজের WhatsApp নম্বরের অর্ডার দেখানো যাবে। Order number (SC-...) পাঠালেও status দেখতে পারবেন।";
      }
      const orders = await store.listOrdersByPhone(from);
      if (!orders.length) {
        return `এই নম্বরে (${raw}) কোনো অর্ডার পাওয়া যায়নি। Order number (SC-...) pathan.`;
      }
      return orderReply(orders[0], settings);
    }

    /* ---------- greeting / menu ---------- */
    if (GREETINGS.some((word) => lower === word || lower.startsWith(`${word} `))) {
      return menuText(settings.store_name);
    }

    if (["1", "status", "order status", "অর্ডার স্ট্যাটাস"].some((word) => lower === word)) {
      const orders = await store.listOrdersByPhone(from);
      if (orders.length) return orderReply(orders[0], settings);
      return "Order number ta pathan (example: SC-261026-8H4KQ2PZ).";
    }

    if (["2", "cakes", "cake", "menu", "কেক"].some((word) => lower === word)) {
      return [
        `Amader cakes: ${SITE.url}/cakes`,
        `Custom cake: ${SITE.url}/custom-order`,
        "",
        "Kono cake er details jante chaile name ta pathan.",
      ].join("\n");
    }

    if (["3", "contact", "help", "support", "যোগাযোগ"].some((word) => lower === word)) {
      return contactReply(settings);
    }

    return [
      "Bujhte parini 😅",
      "",
      "1️⃣ Order status",
      "2️⃣ Cakes",
      "3️⃣ Contact",
      "",
      "Ba order number (SC-...) pathan.",
    ].join("\n");
  } catch (e) {
    console.error("[whatsapp auto-reply]", e);
    return "Ekhon reply dite problem hocche. Ektu pore abar chesta korun, ba amader phone e call din.";
  }
}
