"use server";

import { redirect } from "next/navigation";
import { revalidatePath, revalidateTag } from "next/cache";
import { after } from "next/server";
import { getStore } from "@/lib/store";
import { CACHE_TAGS, type CacheTag } from "@/lib/store/cache";
import { requireAdmin } from "@/lib/auth";
import { cakeSchema, postSchema, promoSchema, settingsSchema } from "@/lib/validators";
import { MAX_CAKE_IMAGES, SITE } from "@/lib/constants";
import { createInvoiceAccessToken } from "@/lib/auth";
import { notifyInvoiceLink, notifyOrderStatus, notifyReviewRequest } from "@/lib/whatsapp";
import { syncCakesToCatalog, type CatalogSyncResult } from "@/lib/whatsapp/catalog";
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

/**
 * Invalidate the public site after an admin write.
 *
 * `revalidatePath("/", "layout")` only clears the route/render cache; the
 * `unstable_cache` entries in `lib/store/cache.ts` need their own tag
 * invalidation or cached pages would keep serving the old rows. `"max"` gives
 * stale-while-revalidate semantics so visitors never block on the rebuild.
 */
function revalidatePublic(...tags: CacheTag[]) {
  for (const tag of tags) revalidateTag(tag, "max");
  revalidatePath("/", "layout");
}

/* ----------------------------- cakes ----------------------------- */

function parseSizes(fd: FormData) {
  return parseJsonArray(fd.get("sizes"));
}

/**
 * Never surface Postgres/zod internals to the admin UI: constraint text like
 * `duplicate key value violates unique constraint "cakes_slug_key"` is noise.
 */
function friendlyStoreError(e: unknown, subject = "কেক"): string {
  const msg = (e as Error)?.message ?? "";
  if (/duplicate key|23505|slug_key|_slug_key/i.test(msg)) {
    return `এই নামে ${subject} ইতিমধ্যে আছে — নাম একটু আলাদা করে আবার চেষ্টা করুন।`;
  }
  if (/Too big|expected array to have <=\d+ items/i.test(msg)) {
    return `সর্বোচ্চ ${MAX_CAKE_IMAGES} টি ছবি রাখা যায়।`;
  }
  if (/does not exist|PGRST204/i.test(msg)) {
    return "ডেটাবেসে প্রয়োজনীয় কলাম নেই — supabase/ ফোল্ডারের নতুন মাইগ্রেশন SQL চালান।";
  }
  return msg || `${subject} সংরক্ষণ করা যায়নি। আবার চেষ্টা করুন।`;
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
    image_fit: String(fd.get("image_fit") ?? "contain"),
    image_position: String(fd.get("image_position") ?? "center"),
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
      revalidatePublic(CACHE_TAGS.cakes);
      return { success: `"${updated.name}" আপডেট হয়েছে`, id: updated.id };
    }

    // Server-side double-submit guard. The client locks synchronously, but a
    // retry (flaky network, restored tab, two devices) can still reach here —
    // and the local store silently auto-suffixes the slug, so a duplicate
    // would succeed there while Supabase rejected it. Reject both the same way.
    const nameKey = cake.name.trim().toLowerCase();
    const existing = await store.listCakes({ includeInactive: true });
    const duplicate = existing.find((c) => c.name.trim().toLowerCase() === nameKey);
    if (duplicate) {
      return {
        error: `"${duplicate.name}" ইতিমধ্যে তৈরি আছে — ডাবল ক্লিক হয়েছে না কিনা দেখুন।`,
        id: duplicate.id,
      };
    }

    const created = await store.createCake(cake);
    await store.setCakeSizes(
      created.id,
      sizes.length ? sizes : [{ weight: 1, price: cake.base_price, is_available: true }],
    );
    revalidatePublic(CACHE_TAGS.cakes);
    return { success: `"${created.name}" যোগ হয়েছে`, id: created.id };
  } catch (e) {
    return { error: friendlyStoreError(e, "কেক") };
  }
}

export async function deleteCakeAction(id: string): Promise<ActionState> {
  await guard();
  try {
    await getStore().deleteCake(id);
    revalidatePublic(CACHE_TAGS.cakes);
    return { success: "কেক মুছে ফেলা হয়েছে" };
  } catch (e) {
    return { error: (e as Error).message };
  }
}

/* ----------------------------- catalog lists ----------------------------- */

/** Save (create/update) a category or flavour from /admin/catalog. */
async function saveListItem(
  kind: "category" | "flavour",
  id: string,
  name: string,
): Promise<ActionState> {
  await guard();
  const clean = name.trim();
  if (clean.length < 1 || clean.length > 60) return { error: "নাম ১–৬০ অক্ষরের মধ্যে দিন" };
  const store = getStore();
  try {
    const list = kind === "category" ? await store.listCategories() : await store.listFlavours();
    const dupe = list.find((x) => x.name.trim().toLowerCase() === clean.toLowerCase() && x.id !== id);
    if (dupe) return { error: `"${clean}" আগে থেকেই আছে` };

    if (id) {
      const old = list.find((x) => x.id === id);
      if (!old) return { error: "পাওয়া যায়নি" };
      // Renaming a category/flavour also renames it on every cake that uses it
      // (cakes store plain strings, not a foreign key).
      if (old.name !== clean) {
        const cakes = await store.listCakes({ includeInactive: true });
        for (const cake of cakes) {
          if (kind === "category" && cake.category === old.name) await store.updateCake(cake.id, { category: clean });
          if (kind === "flavour" && cake.flavor === old.name) await store.updateCake(cake.id, { flavor: clean });
        }
      }
      if (kind === "category") await store.updateCategory(id, { name: clean });
      else await store.updateFlavour(id, { name: clean });
    } else if (kind === "category") {
      await store.createCategory(clean);
    } else {
      await store.createFlavour(clean);
    }
    revalidatePublic(CACHE_TAGS.cakes, CACHE_TAGS.catalogLists);
    revalidatePath("/admin/catalog");
    return { success: `"${clean}" সেভ হয়েছে` };
  } catch (e) {
    return { error: friendlyStoreError(e, kind === "category" ? "ক্যাটাগরি" : "ফ্লেভার") };
  }
}

async function deleteListItem(kind: "category" | "flavour", id: string): Promise<ActionState> {
  await guard();
  const store = getStore();
  try {
    const list = kind === "category" ? await store.listCategories() : await store.listFlavours();
    const item = list.find((x) => x.id === id);
    if (!item) return { error: "পাওয়া যায়নি" };
    const cakes = await store.listCakes({ includeInactive: true });
    const used = cakes.filter((c) => (kind === "category" ? c.category : c.flavor) === item.name).length;
    if (used > 0) return { error: `${used} টি কেক এই ${kind === "category" ? "ক্যাটাগরি" : "ফ্লেভার"} ব্যবহার করছে — আগে কেকগুলো বদলান` };
    if (kind === "category") await store.deleteCategory(id);
    else await store.deleteFlavour(id);
    revalidatePublic(CACHE_TAGS.cakes, CACHE_TAGS.catalogLists);
    revalidatePath("/admin/catalog");
    return { success: `"${item.name}" মুছে ফেলা হয়েছে` };
  } catch (e) {
    return { error: (e as Error).message };
  }
}

export async function saveCategoryAction(_prev: ActionState, fd: FormData): Promise<ActionState> {
  return saveListItem("category", String(fd.get("id") ?? "").trim(), String(fd.get("name") ?? ""));
}
export async function deleteCategoryAction(id: string): Promise<ActionState> {
  return deleteListItem("category", id);
}
export async function saveFlavourAction(_prev: ActionState, fd: FormData): Promise<ActionState> {
  return saveListItem("flavour", String(fd.get("id") ?? "").trim(), String(fd.get("name") ?? ""));
}
export async function deleteFlavourAction(id: string): Promise<ActionState> {
  return deleteListItem("flavour", id);
}

export async function uploadImagesAction(fd: FormData): Promise<{
  urls: string[];
  error?: string;
  mode?: string;
}> {
  await guard();
  const files = fd.getAll("images").filter((f): f is File => f instanceof File && f.size > 0);

  // cakeSchema.image_urls is capped at MAX_CAKE_IMAGES, so reject the excess
  // here instead of failing validation on save with a raw zod message.
  if (files.length > MAX_CAKE_IMAGES) {
    return {
      urls: [],
      error: `সর্বোচ্চ ${MAX_CAKE_IMAGES} টি ছবি একসাথে আপলোড করা যায় (আপনি ${files.length} টি দিয়েছেন)`,
    };
  }

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

    if (status === "completed" && order.payment_method === "cod") {
      if (order.payment_status !== "paid") {
        await store.updateOrder(orderId, { payment_status: "paid" });
      }
      // Ledger row so COD collections appear in /admin/payments (idempotent).
      const existing = await store.listPayments({ orderId });
      if (!existing.some((p) => p.method === "cod")) {
        await store.createPayment({ order_id: orderId, method: "cod", amount: order.total, status: "paid" }).catch(() => undefined);
      }
    }

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

      const payments = await store.listPayments({ orderId: order.id });
      for (const payment of payments) {
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
          // Re-read: the summary quotes payment status and totals, which may
          // have changed since `order` was loaded.
          const fresh = (await store.getOrderById(orderId)) ?? order;
          await notifyOrderStatus({
            order: fresh,
            status,
            storeName: settings.store_name,
          });

          if (
            (status === "delivered" || status === "completed") &&
            !order.review_requested_at
          ) {
            const result = await notifyReviewRequest({
              phone: fresh.phone,
              customerName: fresh.customer_name,
              orderNo: fresh.order_no,
              orderId: fresh.id,
            });
            if (result.ok) {
              await store.updateOrder(orderId, {
                review_requested_at: new Date().toISOString(),
              });
            }
          }

          // সম্পন্ন (completed) hole invoice PDF — ekbar, stamp diye.
          if (status === "completed" && !fresh.invoice_sent_at) {
            const invoiceUrl = `${SITE.url}/api/invoice/${encodeURIComponent(fresh.order_no)}/pdf?token=${createInvoiceAccessToken(fresh.id)}`;
            const result = await notifyInvoiceLink({
              phone: fresh.phone,
              customerName: fresh.customer_name,
              orderNo: fresh.order_no,
              orderId: fresh.id,
              invoiceUrl,
            });
            if (result.ok) {
              await store.updateOrder(orderId, {
                invoice_sent_at: new Date().toISOString(),
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
    const candidates = await store.listPayments({ orderId });
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

    await store
      .createNotification({
        type: "payment",
        title: "পেমেন্ট ভেরিফাই হয়েছে",
        message: `${order.order_no} — ${order.customer_name} এর bKash পেমেন্ট ভেরিফাই করা হয়েছে।`,
      })
      .catch(() => undefined);

    if (order.order_status === "pending") {
      await store.updateOrder(orderId, { order_status: "confirmed" });
      const settings = await store.getSettings();
      after(async () => {
        try {
          // Re-read so the confirmation quotes the freshly-paid status.
          const fresh = (await store.getOrderById(orderId)) ?? order;
          await notifyOrderStatus({
            order: fresh,
            status: "confirmed",
            storeName: settings.store_name,
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
      revalidatePublic(CACHE_TAGS.reviews);
      return { success: "রিভিউ approve হয়েছে" };
    }
    await getStore().deleteReview(id);
    revalidatePath("/admin/reviews");
    revalidatePublic(CACHE_TAGS.reviews);
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
    slug: String(fd.get("slug") ?? "").trim() || undefined,
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
      revalidatePath("/blog/[slug]", "page");
      revalidatePublic(CACHE_TAGS.posts);
      return { success: "ব্লগ আপডেট হয়েছে" };
    }
    const post = await store.createPost(parsed.data);
    revalidatePath("/admin/blog");
    revalidatePath("/blog/[slug]", "page");
    revalidatePublic(CACHE_TAGS.posts);
    return { success: "ব্লগ তৈরি হয়েছে", id: post.id };
  } catch (e) {
    return { error: friendlyStoreError(e, "পোস্ট") };
  }
}

export async function deletePostAction(id: string): Promise<ActionState> {
  await guard();
  try {
    await getStore().deletePost(id);
    revalidatePath("/admin/blog");
    revalidatePath("/blog/[slug]", "page");
    revalidatePublic(CACHE_TAGS.posts);
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
    revalidatePublic(CACHE_TAGS.banners);
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
    revalidatePublic(CACHE_TAGS.banners);
    return { success: "ব্যানার মুছে ফেলা হয়েছে" };
  } catch (e) {
    return { error: (e as Error).message };
  }
}

/* ----------------------------- settings ----------------------------- */

export async function saveSettingsAction(_prev: ActionState, fd: FormData): Promise<ActionState> {
  await guard();

  const prev = await getStore().getSettings().catch(() => null);

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
    notification_sound_enabled: fd.get("notification_sound_enabled") === "on",
    notification_sound_volume: Math.min(100, Math.max(0, Math.floor(Number(fd.get("notification_sound_volume") ?? 50) || 0))),
    notification_sounds: {
      order: {
        enabled: fd.get("sound_order_enabled") === "on",
        volume: Math.min(100, Math.max(0, Math.floor(Number(fd.get("sound_order_volume") ?? 50) || 0))),
        url: String(fd.get("sound_order_url") ?? "").trim() || ((prev?.notification_sounds?.order?.url as string) ?? null) || null,
      },
      payment: {
        enabled: fd.get("sound_payment_enabled") === "on",
        volume: Math.min(100, Math.max(0, Math.floor(Number(fd.get("sound_payment_volume") ?? 50) || 0))),
        url: String(fd.get("sound_payment_url") ?? "").trim() || ((prev?.notification_sounds?.payment?.url as string) ?? null) || null,
      },
      review: {
        enabled: fd.get("sound_review_enabled") === "on",
        volume: Math.min(100, Math.max(0, Math.floor(Number(fd.get("sound_review_volume") ?? 50) || 0))),
        url: String(fd.get("sound_review_url") ?? "").trim() || ((prev?.notification_sounds?.review?.url as string) ?? null) || null,
      },
    },
    instagram: String(fd.get("instagram") ?? "") || undefined,
    facebook: String(fd.get("facebook") ?? "") || undefined,
    extra_tier_fee: Math.max(0, Math.floor(Number(fd.get("extra_tier_fee") ?? 300) || 300)),
    syrup_prices: {
      none: 0,
      vanilla: Math.max(0, Math.floor(Number(fd.get("syrup_vanilla") ?? 0) || 0)),
      chocolate: Math.max(0, Math.floor(Number(fd.get("syrup_chocolate") ?? 0) || 0)),
      strawberry: Math.max(0, Math.floor(Number(fd.get("syrup_strawberry") ?? 0) || 0)),
      coffee: Math.max(0, Math.floor(Number(fd.get("syrup_coffee") ?? 0) || 0)),
      honey: Math.max(0, Math.floor(Number(fd.get("syrup_honey") ?? 0) || 0)),
      rose: Math.max(0, Math.floor(Number(fd.get("syrup_rose") ?? 0) || 0)),
    },
    crown_prices: {
      none: 0,
      sprinkles: Math.max(0, Math.floor(Number(fd.get("crown_sprinkles") ?? 0) || 0)),
      pearls: Math.max(0, Math.floor(Number(fd.get("crown_pearls") ?? 0) || 0)),
      macarons: Math.max(0, Math.floor(Number(fd.get("crown_macarons") ?? 0) || 0)),
      flowers: Math.max(0, Math.floor(Number(fd.get("crown_flowers") ?? 0) || 0)),
    },
    custom_options: {
      tiers: fd.get("custom_opt_tiers") === "on",
      shape: fd.get("custom_opt_shape") === "on",
      finish: fd.get("custom_opt_finish") === "on",
      crown: fd.get("custom_opt_crown") === "on",
      syrup: fd.get("custom_opt_syrup") === "on",
      message: fd.get("custom_opt_message") === "on",
      font: fd.get("custom_opt_font") === "on",
      message_color: fd.get("custom_opt_message_color") === "on",
    },
  });
  if (!parsed.success) return { error: parsed.error.issues[0].message };

  try {
    await getStore().updateSettings(parsed.data);
    revalidatePublic(CACHE_TAGS.settings);
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
    revalidatePublic(CACHE_TAGS.cakes);
    return { success: active ? "চালু হয়েছে" : "বন্ধ হয়েছে" };
  } catch (e) {
    return { error: (e as Error).message };
  }
}

/* ----------------------------- WhatsApp catalog ----------------------------- */

/**
 * Push the cake list into the Meta catalog linked to this WhatsApp number, so
 * customers can order straight from the shared catalog in a chat. Returns a
 * summary the admin button turns into a toast.
 */
export async function syncCatalogAction(): Promise<CatalogSyncResult> {
  await guard();
  return syncCakesToCatalog();
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

/* ----------------------------- user management ----------------------------- */

export async function toggleUserBlockAction(userId: string, isBlocked: boolean): Promise<ActionState> {
  await guard();
  try {
    const store = getStore();
    const user = await store.getUserById(userId);
    if (!user) return { error: "ইউজার পাওয়া যায়নি" };

    if (user.role === "admin") {
      return { error: "এডমিনকে ব্লক করা যাবে না" };
    }

    await store.toggleUserBlock(userId, isBlocked);
    revalidatePath("/admin/users");

    return {
      success: isBlocked
        ? `${user.name} ব্লক করা হয়েছে — এই নম্বর দিয়ে আর অর্ডার করতে পারবে না`
        : `${user.name} আনব্লক করা হয়েছে`
    };
  } catch (e) {
    return { error: friendlyStoreError(e, "ইউজার") };
  }
}

/**
 * 🚩 Toggle the fake-order marker on an order. Flagged orders roll up into the
 * customer's stats on the users screen so repeat offenders are easy to spot.
 */
export async function toggleOrderFlagAction(
  orderId: string,
  flagged: boolean,
): Promise<ActionState> {
  await guard();
  try {
    const store = getStore();
    const order = await store.getOrderById(orderId);
    if (!order) return { error: "অর্ডার পাওয়া যায়নি" };

    await store.setOrderFlag(orderId, flagged);
    revalidatePath(`/admin/orders/${orderId}`);
    revalidatePath("/admin/orders");
    revalidatePath("/admin/users");

    return {
      success: flagged
        ? `🚩 অর্ডার ${order.order_no} ফেক হিসেবে চিহ্নিত হয়েছে`
        : `অর্ডার ${order.order_no} থেকে ফেক চিহ্ন সরানো হয়েছে`,
    };
  } catch (e) {
    return { error: friendlyStoreError(e, "অর্ডার") };
  }
}
