import { MIN_DELIVERY_LEAD_DAYS, SITE } from "@/lib/constants";
import { getStore } from "@/lib/store";
import { getCachedSettings } from "@/lib/store/cache";
import type { Cake, Order, OrderItem } from "@/lib/types";
import { dhakaDatePlus, formatBDT } from "@/lib/utils";
import { notifyAdminNewOrder, notifyOrderConfirmation } from "@/lib/whatsapp";
import type { AutoReply } from "./auto-reply";
import { decodeConfirmId, type OrderOccasion } from "./order-request";

const VALID_OCCASIONS: OrderOccasion[] = [
  "birthday",
  "anniversary",
  "occasion",
  "gift",
  "others",
];

/** Fallback when a size row disappeared between prompt and confirm. */
function priceFor(cake: Cake, weight?: number): { unitPrice: number; weight?: number } {
  const sizes = (cake.sizes ?? []).filter((s) => s.is_available);
  if (weight != null && sizes.length) {
    const size = sizes.find((s) => s.weight === weight);
    if (size) return { unitPrice: size.price, weight: size.weight };
    return { unitPrice: cake.base_price };
  }
  return { unitPrice: cake.base_price, weight: sizes[0]?.weight };
}

/**
 * Handle an order confirm/cancel button press (`oc:…` button ids).
 *
 * Stateless by design: everything needed to place the order lives in the
 * button id, so a Meta retry or a second tap is caught by the idempotency
 * key derived from the inbound message id.
 *
 * Returns the reply to send, or `null` when the id is not an order button.
 */
export async function handleOrderConfirm(input: {
  id: string;
  from: string;
  metaMessageId?: string;
}): Promise<AutoReply | null> {
  const decoded = decodeConfirmId(input.id);
  if (!decoded) return null;

  const store = getStore();
  const settings = await getCachedSettings();

  if (decoded.action === "cancel") {
    return {
      text: "ঠিক আছে, অর্ডারটি বাতিল করা হয়েছে। পরে আবার চাইলে কেকের নাম লিখে অর্ডার করতে পারবেন।",
    };
  }

  const p = decoded.payload;
  const cake = await store.getCakeById(p.cakeId);
  if (!cake || !cake.is_active) {
    return { text: `দুঃখিত, এই কেকটি আর পাওয়া যাচ্ছে না। অন্য কেক দেখুন: ${SITE.url}/cakes` };
  }
  if (cake.stock < p.quantity) {
    return {
      text:
        cake.stock < 1
          ? `দুঃখিত, "${cake.name}" এখন স্টকে নেই। অন্য কেক দেখুন।`
          : `"${cake.name}" স্টকে মাত্র ${cake.stock}টি আছে। পরিমাণ কমিয়ে আবার অর্ডার করুন।`,
    };
  }

  const { unitPrice, weight } = priceFor(cake, p.weight);
  const quantity = p.quantity;
  // The prompt may have been tapped a day late — never ship a past date.
  const today = dhakaDatePlus(0);
  const deliveryDate =
    p.deliveryDate < today ? dhakaDatePlus(MIN_DELIVERY_LEAD_DAYS) : p.deliveryDate;
  const occasion: OrderOccasion = VALID_OCCASIONS.includes(p.occasion)
    ? p.occasion
    : "others";

  const subtotal = unitPrice * quantity;
  const deliveryCharge =
    settings.free_delivery_enabled && subtotal >= settings.free_delivery_min
      ? 0
      : settings.delivery_charge;
  const total = subtotal + deliveryCharge;

  const orderItems: OrderItem[] = [
    {
      cake_id: cake.id,
      name: cake.name,
      slug: cake.slug,
      image: cake.image_urls?.[0],
      weight,
      unit_price: unitPrice,
      quantity,
    },
  ];

  const reservation = await store.reserveStock(
    orderItems.map((i) => ({ cake_id: i.cake_id, quantity: i.quantity })),
  );
  if (!reservation.ok) {
    return { text: `দুঃখিত, "${cake.name}" এই মুহূর্তে স্টকে নেই। একটু পরে আবার চেষ্টা করুন।` };
  }

  let order: Order;
  try {
    order = await store.createOrder({
      customer_name: "WhatsApp ক্রেতা",
      phone: input.from,
      occasion,
      items: orderItems,
      address: "ঠিকানা নিতে হবে — WhatsApp-এ জানান",
      delivery_date: deliveryDate,
      delivery_slot: p.slot,
      subtotal,
      discount_amount: 0,
      referral_discount: 0,
      delivery_charge: deliveryCharge,
      total,
      payment_method: "cod",
      note: "WhatsApp-এ সরাসরি অর্ডার করা হয়েছে",
      // Meta retries the webhook; the key makes the retry a no-op.
      idempotency_key: input.metaMessageId ? `wa-order:${input.metaMessageId}` : undefined,
    });
  } catch (e) {
    if (reservation.ok) {
      await store.releaseStock(
        orderItems.map((i) => ({ cake_id: i.cake_id, quantity: i.quantity })),
      );
    }
    console.error("[whatsapp order] createOrder failed:", e);
    return {
      text: "দুঃখিত, অর্ডারটি সেভ করা যায়নি। একটু পরে আবার চেষ্টা করুন, অথবা সরাসরি কল দিন।",
    };
  }

  // Full summary + admin ping go out through the shared notifiers; the
  // direct reply below only covers the immediate next step.
  await Promise.allSettled([
    notifyAdminNewOrder(settings.whatsapp_phone, order.order_no, order.total, order.id),
    notifyOrderConfirmation({ order }),
  ]);

  return {
    text: [
      "*অর্ডার গৃহীত হয়েছে*",
      "",
      `*অর্ডার নম্বর:* ${order.order_no}`,
      `*কেক:* ${cake.name} ×${quantity}`,
      `*মোট:* ${formatBDT(total)}`,
      "",
      "ডেলিভারির ঠিকানা, পছন্দের তারিখ ও সময় এখানেই জানান। আমরা অর্ডারটি কনফার্ম করে দিচ্ছি।",
    ].join("\n"),
  };
}
