import { SITE } from "@/lib/constants";
import { getStore } from "@/lib/store";
import { getCachedSettings } from "@/lib/store/cache";
import type { Cake, Order, OrderItem } from "@/lib/types";
import { dhakaDatePlus, formatBDT } from "@/lib/utils";
import { notifyAdminNewOrder, notifyOrderConfirmation } from "@/lib/whatsapp";
import { missingDetailsReply, SLOT_LABEL, type AutoReply } from "./auto-reply";
import { clearOrderDraft, loadOrderDraft, saveOrderDraft, type OrderDraft } from "./draft";
import {
  decodeConfirmId,
  type OrderConfirmPayload,
  type OrderOccasion,
} from "./order-request";

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

/** A fresh draft from the button payload — the details still have to arrive. */
function seedDraftFromPayload(p: OrderConfirmPayload): OrderDraft {
  return {
    cakeId: p.cakeId,
    quantity: p.quantity,
    weight: p.weight,
    occasion: p.occasion,
    deliveryDate: p.deliveryDate,
    slot: p.slot,
    updatedAt: new Date().toISOString(),
  };
}

/** Final "order accepted" summary — also used for a retried webhook. */
function acceptedReply(order: Order): string {
  const item = order.items[0];
  return [
    "*অর্ডার গৃহীত হয়েছে*",
    "",
    `*অর্ডার নম্বর:* ${order.order_no}`,
    `*নাম:* ${order.customer_name}`,
    item
      ? `*কেক:* ${item.name} ×${item.quantity}${item.weight ? ` (${item.weight} lb)` : ""}`
      : null,
    `*ডেলিভারি:* ${order.delivery_date}${
      order.delivery_slot ? ` · ${SLOT_LABEL[order.delivery_slot] ?? order.delivery_slot}` : ""
    }`,
    `*ঠিকানা:* ${order.address}`,
    `*ফোন:* ${order.phone}`,
    `*মোট:* ${formatBDT(order.total)}`,
    "",
    "আমরা অর্ডারটি কনফার্ম করে দিচ্ছি।",
  ]
    .filter((l): l is string => l != null)
    .join("\n");
}

/**
 * Handle an order confirm/cancel button press (`oc:…` button ids).
 *
 * The button only carries the cake summary — address, phone and date live
 * in the customer's open draft (`whatsapp/draft.ts`). No draft with all
 * three details, no order: the tap is answered with another details prompt
 * instead. A Meta retry after a successful confirm is recognised through
 * the idempotency key and answered with the existing order.
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
    await clearOrderDraft(input.from);
    return {
      text: "ঠিক আছে, অর্ডারটি বাতিল করা হয়েছে। পরে আবার চাইলে কেকের নাম লিখে অর্ডার করতে পারবেন।",
    };
  }

  const p = decoded.payload;
  const cake = await store.getCakeById(p.cakeId);
  if (!cake || !cake.is_active) {
    return { text: `দুঃখিত, এই কেকটি আর পাওয়া যায়নি। অন্য কেক দেখুন: ${SITE.url}/cakes` };
  }
  if (cake.stock < p.quantity) {
    return {
      text:
        cake.stock < 1
          ? `দুঃখিত, "${cake.name}" এখন স্টকে নেই। অন্য কেক দেখুন।`
          : `"${cake.name}" স্টকে মাত্র ${cake.stock}টি আছে। পরিমাণ কমিয়ে আবার অর্ডার করুন।`,
    };
  }

  /* ---- details gate: no order without address, phone and date ---- */
  let draft = await loadOrderDraft(input.from);

  if (!draft) {
    // Meta retries the webhook after a successful confirm — answer with the
    // order that already exists instead of asking for details all over again.
    if (input.metaMessageId) {
      const existing = await store.findOrderByIdempotencyKey(
        `wa-order:${input.metaMessageId}`,
      );
      if (existing) return { text: acceptedReply(existing) };
    }
    // Recover from a lost draft: the button carries the cake summary but
    // never the address/phone — seed a draft and collect them.
    draft = seedDraftFromPayload(p);
    await saveOrderDraft(input.from, draft);
    return missingDetailsReply({
      draft,
      cake,
      settings,
      hint: "ঠিকানা ও ফোন নম্বর ছাড়া অর্ডার নেওয়া হয় না। তথ্য পাঠালেই অর্ডার যাচাইয়ের বাটন পাবেন।",
    });
  }

  if (draft.cakeId !== p.cakeId) {
    // A newer order request is open — this tapped prompt is stale.
    draft = seedDraftFromPayload(p);
    await saveOrderDraft(input.from, draft);
    return missingDetailsReply({
      draft,
      cake,
      settings,
      hint: "এই অর্ডারের ঠিকানা ও ফোন নম্বর এখনো দেওয়া হয়নি।",
    });
  }

  if (!draft.name || !draft.address || !draft.phone || !draft.deliveryDate) {
    return missingDetailsReply({
      draft,
      cake,
      settings,
      hint: "নাম, ঠিকানা, ফোন নম্বর ও তারিখ দিলেই অর্ডার কনফার্ম হবে।",
    });
  }

  const today = dhakaDatePlus(0);
  if (draft.deliveryDate < today) {
    // The prompt was tapped after the chosen date passed — ask for a new one.
    draft = { ...draft, deliveryDate: undefined, updatedAt: new Date().toISOString() };
    await saveOrderDraft(input.from, draft);
    return missingDetailsReply({
      draft,
      cake,
      settings,
      hint: "তারিখটি অতীতে পড়ছে। নতুন তারিখ দিন।",
    });
  }

  /* ---- all details present: place the order ---- */
  const { unitPrice, weight } = priceFor(cake, draft.weight);
  const quantity = draft.quantity;
  const deliveryDate = draft.deliveryDate;
  const occasion: OrderOccasion = VALID_OCCASIONS.includes(draft.occasion)
    ? draft.occasion
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
      customer_name: draft.name ?? "WhatsApp ক্রেতা",
      phone: draft.phone,
      occasion,
      items: orderItems,
      address: draft.address,
      delivery_date: deliveryDate,
      delivery_slot: draft.slot ?? p.slot,
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

  // The draft has served its purpose — the order now carries the details.
  await clearOrderDraft(input.from);

  // Full summary + admin ping go out through the shared notifiers; the
  // direct reply below only covers the immediate next step.
  await Promise.allSettled([
    notifyAdminNewOrder(settings.whatsapp_phone, order.order_no, order.total, order.id),
    notifyOrderConfirmation({ order }),
  ]);

  return { text: acceptedReply(order) };
}
