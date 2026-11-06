import { MIN_DELIVERY_LEAD_DAYS, OCCASIONS, ORDER_STATUS_META, SITE } from "@/lib/constants";
import { getStore } from "@/lib/store";
import type { Cake, CakeSize, Order, Settings } from "@/lib/types";
import { dhakaDatePlus, formatBDT, orderStatusHeadline, phoneDigits, waLink } from "@/lib/utils";
import { BUTTON_COMMANDS, MENU_BUTTONS, type WsButton } from "@/lib/whatsapp-menu";
import { markPhoneOptedOut, markPhoneSubscribed } from "./log";
import { markCartOptIn } from "./cart";
import {
  CANCEL_CONFIRM_ID,
  encodeConfirmId,
  parseOrderRequest,
  splitOrderRequest,
} from "./order-request";

export { BUTTON_COMMANDS, MENU_BUTTONS };
export type { WsButton };

export interface AutoReplyInput {
  text: string;
  from: string;
}

export interface AutoReply {
  /** Sent as the body of the interactive message when buttons are present. */
  text: string;
  /**
   * Plain-text variant used when Meta rejects the interactive message (for
   * example when the 24-hour window has just closed). Always complete on its
   * own so the menu survives a fallback.
   */
  fallbackText?: string;
  buttons?: WsButton[];
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

/**
 * Word-boundary-ish match for menu keywords.
 *
 * Exact equality was too strict: "1." or "order status দেখাও" or
 * "contact করতে চাই" all fell through to "Bujhte parini". Requiring the
 * keyword to be whitespace-delimited keeps "status" out of unrelated words
 * while still catching those natural phrasings.
 */
function has(lower: string, words: string[]): boolean {
  return words.some(
    (w) =>
      lower === w ||
      lower.startsWith(`${w} `) ||
      lower.endsWith(` ${w}`) ||
      lower.includes(` ${w} `),
  );
}

function menuBody(storeName: string): string {
  return [
    `*${storeName} — স্বাগতম*`,
    "",
    "নিচের যেকোনো একটি বিষয় বেছে নিন:",
  ].join("\n");
}

function menuFallback(storeName: string): string {
  return [
    `*${storeName} — স্বাগতম*`,
    "",
    "1. অর্ডার স্ট্যাটাস",
    "2. কেক দেখুন",
    "3. যোগাযোগ",
    "",
    "অর্ডার নম্বর (SC-...) পাঠালে স্ট্যাটাস জানতে পারবেন।",
  ].join("\n");
}

const PAYMENT_BN: Record<string, string> = {
  paid: "পরিশোধিত",
  pending_verify: "যাচাই বাকি",
  unpaid: "বাকি",
  refunded: "ফেরত দেওয়া হয়েছে",
};

const SLOT_LABEL: Record<string, string> = {
  morning: "সকাল",
  afternoon: "দুপুর",
  evening: "বিকাল",
  night: "রাত",
};

const OCCASION_BN: Record<string, string> = Object.fromEntries(
  OCCASIONS.map((o) => [o.value, o.bn]),
);

/** Bare menu commands — never worth running the free-text cake lookup on. */
const MENU_KEYWORDS = new Set([
  "1",
  "2",
  "3",
  "4",
  "status",
  "order status",
  "cakes",
  "cake",
  "menu",
  "কেক",
  "contact",
  "help",
  "support",
  "যোগাযোগ",
  "অর্ডারস্ট্যাটাস",
  "অর্ডার স্ট্যাটাস",
]);

/** Words too generic to identify a cake by. */
const LOOKUP_STOP_WORDS = new Set(["cake", "cakes", "কেক", "the", "and", "for", "with"]);

function orderReply(order: Order, settings: Settings): string {
  const status = ORDER_STATUS_META[order.order_status]?.bn ?? order.order_status;
  const items = order.items
    .slice(0, 5)
    .map((i) => `• ${i.name} ×${i.quantity}${i.weight ? ` (${i.weight} lb)` : ""}`);
  const extra = order.items.length - 5;
  if (extra > 0) items.push(`… আরও ${extra} টি`);

  const delivery = [
    order.delivery_date,
    order.delivery_slot ? `(${SLOT_LABEL[order.delivery_slot] ?? order.delivery_slot})` : null,
  ]
    .filter(Boolean)
    .join(" ");

  return [
    `*${settings.store_name} — অর্ডার ${order.order_no}*`,
    "",
    `*স্ট্যাটাস:* ${status}`,
    `*পেমেন্ট:* ${PAYMENT_BN[order.payment_status] ?? order.payment_status}`,
    `*মোট:* ${formatBDT(order.total)}`,
    "",
    "*আইটেম:*",
    ...items,
    "",
    `*ডেলিভারি:* ${delivery}`,
    `*ট্র্যাক করুন:* ${SITE.url}/track`,
    "",
    orderStatusHeadline(order.order_no, order.order_status),
  ].join("\n");
}

function contactReply(settings: Settings): string {
  return [
    `*${settings.store_name}*`,
    "",
    `*ফোন:* ${settings.phone}`,
    `*হোয়াটসঅ্যাপ:* ${settings.whatsapp_phone}`,
    `*ইমেইল:* ${settings.email}`,
    `*ঠিকানা:* ${settings.address}`,
    "",
    `*অনলাইন চ্যাট:* ${waLink(settings.whatsapp_phone, "Assalamu alaikum")}`,
  ].join("\n");
}

/* ---------------- free-text cake lookup ---------------- */

/**
 * Resolve a free-text query to a catalog cake: exact name → slug →
 * name-contains → query-contains-name → word overlap. Longest names win on
 * the reverse match so "chocolate truffle premium" finds the premium cake
 * rather than a shorter one that also contains "chocolate".
 */
function findCake(cakes: Cake[], query: string): Cake | null {
  const q = query.toLowerCase().trim().replace(/\s+/g, " ");
  if (q.length < 2) return null;
  const norm = (s: string) => s.toLowerCase().trim().replace(/\s+/g, " ");

  const exact = cakes.find((c) => norm(c.name) === q || c.slug === q);
  if (exact) return exact;

  const contains = cakes.find((c) => norm(c.name).includes(q));
  if (contains) return contains;

  const reverse = [...cakes]
    .sort((a, b) => b.name.length - a.name.length)
    .find((c) => q.includes(norm(c.name)));
  if (reverse) return reverse;

  const words = q.split(" ").filter((w) => w.length >= 3 && !LOOKUP_STOP_WORDS.has(w));
  if (!words.length) return null;
  // Rank by how many query words the name contains, so "chocolate truffle
  // delight" beats a cake that merely shares the word "chocolate".
  let best: Cake | null = null;
  let bestScore = 0;
  for (const c of cakes) {
    const name = norm(c.name);
    const score = words.reduce((n, w) => (name.includes(w) ? n + 1 : n), 0);
    if (score > bestScore) {
      best = c;
      bestScore = score;
    }
  }
  return best;
}

/** Professional details card for a matched cake. */
function cakeDetailsReply(cake: Cake): string {
  const sizes = (cake.sizes ?? []).filter((s) => s.is_available);
  const sizeLines = sizes.length
    ? ["*সাইজ ও দাম:*", ...sizes.map((s) => `• ${s.weight} lb — ${formatBDT(s.price)}`)]
    : [`*দাম:* ${formatBDT(cake.base_price)}`];

  return [
    `*${cake.name}*`,
    cake.description ? cake.description.slice(0, 280) : "",
    "",
    `*ফ্লেভার:* ${cake.flavor}`,
    `*ক্যাটাগরি:* ${cake.category}`,
    ...sizeLines,
    `*স্টক:* ${cake.stock > 0 ? `${cake.stock}টি আছে` : "স্টকে নেই"}`,
    "",
    `*অর্ডার করুন:* order ${cake.name} 1`,
    `*বিস্তারিত দেখুন:* ${SITE.url}/cakes/${cake.slug}`,
  ].join("\n");
}

/** No (or no matching) cake: suggest what the shop actually has. */
function orderSuggestionsReply(
  query: string,
  settings: Settings,
  cakes: Cake[],
): AutoReply {
  const top = cakes
    .filter((c) => c.stock > 0)
    .sort((a, b) => Number(b.is_featured) - Number(a.is_featured))
    .slice(0, 3);

  const body = [
    query ? `"${query}" নামে কোনো কেক পাওয়া যায়নি।` : null,
    top.length ? "*এগুলো হতে পারে:*" : null,
    ...top.map((c) => `• ${c.name} — ${formatBDT(c.base_price)}`),
    "",
    `*সব কেক দেখুন:* ${SITE.url}/cakes`,
    '*অর্ডার করুন:* "order কেকের নাম" লিখুন — উদাহরণ: order Chocolate Truffle 2',
  ]
    .filter(Boolean)
    .join("\n");

  return {
    text: body,
    fallbackText: body,
    buttons: MENU_BUTTONS,
  };
}

/* ---------------- free-text order request ---------------- */

/**
 * `order <cake> <qty> <occasion> <size> <date>` → a review prompt with
 * confirm / cancel buttons. Nothing is written to the store until the
 * customer taps confirm (handled by `whatsapp/order.ts`).
 */
async function buildOrderRequestReply(rest: string, settings: Settings): Promise<AutoReply> {
  const store = getStore();
  const req = parseOrderRequest(rest);

  const cakes = (await store.listCakes()).filter((c) => c.is_active);
  const cake = findCake(cakes, req.cakeQuery);
  if (!cake) return orderSuggestionsReply(req.cakeQuery, settings, cakes);

  if (cake.stock < 1) {
    return {
      text: `দুঃখিত, "${cake.name}" এখন স্টকে নেই। অন্য কেক দেখুন: ${SITE.url}/cakes`,
    };
  }
  if (cake.stock < req.quantity) {
    return {
      text: `"${cake.name}" স্টকে মাত্র ${cake.stock}টি আছে। পরিমাণ কমিয়ে আবার লিখুন — উদাহরণ: order ${cake.name} ${cake.stock}`,
    };
  }

  const sizes: CakeSize[] = (cake.sizes ?? []).filter((s) => s.is_available);
  let size: CakeSize | undefined;
  if (req.weight != null && sizes.length) {
    size = sizes.find((s) => s.weight === req.weight);
    if (!size) {
      return {
        text: `দুঃখিত, "${cake.name}"-এর ${req.weight} lb সাইজটি পাওয়া যায়নি।\n\n*পাওয়া যায়:*\n${sizes
          .map((s) => `• ${s.weight} lb — ${formatBDT(s.price)}`)
          .join("\n")}`,
      };
    }
  }

  const today = dhakaDatePlus(0);
  if (req.deliveryDate && req.deliveryDate < today) {
    return { text: `তারিখটি অতীতে পড়ছে (${req.deliveryDate})। আজ বা পরের তারিখ দিন।` };
  }

  const unitPrice = size?.price ?? cake.base_price;
  const weight = size?.weight;
  const quantity = req.quantity;
  const deliveryDate = req.deliveryDate ?? dhakaDatePlus(MIN_DELIVERY_LEAD_DAYS);
  const subtotal = unitPrice * quantity;
  const deliveryCharge =
    settings.free_delivery_enabled && subtotal >= settings.free_delivery_min
      ? 0
      : settings.delivery_charge;
  const total = subtotal + deliveryCharge;

  const lines = [
    "*অর্ডার যাচাই করুন*",
    "",
    `*কেক:* ${cake.name}`,
    `*পরিমাণ:* ${quantity}টি`,
    weight != null ? `*সাইজ:* ${weight} lb` : null,
    `*অনুষ্ঠান:* ${OCCASION_BN[req.occasion] ?? req.occasion}`,
    `*ডেলিভারি:* ${deliveryDate}${req.slot ? ` · ${SLOT_LABEL[req.slot] ?? req.slot}` : ""}`,
    `*মোট:* ${formatBDT(total)}${
      deliveryCharge > 0 ? ` (ডেলিভারি চার্জ ৳${deliveryCharge}সহ)` : " (ফ্রি ডেলিভারি)"
    }`,
    "*পেমেন্ট:* ক্যাশ অন ডেলিভারি",
    "",
    "নিশ্চিত করতে বাটনে চাপ দিন।",
  ].filter((l): l is string => l != null);

  const body = lines.join("\n");
  return {
    text: body,
    fallbackText: body,
    buttons: [
      {
        id: encodeConfirmId({
          cakeId: cake.id,
          quantity,
          weight,
          occasion: req.occasion,
          deliveryDate,
          slot: req.slot,
        }),
        title: "অর্ডার নিশ্চিত করুন",
      },
      { id: CANCEL_CONFIRM_ID, title: "বাতিল করুন" },
    ],
  };
}

/**
 * Build a helpful auto-reply for an incoming WhatsApp message.
 * Free-form replies are allowed because the customer just messaged us
 * (the 24-hour customer-service window is open).
 */
export async function buildAutoReply({ text, from }: AutoReplyInput): Promise<AutoReply> {
  const raw = text.trim();
  const lower = raw.toLowerCase();
  const store = getStore();

  const plain = (body: string): AutoReply => ({ text: body });

  try {
    const settings = await store.getSettings();

    /* ---------- opt-out / opt-in ---------- */
    if (OPT_OUT_WORDS.some((word) => lower === word || lower.startsWith(`${word} `))) {
      await markPhoneOptedOut(from, "customer requested on WhatsApp");
      return plain(
        "আপনাকে WhatsApp reminder list থেকে সরিয়ে নেওয়া হয়েছে। আবার চাইলে 'start' লিখুন।",
      );
    }
    if (OPT_IN_WORDS.some((word) => lower === word)) {
      await markPhoneSubscribed(from);
      await markCartOptIn(from);
      return plain("আপনি আবার WhatsApp update পাবেন। ধন্যবাদ!");
    }

    /* ---------- order number (SC-YYMMDD-XXXXXXXX) ---------- */
    const orderNoMatch = raw.match(/SC-\d{6}-[A-Z0-9]{6,16}/i);
    if (orderNoMatch) {
      const orderNo = orderNoMatch[0].toUpperCase();
      const order = await store.getOrderByNo(orderNo);
      if (!order || !samePhone(order.phone, from)) {
        return plain(
          `অর্ডার ${orderNo}-এর তথ্য দেখাতে পারছি না। অর্ডার নম্বরটি আবার যাচাই করুন, অথবা যে WhatsApp নম্বর দিয়ে অর্ডার করেছিলেন সেই নম্বর থেকে মেসেজ দিন।`,
        );
      }
      return plain(orderReply(order, settings));
    }

    /* ---------- phone number lookup ---------- */
    const digits = phoneDigits(raw);
    const looksLikePhone =
      /^[0-9+\-\s()]+$/.test(raw) && digits.length >= 10 && digits.length <= 13;
    if (looksLikePhone) {
      if (!samePhone(digits, from)) {
        return plain(
          "নিরাপত্তার জন্য শুধু আপনার নিজের WhatsApp নম্বরের অর্ডার দেখানো যাবে। Order number (SC-...) পাঠালেও status দেখতে পারবেন।",
        );
      }
      const orders = await store.listOrdersByPhone(from);
      if (!orders.length) {
        return plain(
          `এই নম্বরে (${raw}) কোনো অর্ডার পাওয়া যায়নি। অর্ডার নম্বর (SC-...) পাঠান।`,
        );
      }
      return plain(orderReply(orders[0], settings));
    }

    /* ---------- greeting → interactive menu ---------- */
    if (has(lower, GREETINGS)) {
      return {
        text: menuBody(settings.store_name),
        fallbackText: menuFallback(settings.store_name),
        buttons: MENU_BUTTONS,
      };
    }

    // Numeric menu commands are matched exactly — `has()`'s word-boundary
    // rules would swallow a quantity like "order … 1 …" as command "1".
    if (
      lower === "1" ||
      has(lower, ["status", "order status", "অর্ডার স্ট্যাটাস"])
    ) {
      const orders = await store.listOrdersByPhone(from);
      if (orders.length) return plain(orderReply(orders[0], settings));
      return plain(
        "অর্ডার নম্বরটি পাঠান (উদাহরণ: SC-261026-8H4KQ2PZ)।",
      );
    }

    /* ---------- courtesy ---------- */
    if (has(lower, ["thanks", "thank you", "dhonnobad", "ধন্যবাদ", "ok", "okay"])) {
      return {
        text: "স্বাগতম! আরও কিছু জানতে চাইলে নিচের যেকোনো একটি বিষয় বেছে নিন।",
        fallbackText: menuFallback(settings.store_name),
        buttons: MENU_BUTTONS,
      };
    }

    /* ---------- free-text order request: "order <cake> <qty> …" ---------- */
    const orderRest = splitOrderRequest(raw);
    if (orderRest !== null) {
      return await buildOrderRequestReply(orderRest, settings);
    }

    /* ---------- cake-name lookup → details ---------- */
    if (!MENU_KEYWORDS.has(lower)) {
      const cakes = (await store.listCakes()).filter((c) => c.is_active);
      const cake = findCake(cakes, lower);
      if (cake) return plain(cakeDetailsReply(cake));
    }

    if (lower === "2" || has(lower, ["cakes", "cake", "menu", "কেক"])) {
      return plain(
        [
          `*আমাদের কেকগুলো দেখুন:* ${SITE.url}/cakes`,
          `*কাস্টম কেক অর্ডার:* ${SITE.url}/custom-order`,
          "",
          "কোনো কেকের বিস্তারিত জানতে চাইলে কেকের নাম লিখে পাঠান।",
        ].join("\n"),
      );
    }

    if (lower === "3" || has(lower, ["contact", "help", "support", "যোগাযোগ"])) {
      return plain(contactReply(settings));
    }

    if (lower === "4" || has(lower, ["how to order", "order korbo", "অর্ডার করব"])) {
      return {
        text: [
          "*অর্ডার করার নিয়ম* — খুবই সহজ।",
          "কেকের নাম, পরিমাণ ও প্রয়োজনীয় তথ্য লিখে পাঠান।",
          "",
          "*উদাহরণ:*",
          "• order Chocolate Truffle 2 birthday",
          "• অর্ডার চকলেট ট্রাফল ২টি জন্মদিন",
          "",
          "এরপর আমরা মূল্যসহ বিস্তারিত দেখিয়ে অর্ডারটি কনফার্ম করে দেব।",
        ].join("\n"),
        fallbackText: menuFallback(settings.store_name),
        buttons: MENU_BUTTONS,
      };
    }

    /* ---------- free text we couldn't place → suggest real cakes ---------- */
    if (!MENU_KEYWORDS.has(lower) && raw.length >= 3) {
      const cakes = (await store.listCakes()).filter((c) => c.is_active);
      return orderSuggestionsReply(raw, settings, cakes);
    }

    return {
      text: [
        "*বুঝতে পারিনি।*",
        "",
        "নিচের যেকোনো একটি বিষয় বেছে নিন:",
      ].join("\n"),
      fallbackText: [
        "*বুঝতে পারিনি।*",
        "",
        "1. অর্ডার স্ট্যাটাস",
        "2. কেক",
        "4. অর্ডার করুন",
        "",
        "অথবা অর্ডার নম্বর (SC-...) পাঠান।",
      ].join("\n"),
      buttons: MENU_BUTTONS,
    };
  } catch (e) {
    console.error("[whatsapp auto-reply]", e);
    return plain(
      "এই মুহূর্তে উত্তর দিতে সমস্যা হচ্ছে। একটু পরে আবার চেষ্টা করুন, অথবা আমাদের ফোনে যোগাযোগ করুন।",
    );
  }
}
