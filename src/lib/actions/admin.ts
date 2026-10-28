"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { after } from "next/server";
import { getStore } from "@/lib/store";
import { requireAdmin } from "@/lib/auth";
import { cakeSchema, postSchema, promoSchema, settingsSchema } from "@/lib/validators";
import { notifyOrderStatus, notifyReviewRequest } from "@/lib/whatsapp";
import { storeImages } from "@/lib/upload";
import type { OrderStatus } from "@/lib/types";
import type { StockLine } from "@/lib/store/store-interface";

/** Admin-driven status transitions. Anything else must be rejected. */
const ALLOWED_TRANSITIONS: Record<OrderStatus, OrderStatus[]> = {
  pending: ["confirmed", "cancelled"],
  confirmed: ["baking", "cancelled"],
  baking: ["out_for_delivery", "cancelled"],
  out_for_delivery: ["delivered", "cancelled"],
  delivered: ["completed"],
  completed: [],
  cancelled: [],
};

const ORDER_STATUSES: OrderStatus[] = [
  "pending",
  "confirmed",
  "baking",
  "out_for_delivery",
  "delivered",
  "completed",
  "cancelled",
];

function isOrderStatus(value: unknown): value is OrderStatus {
  return typeof value === "string" && (ORDER_STATUSES as string[]).includes(value);
}

function parseJsonArray(raw: FormDataEntryValue | null): unknown[] {
  if (typeof raw !== "string" || !raw.trim()) return [];
  try {
    const parsed = JSON.parse(raw) as unknown;
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export interface ActionState {
  error?: string;
  success?: string;
  id?: string;
}

async function guard() {
  const admin = await requireAdmin();
  if (!admin) redirect("/login?next=/admin");
  return admin;
}

function revalidatePublic() {
  revalidatePath("/", "layout");
}

/* ----------------------------- cakes ----------------------------- */

function parseSizes(fd: FormData) {
  return parseJsonArray(fd.get("sizes"));
}

export async function saveCakeAction(_prev: ActionState, fd: FormData): Promise<ActionState> {
  await guard();

  const imageUrls = parseJsonArray(fd.get("image_urls")).filter(
    (url): url is string => typeof url === "string",
  );
  const id = String(fd.get("id") ?? "").trim();

  const parsed = cakeSchema.safeParse({
    name: String(fd.get("name") ?? "").trim(),
    description: String(fd.get("description") ?? "").trim(),
    flavor: String(fd.get("flavor") ?? "").trim(),
    category: String(fd.get("category") ?? "").trim(),
    occasions: parseJsonArray(fd.get("occasions")),
    image_urls: imageUrls,
    base_price: Number(fd.get("base_price") ?? 0),
    is_custom_available: fd.get("is_custom_available") === "on",
    is_featured: fd.get("is_featured") === "on",
    is_active: fd.get("is_active") === "on",
    stock: Number(fd.get("stock") ?? 0),
    sizes: parseSizes(fd),
  });

  if (!parsed.success) return { error: parsed.error.issues[0].message };
  if (!parsed.data.image_urls.length) return { error: "অন্তত একটা ছবি দিন" };

  const store = getStore();
  const { sizes, ...cake } = parsed.data;

  try {
    if (id) {
      const updated = await store.updateCake(id, cake);
      await store.setCakeSizes(id, sizes.length ? sizes : [{ weight: 1, price: cake.base_price, is_available: true }]);
      revalidatePublic();
      return { success: `"${updated.name}" আপডেট হয়েছে`, id: updated.id };
    }

    const created = await store.createCake(cake);
    await store.setCakeSizes(
      created.id,
      sizes.length ? sizes : [{ weight: 1, price: cake.base_price, is_available: true }],
    );
    revalidatePublic();
    return { success: `"${created.name}" যোগ হয়েছে`, id: created.id };
  } catch (e) {
    return { error: (e as Error).message };
  }
}

export async function deleteCakeAction(id: string): Promise<ActionState> {
  await guard();
  try {
    await getStore().deleteCake(id);
    revalidatePublic();
    return { success: "কেক মুছে ফেলা হয়েছে" };
  } catch (e) {
    return { error: (e as Error).message };
  }
}

export async function uploadImagesAction(fd: FormData): Promise<{
  urls: string[];
  error?: string;
  mode?: string;
}> {
  await guard();
  const files = fd.getAll("images").filter((f): f is File => f instanceof File && f.size > 0);
  const result = await storeImages(files);
  if (!result.urls.length) return { urls: [], error: result.error ?? "আপলোড ব্যর্থ হয়েছে" };
  return { urls: result.urls, mode: result.mode };
}

/* ----------------------------- orders ----------------------------- */

export async function updateOrderStatusAction(
  orderId: string,
  status: OrderStatus,
): Promise<ActionState> {
  await guard();
  if (!isOrderStatus(status)) return { error: "অবৈধ স্ট্যাটাস" };

  const store = getStore();
  const order = await store.getOrderById(orderId);
  if (!order) return { error: "অর্ডার পাওয়া যায়নি" };

  if (order.order_status === status) {
    return { success: `Status আগেই ${status} আছে` };
  }

  const allowed = ALLOWED_TRANSITIONS[order.order_status] ?? [];
  if (!allowed.includes(status)) {
    return {
      error: `${order.order_status} থেকে ${status} এ যাওয়া যাবে না। অনুমোদিত: ${
        allowed.length ? allowed.join(", ") : "কিছু নেই"
      }`,
    };
  }

  try {
    await store.updateOrder(orderId, { order_status: status });

    if (status === "cancelled") {
      // Releasing stock and discount reservations makes cancelled orders safe
      // to audit: the same slot/usage can be sold again.
      const stockLines: StockLine[] = order.items.map((item) => ({
        cake_id: item.cake_id,
        quantity: item.quantity,
      }));
      await store.releaseStock(stockLines);
      await store.releasePromo(order.id);
      await store.releaseReferral(order.id);

      const payments = await store.listPayments();
      for (const payment of payments.filter((p) => p.order_id === order.id)) {
        await store.updatePayment(payment.id, {
          status: payment.status === "paid" ? "refunded" : "unpaid",
        });
      }
      await store.updateOrder(orderId, {
        payment_status: order.payment_status === "paid" ? "refunded" : "unpaid",
      });
    }

    if (
      ["confirmed", "baking", "out_for_delivery", "delivered", "completed", "cancelled"].includes(
        status,
      )
    ) {
      const settings = await store.getSettings();

      // Send after the admin response so Meta latency never blocks the UI.
      after(async () => {
        try {
          await notifyOrderStatus({
            phone: order.phone,
            orderNo: order.order_no,
            status,
            storeName: settings.store_name,
            orderId: order.id,
          });

          if (
            (status === "delivered" || status === "completed") &&
            !order.review_requested_at
          ) {
            const result = await notifyReviewRequest({
              phone: order.phone,
              customerName: order.customer_name,
              orderNo: order.order_no,
              orderId: order.id,
            });
            if (result.ok) {
              await store.updateOrder(orderId, {
                review_requested_at: new Date().toISOString(),
              });
            }
          }
        } catch (e) {
          console.warn("[admin] WhatsApp notify failed:", (e as Error).message);
        }
      });
    }

    revalidatePath("/admin/orders");
    revalidatePath(`/admin/orders/${orderId}`);
    revalidatePath("/track");
    revalidatePublic();
    return { success: `Status → ${status}` };
  } catch (e) {
    return { error: (e as Error).message };
  }
}

export async function verifyPaymentAction(orderId: string, approve: boolean): Promise<ActionState> {
  await guard();

  const store = getStore();
  const order = await store.getOrderById(orderId);
  if (!order) return { error: "অর্ডার পাওয়া যায়নি" };
  if (order.payment_method !== "bkash") {
    return { error: "এই অর্ডারটি Cash on Delivery — bKash পেমেন্ট নেই।" };
  }
  if (order.order_status === "cancelled" && approve) {
    return { error: "বাতিল অর্ডারের পেমেন্ট ভেরিফাই করা যাবে না।" };
  }

  try {
    const payments = await store.listPayments();
    const candidates = payments.filter((p) => p.order_id === orderId);
    const payment =
      candidates.find((p) => p.status === "pending_verify") ?? candidates[0] ?? null;

    if (!payment) {
      return { error: "এই অর্ডারের কোনো bKash পেমেন্ট রেকর্ড পাওয়া যায়নি।" };
    }

    if (!approve) {
      await store.updatePayment(payment.id, { status: "unpaid", verified_by: "admin" });
      if (order.payment_status !== "paid") {
        await store.updateOrder(orderId, { payment_status: "unpaid" });
      }
      revalidatePath("/admin/orders");
      revalidatePath("/admin/payments");
      return {
        success:
          "পেমেন্ট প্রত্যাখ্যাত — অর্ডার unpaid হয়েছে। গ্রাহককে সঠিক TrxID দিয়ে আবার অর্ডার করতে বলুন।",
      };
    }

    if (payment.status === "paid" && order.payment_status === "paid") {
      return { success: "এই পেমেন্ট আগেই ভেরিফাই করা হয়েছে ✅" };
    }

    await store.updatePayment(payment.id, { status: "paid", verified_by: "admin" });
    await store.updateOrder(orderId, { payment_status: "paid" });

    if (order.order_status === "pending") {
      await store.updateOrder(orderId, { order_status: "confirmed" });
      const settings = await store.getSettings();
      after(async () => {
        try {
          await notifyOrderStatus({
            phone: order.phone,
            orderNo: order.order_no,
            status: "confirmed",
            storeName: settings.store_name,
            orderId: order.id,
          });
        } catch (e) {
          console.warn("[admin] WhatsApp notify failed:", (e as Error).message);
        }
      });
    }

    revalidatePath("/admin/orders");
    revalidatePath("/admin/payments");
    revalidatePublic();
    return { success: "পেমেন্ট ভেরিফাই হয়েছে ✅" };
  } catch (e) {
    return { error: (e as Error).message };
  }
}

/* ----------------------------- promos ----------------------------- */

export async function savePromoAction(_prev: ActionState, fd: FormData): Promise<ActionState> {
  await guard();

  const id = String(fd.get("id") ?? "").trim();
  const parsed = promoSchema.safeParse({
    code: String(fd.get("code") ?? "").trim().toUpperCase(),
    percent: Number(fd.get("percent") ?? 0),
    min_order: Number(fd.get("min_order") ?? 0),
    max_discount: Number(fd.get("max_discount") ?? 0),
    usage_limit: Number(fd.get("usage_limit") ?? 100),
    expires_at: String(fd.get("expires_at") ?? "") || null,
    is_active: fd.get("is_active") === "on",
  });
  if (!parsed.success) return { error: parsed.error.issues[0].message };

  const store = getStore();
  try {
    if (id) {
      await store.updatePromo(id, parsed.data);
      revalidatePath("/admin/promos");
      return { success: `${parsed.data.code} আপডেট হয়েছে` };
    }
    if (await store.getPromoByCode(parsed.data.code)) {
      return { error: "এই কোড আগে থেকেই আছে" };
    }
    await store.createPromo(parsed.data);
    revalidatePath("/admin/promos");
    revalidatePublic();
    return { success: `${parsed.data.code} তৈরি হয়েছে` };
  } catch (e) {
    return { error: (e as Error).message };
  }
}

export async function deletePromoAction(id: string): Promise<ActionState> {
  await guard();
  try {
    await getStore().deletePromo(id);
    revalidatePath("/admin/promos");
    return { success: "Promo মুছে ফেলা হয়েছে" };
  } catch (e) {
    return { error: (e as Error).message };
  }
}

/* ----------------------------- reviews ----------------------------- */

export async function moderateReviewAction(id: string, approve: boolean): Promise<ActionState> {
  await guard();
  try {
    if (approve) {
      await getStore().updateReview(id, { is_approved: true });
      revalidatePath("/admin/reviews");
      revalidatePublic();
      return { success: "রিভিউ approve হয়েছে" };
    }
    await getStore().deleteReview(id);
    revalidatePath("/admin/reviews");
    revalidatePublic();
    return { success: "রিভিউ মুছে ফেলা হয়েছে" };
  } catch (e) {
    return { error: (e as Error).message };
  }
}

/* ----------------------------- blog ----------------------------- */

export async function savePostAction(_prev: ActionState, fd: FormData): Promise<ActionState> {
  await guard();

  const id = String(fd.get("id") ?? "").trim();
  const parsed = postSchema.safeParse({
    title: String(fd.get("title") ?? "").trim(),
    excerpt: String(fd.get("excerpt") ?? "").trim(),
    content: String(fd.get("content") ?? ""),
    cover_image: String(fd.get("cover_image") ?? "") || null,
    meta_title: String(fd.get("meta_title") ?? "") || null,
    meta_description: String(fd.get("meta_description") ?? "") || null,
    is_published: fd.get("is_published") === "on",
  });
  if (!parsed.success) return { error: parsed.error.issues[0].message };

  const store = getStore();
  try {
    if (id) {
      await store.updatePost(id, parsed.data);
      revalidatePath("/admin/blog");
      revalidatePublic();
      return { success: "ব্লগ আপডেট হয়েছে" };
    }
    const post = await store.createPost(parsed.data);
    revalidatePath("/admin/blog");
    revalidatePublic();
    return { success: "ব্লগ তৈরি হয়েছে", id: post.id };
  } catch (e) {
    return { error: (e as Error).message };
  }
}

export async function deletePostAction(id: string): Promise<ActionState> {
  await guard();
  try {
    await getStore().deletePost(id);
    revalidatePath("/admin/blog");
    revalidatePublic();
    return { success: "ব্লগ মুছে ফেলা হয়েছে" };
  } catch (e) {
    return { error: (e as Error).message };
  }
}

/* ----------------------------- banners ----------------------------- */

export async function saveBannerAction(_prev: ActionState, fd: FormData): Promise<ActionState> {
  await guard();

  const title = String(fd.get("title") ?? "").trim();
  if (!title) return { error: "ব্যানার টাইটেল দিন" };

  const store = getStore();
  const payload = {
    title,
    subtitle: String(fd.get("subtitle") ?? "") || null,
    cta_text: String(fd.get("cta_text") ?? "") || null,
    cta_link: String(fd.get("cta_link") ?? "") || null,
    ends_at: String(fd.get("ends_at") ?? "") || null,
    is_active: fd.get("is_active") === "on",
  };

  try {
    const existing = await store.listBanners();
    if (existing[0] && !payload.is_active) {
      await store.updateBanner(existing[0].id, payload);
    } else if (existing[0]) {
      await store.updateBanner(existing[0].id, payload);
      for (const b of existing.slice(1)) await store.updateBanner(b.id, { is_active: false });
    } else {
      await store.createBanner(payload);
    }
    revalidatePath("/admin/banners");
    revalidatePublic();
    return { success: "ব্যানার সেভ হয়েছে" };
  } catch (e) {
    return { error: (e as Error).message };
  }
}

export async function deleteBannerAction(id: string): Promise<ActionState> {
  await guard();
  try {
    await getStore().deleteBanner(id);
    revalidatePath("/admin/banners");
    revalidatePublic();
    return { success: "ব্যানার মুছে ফেলা হয়েছে" };
  } catch (e) {
    return { error: (e as Error).message };
  }
}

/* ----------------------------- settings ----------------------------- */

export async function saveSettingsAction(_prev: ActionState, fd: FormData): Promise<ActionState> {
  await guard();

  const parsed = settingsSchema.safeParse({
    store_name: String(fd.get("store_name") ?? "").trim(),
    tagline: String(fd.get("tagline") ?? "").trim(),
    phone: String(fd.get("phone") ?? "").trim(),
    whatsapp_phone: String(fd.get("whatsapp_phone") ?? "").trim(),
    email: String(fd.get("email") ?? "").trim(),
    address: String(fd.get("address") ?? "").trim(),
    bkash_number: String(fd.get("bkash_number") ?? "").trim(),
    delivery_charge: Number(fd.get("delivery_charge") ?? 0),
    free_delivery_min: Number(fd.get("free_delivery_min") ?? 0),
    free_delivery_enabled: fd.get("free_delivery_enabled") === "on",
    cod_enabled: fd.get("cod_enabled") === "on",
    bkash_enabled: fd.get("bkash_enabled") === "on",
    instagram: String(fd.get("instagram") ?? "") || undefined,
    facebook: String(fd.get("facebook") ?? "") || undefined,
  });
  if (!parsed.success) return { error: parsed.error.issues[0].message };

  try {
    await getStore().updateSettings(parsed.data);
    revalidatePath("/", "layout");
    revalidatePath("/admin/settings");
    return { success: "সেটিংস সেভ হয়েছে" };
  } catch (e) {
    return { error: (e as Error).message };
  }
}

/* ----------------------------- stock ----------------------------- */

export async function toggleCakeActiveAction(id: string, active: boolean): Promise<ActionState> {
  await guard();
  try {
    await getStore().updateCake(id, { is_active: active });
    revalidatePath("/admin/cakes");
    revalidatePublic();
    return { success: active ? "চালু হয়েছে" : "বন্ধ হয়েছে" };
  } catch (e) {
    return { error: (e as Error).message };
  }
}

/* ----------------------------- notifications ----------------------------- */

export async function markNotificationReadAction(id: string): Promise<ActionState> {
  await guard();
  try {
    await getStore().markNotificationRead(id);
    revalidatePath("/admin/notifications");
    revalidatePath("/admin", "layout");
    return { success: "পড়া হয়েছে" };
  } catch (e) {
    return { error: (e as Error).message };
  }
}

export async function markAllNotificationsReadAction(): Promise<ActionState> {
  await guard();
  try {
    const notifications = await getStore().listNotifications();
    for (const n of notifications) {
      if (!n.is_read) await getStore().markNotificationRead(n.id);
    }
    revalidatePath("/admin/notifications");
    revalidatePath("/admin", "layout");
    return { success: "সব নোটিফিকেশন পড়া হয়েছে" };
  } catch (e) {
    return { error: (e as Error).message };
  }
}
