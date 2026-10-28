import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type {
  Banner,
  BlogPost,
  Cake,
  DashboardStats,
  Notification,
  Order,
  Payment,
  Profile,
  PromoCode,
  Referral,
  Review,
  Settings,
  PhoneVerification,
} from "@/lib/types";
import { generateOrderNo, ORDER_NO_RE, phoneKey } from "@/lib/utils";
import { SEED_SETTINGS } from "./seed";
import type {
  CreateOrderInput,
  StockLine,
  Store,
  StoreOperationResult,
} from "./store-interface";

/**
 * Supabase (PostgreSQL) implementation.
 * Activated automatically when NEXT_PUBLIC_SUPABASE_URL and
 * SUPABASE_SERVICE_ROLE_KEY are present in .env.local.
 *
 * All writes run server-side with the service role key, so the anon key
 * never leaves the server for privileged operations.
 */

let client: SupabaseClient | null = null;

function db(): SupabaseClient {
  if (!client) {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    if (!url || !key) {
      throw new Error(
        "Supabase is not configured. Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in .env.local",
      );
    }
    client = createClient(url, key, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
  }
  return client;
}

function err(e: { message: string } | null): never {
  throw new Error(e?.message || "Database error");
}

/* ---------------- settings (single row table) ---------------- */

async function getSettingsRow(): Promise<Settings> {
  const { data, error } = await db().from("settings").select("*").limit(1).maybeSingle();
  if (error) err(error);
  return data ? ({ ...SEED_SETTINGS, ...data } as Settings) : { ...SEED_SETTINGS };
}

/* ---------------- stats ---------------- */

async function dashboardStats(): Promise<DashboardStats> {
  const { data: orders, error } = await db()
    .from("orders")
    .select("*")
    .order("created_at", { ascending: false });
  if (error) err(error);

  const { data: cakes, error: ce } = await db().from("cakes").select("id, is_active");
  if (ce) err(ce);

  const { data: reviews, error: re } = await db().from("reviews").select("rating, is_approved");
  if (re) err(re);

  const { data: promos, error: pe } = await db().from("promo_codes").select("code, used_count");
  if (pe) err(pe);

  const all = (orders ?? []) as Order[];
  const active = all.filter((o) => o.order_status !== "cancelled");
  const delivered = all.filter((o) => ["delivered", "completed"].includes(o.order_status));
  const realized = all.filter(
    (o) => o.order_status !== "cancelled" && (o.payment_status === "paid" || ["delivered", "completed"].includes(o.order_status)),
  );

  const occasionMap = new Map<string, number>();
  const paymentMap = new Map<string, number>();
  const dayMap = new Map<string, number>();

  for (const o of active) {
    occasionMap.set(o.occasion, (occasionMap.get(o.occasion) ?? 0) + 1);
    const pm = o.payment_method === "cod" ? "Cash on Delivery" : "bKash";
    paymentMap.set(pm, (paymentMap.get(pm) ?? 0) + 1);
  }

  for (const o of realized) {
    const d = o.created_at.slice(0, 10);
    dayMap.set(d, (dayMap.get(d) ?? 0) + o.total);
  }

  const approved = ((reviews ?? []) as Review[]).filter((r) => r.is_approved);
  const avg = approved.length
    ? Math.round((approved.reduce((a, b) => a + b.rating, 0) / approved.length) * 10) / 10
    : 0;

  return {
    total_orders: active.length,
    pending_orders: all.filter((o) => ["pending", "confirmed", "baking"].includes(o.order_status)).length,
    delivered_orders: delivered.length,
    revenue: realized.reduce((s, o) => s + o.total, 0),
    total_products: ((cakes ?? []) as Cake[]).filter((c) => c.is_active).length,
    total_reviews: approved.length,
    avg_rating: avg,
    orders_by_occasion: [...occasionMap.entries()].map(([name, value]) => ({ name, value })),
    orders_by_payment: [...paymentMap.entries()].map(([name, value]) => ({ name, value })),
    promo_usage: ((promos ?? []) as PromoCode[]).map((p) => ({ name: p.code, value: p.used_count })),
    revenue_by_day: [...dayMap.entries()]
      .sort(([a], [b]) => a.localeCompare(b))
      .slice(-7)
      .map(([day, revenue]) => ({ day, revenue })),
  };
}

/* ---------------- cakes with sizes ---------------- */

async function hydrateCake(id: string): Promise<Cake | null> {
  const { data, error } = await db().from("cakes").select("*").eq("id", id).maybeSingle();
  if (error) err(error);
  if (!data) return null;
  const { data: sizes } = await db().from("cake_sizes").select("*").eq("cake_id", id).order("weight");
  return { ...(data as Cake), sizes: (sizes ?? []) as Cake["sizes"] };
}

/* ---------------- store ---------------- */

export const supabaseStore: Store = {
  async getSettings() {
    return getSettingsRow();
  },
  async updateSettings(patch) {
    const current = await getSettingsRow();
    const { error } = await db().from("settings").upsert({ id: 1, ...current, ...patch });
    if (error) err(error);
    return { ...current, ...patch };
  },

  async findUserByEmail(email) {
    const { data, error } = await db()
      .from("profiles")
      .select("*")
      .ilike("email", email.trim().toLowerCase())
      .maybeSingle();
    if (error) err(error);
    return (data as Profile) ?? null;
  },
  async findUserByPhone(phone) {
    const key = phoneKey(phone);
    if (key.length < 10) return null;
    const { data, error } = await db().rpc("find_profile_by_phone_key", { p_key: key });
    if (error) err(error);
    const row = Array.isArray(data) ? data[0] : data;
    return (row as Profile) ?? null;
  },
  async getUserById(id) {
    const { data, error } = await db().from("profiles").select("*").eq("id", id).maybeSingle();
    if (error) err(error);
    return (data as Profile) ?? null;
  },
  async listUsers() {
    const { data, error } = await db().from("profiles").select("*").order("created_at", { ascending: false });
    if (error) err(error);
    return (data ?? []) as Profile[];
  },
  async createUser(data) {
    const { data: row, error } = await db()
      .from("profiles")
      .insert({
        name: data.name,
        phone: data.phone,
        email: data.email?.trim().toLowerCase() ?? null,
        role: data.role,
        password_hash: data.password,
        created_at: new Date().toISOString(),
      })
      .select("*")
      .single();
    if (error) {
      if (error.code === "23505") throw new Error("এই ইমেইল বা ফোন নম্বরে অ্যাকাউন্ট আছে।");
      err(error);
    }
    return row as Profile;
  },
  async getPasswordHash(userId) {
    const { data, error } = await db()
      .from("profiles")
      .select("password_hash")
      .eq("id", userId)
      .maybeSingle();
    if (error) err(error);
    return (data as { password_hash?: string } | null)?.password_hash ?? null;
  },
  async updatePassword(userId, passwordHash) {
    const { error } = await db()
      .from("profiles")
      .update({ password_hash: passwordHash })
      .eq("id", userId);
    if (error) err(error);
  },

  /* phone verification */
  async savePhoneVerification(data) {
    const { data: row, error } = await db()
      .from("phone_verifications")
      .insert({
        phone: data.phone,
        phone_key: phoneKey(data.phone),
        purpose: data.purpose,
        code_hash: data.code_hash,
        expires_at: data.expires_at,
        attempts: 0,
        verified_at: data.verified_at ?? null,
        created_at: new Date().toISOString(),
      })
      .select("*")
      .single();
    if (error) err(error);
    return row as PhoneVerification;
  },
  async getLatestPhoneVerification(phone, purpose) {
    let q = db()
      .from("phone_verifications")
      .select("*")
      .eq("phone_key", phoneKey(phone))
      .order("created_at", { ascending: false })
      .limit(1);
    if (purpose) q = q.eq("purpose", purpose);
    const { data, error } = await q.maybeSingle();
    if (error) err(error);
    return (data as PhoneVerification) ?? null;
  },
  async updatePhoneVerification(id, patch) {
    const { data, error } = await db()
      .from("phone_verifications")
      .update(patch)
      .eq("id", id)
      .select("*")
      .maybeSingle();
    if (error) err(error);
    return data as PhoneVerification;
  },

  async listCakes(opts) {
    let q = db().from("cakes").select("*").order("created_at", { ascending: false });
    if (!opts?.includeInactive) q = q.eq("is_active", true);
    const { data, error } = await q;
    if (error) err(error);
    const cakes = (data ?? []) as Cake[];
    const { data: sizes } = await db().from("cake_sizes").select("*").order("weight");
    const byCake = new Map<string, Cake["sizes"]>();
    for (const s of (sizes ?? []) as NonNullable<Cake["sizes"]>) {
      const arr = byCake.get(s.cake_id) ?? [];
      arr.push(s);
      byCake.set(s.cake_id, arr);
    }
    return cakes.map((c) => ({ ...c, sizes: byCake.get(c.id) ?? [] }));
  },
  async getCakeById(id) {
    return hydrateCake(id);
  },
  async getCakeBySlug(slug) {
    const { data, error } = await db().from("cakes").select("*").eq("slug", slug).maybeSingle();
    if (error) err(error);
    if (!data) return null;
    return hydrateCake((data as Cake).id);
  },
  async createCake(data) {
    const payload = {
      name: data.name,
      slug: data.slug || data.name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, ""),
      description: data.description,
      flavor: data.flavor,
      category: data.category,
      occasions: data.occasions,
      image_urls: data.image_urls,
      base_price: data.base_price,
      is_custom_available: data.is_custom_available,
      is_featured: data.is_featured,
      is_active: data.is_active,
      stock: data.stock,
      created_at: new Date().toISOString(),
    };
    const { data: row, error } = await db().from("cakes").insert(payload).select("*").single();
    if (error) err(error);
    return { ...(row as Cake), sizes: [] };
  },
  async updateCake(id, patch) {
    const { error } = await db().from("cakes").update(patch).eq("id", id);
    if (error) err(error);
    return (await hydrateCake(id)) as Cake;
  },
  async deleteCake(id) {
    await db().from("cake_sizes").delete().eq("cake_id", id);
    const { error } = await db().from("cakes").delete().eq("id", id);
    if (error) err(error);
  },
  async setCakeSizes(cakeId, sizes) {
    await db().from("cake_sizes").delete().eq("cake_id", cakeId);
    const rows = sizes.map((s) => ({
      cake_id: cakeId,
      weight: s.weight,
      price: s.price,
      is_available: s.is_available,
    }));
    const { error } = await db().from("cake_sizes").insert(rows);
    if (error) err(error);
    const one = rows.find((r) => r.weight === 1);
    if (one) await db().from("cakes").update({ base_price: one.price }).eq("id", cakeId);
  },

  async listOrders() {
    const { data, error } = await db().from("orders").select("*").order("created_at", { ascending: false });
    if (error) err(error);
    return (data ?? []) as Order[];
  },
  async getOrderById(id) {
    const { data, error } = await db().from("orders").select("*").eq("id", id).maybeSingle();
    if (error) err(error);
    return (data as Order) ?? null;
  },
  async getOrderByNo(orderNo) {
    const q = orderNo.trim();
    if (!q) return null;
    const column = ORDER_NO_RE.test(q) ? "order_no" : "id";
    const { data, error } = await db()
      .from("orders")
      .select("*")
      .eq(column, column === "order_no" ? q.toUpperCase() : q)
      .maybeSingle();
    if (error) err(error);
    return (data as Order) ?? null;
  },
  async listOrdersByPhone(phone) {
    const key = phoneKey(phone);
    if (key.length < 10) return [];
    const { data, error } = await db().rpc("list_orders_by_phone_key", { p_key: key });
    if (error) err(error);
    return (data ?? []) as Order[];
  },
  async listOrdersByUser(userId) {
    const { data, error } = await db()
      .from("orders")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false });
    if (error) err(error);
    return (data ?? []) as Order[];
  },
  async findOrderByIdempotencyKey(key) {
    if (!key) return null;
    const { data, error } = await db()
      .from("orders")
      .select("*")
      .eq("idempotency_key", key)
      .maybeSingle();
    if (error) err(error);
    return (data as Order) ?? null;
  },
  async claimGuestOrders(userId, phone) {
    const key = phoneKey(phone);
    if (key.length < 10) return 0;
    const { data, error } = await db().rpc("claim_guest_orders", {
      p_user_id: userId,
      p_phone_key: key,
    });
    if (error) err(error);
    return typeof data === "number" ? data : 0;
  },
  async createOrder(input: CreateOrderInput) {
    if (input.idempotency_key) {
      const existing = await this.findOrderByIdempotencyKey(input.idempotency_key);
      if (existing) return existing;
    }

    const d = new Date();
    const orderNo = generateOrderNo(d);
    const payload = {
      ...input,
      order_no: orderNo,
      payment_status: input.payment_method === "bkash" ? "pending_verify" : "unpaid",
      order_status: "pending",
      created_at: d.toISOString(),
      updated_at: d.toISOString(),
    };
    const { data, error } = await db().from("orders").insert(payload).select("*").single();
    if (error) {
      if (error.code === "23505" && input.idempotency_key) {
        const existing = await this.findOrderByIdempotencyKey(input.idempotency_key);
        if (existing) return existing;
      }
      if (error.code === "23505") {
        throw new Error("এই TrxID আগে ব্যবহার করা হয়েছে।");
      }
      err(error);
    }

    if (input.payment_method === "bkash" && input.bkash_trx_id) {
      const { error: pe } = await db().from("payments").insert({
        order_id: (data as Order).id,
        method: "bkash",
        amount: payload.total,
        trx_id: input.bkash_trx_id,
        status: "pending_verify",
        created_at: new Date().toISOString(),
      });
      if (pe) {
        // Roll back the order so a missing payment row cannot leave a
        // half-created order behind.
        await db().from("orders").delete().eq("id", (data as Order).id);
        if (pe.code === "23505") throw new Error("এই TrxID আগে ব্যবহার করা হয়েছে।");
        err(pe);
      }
    }

    await db().from("notifications").insert({
      type: "order",
      title: "নতুন অর্ডার",
      message: `${payload.order_no} — ${payload.customer_name} ৳${payload.total} এর অর্ডার দিয়েছেন।`,
      is_read: false,
      created_at: new Date().toISOString(),
    });

    return data as Order;
  },
  async updateOrder(id, patch) {
    const { error } = await db().from("orders").update({ ...patch, updated_at: new Date().toISOString() }).eq("id", id);
    if (error) err(error);
    const { data } = await db().from("orders").select("*").eq("id", id).maybeSingle();
    return data as Order;
  },

  /* stock */
  async reserveStock(items: StockLine[]) {
    const { data, error } = await db().rpc("reserve_stock", {
      p_items: items.map((i) => ({ cake_id: i.cake_id, quantity: i.quantity })),
    });
    if (error) {
      const message = error.message ?? "";
      if (message.includes("insufficient_stock")) {
        return { ok: false, reason: "কেকের স্টক শেষ হয়ে গেছে।" };
      }
      if (message.includes("cake_not_found")) {
        return { ok: false, reason: "কেকটি এখন পাওয়া যাচ্ছে না।" };
      }
      return { ok: false, reason: "স্টক আপডেট করা যায়নি। আবার চেষ্টা করুন।" };
    }
    const result = data as StoreOperationResult | boolean | null;
    if (typeof result === "boolean") return { ok: result };
    return result ?? { ok: true };
  },
  async releaseStock(items: StockLine[]) {
    const { error } = await db().rpc("release_stock", {
      p_items: items.map((i) => ({ cake_id: i.cake_id, quantity: i.quantity })),
    });
    if (error) err(error);
  },

  /* promo / referral */
  async consumePromo(code, orderId, phone) {
    const { data, error } = await db().rpc("consume_promo", {
      p_code: code,
      p_order_id: orderId,
      p_phone: phoneKey(phone),
    });
    if (error) return { ok: false, reason: "প্রোমো কোড প্রয়োগ করা যায়নি।" };
    const result = data as StoreOperationResult | null;
    return result ?? { ok: true };
  },
  async releasePromo(orderId) {
    const { error } = await db().rpc("release_promo", { p_order_id: orderId });
    if (error) err(error);
  },
  async getReferralByCode(code) {
    const { data, error } = await db()
      .from("referrals")
      .select("*")
      .ilike("code", code.trim())
      .maybeSingle();
    if (error) err(error);
    return (data as Referral) ?? null;
  },
  async consumeReferral(code, orderId, phone) {
    const { data, error } = await db().rpc("consume_referral", {
      p_code: code,
      p_order_id: orderId,
      p_phone: phoneKey(phone),
    });
    if (error) return { ok: false, reason: "রেফারেল কোড প্রয়োগ করা যায়নি।" };
    const result = data as StoreOperationResult | null;
    return result ?? { ok: true };
  },
  async releaseReferral(orderId) {
    const { error } = await db().rpc("release_referral", { p_order_id: orderId });
    if (error) err(error);
  },

  async listPayments() {
    const { data, error } = await db().from("payments").select("*").order("created_at", { ascending: false });
    if (error) err(error);
    return (data ?? []) as Payment[];
  },
  async updatePayment(id, patch) {
    const { error } = await db().from("payments").update(patch).eq("id", id);
    if (error) err(error);
    const { data } = await db().from("payments").select("*").eq("id", id).maybeSingle();
    return data as Payment;
  },

  async listPromos() {
    const { data, error } = await db().from("promo_codes").select("*").order("created_at", { ascending: false });
    if (error) err(error);
    return (data ?? []) as PromoCode[];
  },
  async getPromoByCode(code) {
    const { data, error } = await db()
      .from("promo_codes")
      .select("*")
      .ilike("code", code.trim())
      .maybeSingle();
    if (error) err(error);
    return (data as PromoCode) ?? null;
  },
  async createPromo(data) {
    const { data: row, error } = await db()
      .from("promo_codes")
      .insert({ ...data, code: data.code.toUpperCase().trim(), used_count: 0, created_at: new Date().toISOString() })
      .select("*")
      .single();
    if (error) err(error);
    return row as PromoCode;
  },
  async updatePromo(id, patch) {
    const { error } = await db().from("promo_codes").update(patch).eq("id", id);
    if (error) err(error);
    const { data } = await db().from("promo_codes").select("*").eq("id", id).maybeSingle();
    return data as PromoCode;
  },
  async deletePromo(id) {
    const { error } = await db().from("promo_codes").delete().eq("id", id);
    if (error) err(error);
  },

  async listReviews(opts) {
    let q = db().from("reviews").select("*").order("created_at", { ascending: false });
    if (opts?.approvedOnly) q = q.eq("is_approved", true);
    const { data, error } = await q;
    if (error) err(error);
    return (data ?? []) as Review[];
  },
  async getReviewByOrder(orderId) {
    const { data, error } = await db().from("reviews").select("*").eq("order_id", orderId).maybeSingle();
    if (error) err(error);
    return (data as Review) ?? null;
  },
  async createReview(data) {
    const { data: row, error } = await db()
      .from("reviews")
      .insert({ ...data, is_approved: false, created_at: new Date().toISOString() })
      .select("*")
      .single();
    if (error) err(error);
    return row as Review;
  },
  async updateReview(id, patch) {
    const { error } = await db().from("reviews").update(patch).eq("id", id);
    if (error) err(error);
    const { data } = await db().from("reviews").select("*").eq("id", id).maybeSingle();
    return data as Review;
  },
  async deleteReview(id) {
    const { error } = await db().from("reviews").delete().eq("id", id);
    if (error) err(error);
  },

  async listPosts(opts) {
    let q = db().from("blog_posts").select("*").order("created_at", { ascending: false });
    if (opts?.publishedOnly) q = q.eq("is_published", true);
    const { data, error } = await q;
    if (error) err(error);
    return (data ?? []) as BlogPost[];
  },
  async getPostBySlug(slug) {
    const { data, error } = await db().from("blog_posts").select("*").eq("slug", slug).maybeSingle();
    if (error) err(error);
    return (data as BlogPost) ?? null;
  },
  async createPost(data) {
    const payload = {
      ...data,
      slug: data.slug || data.title.toLowerCase().replace(/[^a-z0-9\u0980-\u09FF]+/g, "-").replace(/^-|-$/g, ""),
      created_at: new Date().toISOString(),
      published_at: data.is_published ? new Date().toISOString() : null,
    };
    const { data: row, error } = await db().from("blog_posts").insert(payload).select("*").single();
    if (error) err(error);
    return row as BlogPost;
  },
  async updatePost(id, patch) {
    const { error } = await db().from("blog_posts").update(patch).eq("id", id);
    if (error) err(error);
    const { data } = await db().from("blog_posts").select("*").eq("id", id).maybeSingle();
    return data as BlogPost;
  },
  async deletePost(id) {
    const { error } = await db().from("blog_posts").delete().eq("id", id);
    if (error) err(error);
  },

  async listBanners(opts) {
    let q = db().from("banners").select("*");
    if (opts?.activeOnly) q = q.eq("is_active", true);
    const { data, error } = await q;
    if (error) err(error);
    return (data ?? []) as Banner[];
  },
  async createBanner(data) {
    const { data: row, error } = await db().from("banners").insert(data).select("*").single();
    if (error) err(error);
    return row as Banner;
  },
  async updateBanner(id, patch) {
    const { error } = await db().from("banners").update(patch).eq("id", id);
    if (error) err(error);
    const { data } = await db().from("banners").select("*").eq("id", id).maybeSingle();
    return data as Banner;
  },
  async deleteBanner(id) {
    const { error } = await db().from("banners").delete().eq("id", id);
    if (error) err(error);
  },

  async listNotifications() {
    const { data, error } = await db().from("notifications").select("*").order("created_at", { ascending: false }).limit(50);
    if (error) err(error);
    return (data ?? []) as Notification[];
  },
  async createNotification(data) {
    const { data: row, error } = await db()
      .from("notifications")
      .insert({ ...data, is_read: false, created_at: new Date().toISOString() })
      .select("*")
      .single();
    if (error) err(error);
    return row as Notification;
  },
  async markNotificationRead(id) {
    const { error } = await db().from("notifications").update({ is_read: true }).eq("id", id);
    if (error) err(error);
  },

  async getDashboardStats() {
    return dashboardStats();
  },
};
