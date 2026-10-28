import type { Occasion, OrderStatus, Settings } from "./types";

export const SITE = {
  name: "Super Cake",
  tagline: "Custom Cakes for Every Celebration",
  url: process.env.NEXT_PUBLIC_SITE_URL || "https://supercake.example.com",
  description:
    "Super Cake — custom cakes for birthday, anniversary, occasion & gifts. Order fresh cakes online with cash on delivery or bKash payment in Bangladesh.",
  locale: "bn_BD",
};

export const OCCASIONS: { value: Occasion; label: string; bn: string; emoji: string; hint: string }[] = [
  { value: "birthday", label: "Birthday", bn: "জন্মদিন", emoji: "🎂", hint: "Happy Birthday cakes" },
  { value: "anniversary", label: "Anniversary", bn: "বার্ষিকী", emoji: "💍", hint: "Romantic anniversary cakes" },
  { value: "occasion", label: "Occasion", bn: "অনুষ্ঠান", emoji: "🎉", hint: "Eid, success, milestones" },
  { value: "gift", label: "Gift", bn: "উপহার", emoji: "🎁", hint: "Surprise someone special" },
  { value: "others", label: "Others", bn: "অন্যান্য", emoji: "✨", hint: "Anything else" },
];

export const ORDER_STATUS_META: Record<
  OrderStatus,
  { label: string; bn: string; color: string; step: number }
> = {
  pending: { label: "Pending", bn: "অপেক্ষমাণ", color: "bg-amber-500/15 text-amber-600 dark:text-amber-400", step: 1 },
  confirmed: { label: "Confirmed", bn: "নিশ্চিত", color: "bg-blue-500/15 text-blue-600 dark:text-blue-400", step: 2 },
  baking: { label: "Baking", bn: "তৈরি হচ্ছে", color: "bg-violet-500/15 text-violet-600 dark:text-violet-400", step: 3 },
  out_for_delivery: { label: "Out for Delivery", bn: "পাঠানো হয়েছে", color: "bg-cyan-500/15 text-cyan-600 dark:text-cyan-400", step: 4 },
  delivered: { label: "Delivered", bn: "পৌঁছেছে", color: "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400", step: 5 },
  completed: { label: "Completed", bn: "সম্পন্ন", color: "bg-emerald-600/15 text-emerald-700 dark:text-emerald-400", step: 5 },
  cancelled: { label: "Cancelled", bn: "বাতিল", color: "bg-rose-500/15 text-rose-600 dark:text-rose-400", step: 0 },
};

export const ORDER_STATUS_FLOW: OrderStatus[] = [
  "pending",
  "confirmed",
  "baking",
  "out_for_delivery",
  "delivered",
  "completed",
];

export const WEIGHTS = [0.5, 1, 2, 3] as const;

export const WEIGHT_LABEL: Record<number, string> = {
  0.5: "½ Pound",
  1: "1 Pound",
  2: "2 Pounds",
  3: "3 Pounds",
};

/** Minimum calendar days between order placement and delivery (Dhaka). */
export const MIN_DELIVERY_LEAD_DAYS = 2;

export const DELIVERY_SLOTS = [
  { value: "morning", label: "Morning (9am – 12pm)" },
  { value: "afternoon", label: "Afternoon (12pm – 4pm)" },
  { value: "evening", label: "Evening (4pm – 8pm)" },
  { value: "night", label: "Night (8pm – 10pm)" },
];

export const CATEGORIES = [
  "Chocolate",
  "Vanilla",
  "Red Velvet",
  "Black Forest",
  "Fruit",
  "Cheesecake",
  "Custom",
];

export const FLAVORS = [
  "Chocolate Truffle",
  "Vanilla Cream",
  "Red Velvet",
  "Butterscotch",
  "Oreo",
  "Strawberry",
  "Pineapple",
  "Mango",
];

export const DEFAULT_SETTINGS: Settings = {
  store_name: "Super Cake",
  tagline: "Custom Cakes for Every Celebration",
  phone: "+880 1700-000000",
  whatsapp_phone: "8801700000000",
  email: "hello@supercake.com",
  address: "Dhaka, Bangladesh",
  bkash_number: "01700-000000",
  delivery_charge: 80,
  free_delivery_min: 2000,
  free_delivery_enabled: false,
  cod_enabled: true,
  bkash_enabled: true,
};

/** WhatsApp Cloud API (Meta) — configured via env */
export const WHATSAPP = {
  token: process.env.WHATSAPP_TOKEN || "",
  phoneId: process.env.WHATSAPP_PHONE_ID || "",
  from: process.env.WHATSAPP_FROM_NUMBER || "",
  wabaId: process.env.WHATSAPP_WABA_ID || "",
  verifyToken: process.env.WHATSAPP_VERIFY_TOKEN || "",
  appSecret: process.env.WHATSAPP_APP_SECRET || "",
  templatesEnabled: process.env.WHATSAPP_TEMPLATES_ENABLED === "true",
  templateLang: process.env.WHATSAPP_TEMPLATE_LANG || "bn",
  automationEnabled: process.env.WHATSAPP_AUTOMATION_ENABLED !== "false",
  cronSecret: process.env.CRON_SECRET || "",
};

/** Names must match the templates approved in Meta WhatsApp Manager. */
export const WHATSAPP_TEMPLATES = {
  orderConfirmation: "order_confirmation",
  orderStatusUpdate: "order_status_update",
  newOrderAdmin: "new_order_admin",
  orderReviewRequest: "order_review_request",
  abandonedCart: "abandoned_cart",
} as const;
