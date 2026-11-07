import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type {
  Banner,
  BlogPost,
  Cake,
  DashboardStats,
  Notification,
  Order,
  OrderStatusHistory,
  Payment,
  Profile,
  PromoCode,
  Referral,
  Review,
  Settings,
  PhoneVerification,
  EmailVerification,
} from "@/lib/types";
import { generateOrderNo, ORDER_NO_RE, phoneKey, slugBase, pickUniqueSlug } from "@/lib/utils";
import { PAYMENT_METHOD_LABEL } from "@/lib/constants";
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

/**
 * First free slug derived from `base` (`name`, `-2`, `-3`, ...).
 *
 * `cakes.slug` and `blog_posts.slug` are UNIQUE, so two admins (or one
 * double-click) saving the same title would otherwise surface Postgres' raw
 * constraint text in the UI.
 */
async function nextUniqueSlug(
  table: "cakes" | "blog_posts",
  base: string,
  excludeId?: string,
): Promise<string> {
  const { data, error } = await db().from(table).select("id, slug").like("slug", `${base}%`);
  if (error) err(error);

  return pickUniqueSlug(
    base,
    (data ?? []).filter((r) => r.id !== excludeId).map((r) => String(r.slug)),
  );
}

/** True when Postgres rejected a UNIQUE/PRIMARY KEY constraint. */
function isDuplicate(e: { code?: string; message?: string }): boolean {
  return e.code === "23505" || /duplicate key/i.test(e.message ?? "");
}

/* ---------------- settings (single row table) ---------------- */

async function getSettingsRow(): Promise<Settings> {
  const { data, error } = await db().from("settings").select("*").limit(1).maybeSingle();
  if (error) err(error);
  return data ? ({ ...SEED_SETTINGS, ...data } as Settings) : { ...SEED_SETTINGS };
}

/* ---------------- stats ---------------- */

async function dashboardStats(): Promise<DashboardStats> {
  // Only the columns the aggregates need — `select("*")` used to pull every
  // order's items JSON, address and notes just to count and sum them.
  type StatOrder = Pick<
    Order,
    "order_status" | "payment_status" | "occasion" | "payment_method" | "total" | "created_at"
  >;

  const { data: orders, error } = await db()
    .from("orders")
    .select("order_status, payment_status, occasion, payment_method, total, created_at");
  if (error) err(error);

  const { data: cakes, error: ce } = await db().from("cakes").select("id, is_active");
  if (ce) err(ce);

  const { data: reviews, error: re } = await db().from("reviews").select("rating, is_approved");
  if (re) err(re);

  const { data: promos, error: pe } = await db().from("promo_codes").select("code, used_count");
  if (pe) err(pe);

  const { data: users, error: ue } = await db().from("profiles").select("created_at");
  if (ue) err(ue);

  const weekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
  const allUsers = (users ?? []) as { created_at: string }[];

  const all = (orders ?? []) as StatOrder[];
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
    const pm = PAYMENT_METHOD_LABEL[o.payment_method] ?? o.payment_method;
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
    total_users: allUsers.length,
    new_users_7d: allUsers.filter((u) => Date.parse(u.created_at) >= weekAgo).length,
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
  async listUsers(opts) {
    let q = db().from("profiles").select("*").order("created_at", { ascending: false });
    if (opts?.limit) q = q.limit(opts.limit);
    const { data, error } = await q;
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
  async updateProfile(userId, patch) {
    const row: Record<string, unknown> = {};
    // Column allow-list — never spread `patch` straight into the UPDATE, or a
    // crafted payload could write `role`.
    if (patch.name !== undefined) row.name = patch.name;
    if (patch.birthdate !== undefined) row.birthdate = patch.birthdate || null;
    if (patch.anniversary_date !== undefined) row.anniversary_date = patch.anniversary_date || null;
    if (Object.keys(row).length === 0) return (await this.getUserById(userId)) as Profile;

    const { data, error } = await db()
      .from("profiles")
      .update(row)
      .eq("id", userId)
      .select("*")
      .single();
    if (error) err(error);
    return data as Profile;
  },
  async toggleUserBlock(userId, isBlocked) {
    const { error } = await db()
      .from("profiles")
      .update({ is_blocked: isBlocked })
      .eq("id", userId);
    if (error) err(error);
  },
  async markWishSent(userId, kind, date) {
    const column = kind === "birthday" ? "last_birthday_wish" : "last_anniversary_wish";

    const { data, error } = await db()
      .from("profiles")
      .select(`${column}`)
      .eq("id", userId)
      .maybeSingle();
    if (error) {
      console.warn("[wishes] read failed:", error.message);
      return false;
    }
    const current = (data as Record<string, string | null> | null)?.[column] ?? null;
    // Already stamped for *this* date: another run claimed the day. An older
    // year's stamp must be overwritten, or it would never advance.
    if (current === date) return false;

    // The `is null OR <> today` guard makes the write single-statement atomic:
    // of two overlapping cron runs, Postgres re-evaluates it for the loser and
    // matches zero rows.
    const { data: updated, error: writeError } = await db()
      .from("profiles")
      .update({ [column]: date })
      .eq("id", userId)
      .or(`${column}.is.null,${column}.neq.${date}`)
      .select(`${column}`);
    if (writeError) {
      console.warn("[wishes] stamp failed:", writeError.message);
      return false;
    }
    return (updated ?? []).length === 1;
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

  /* email verification */
  async saveEmailVerification(data) {
    const { data: row, error } = await db()
      .from("email_verifications")
      .insert({
        email: data.email,
        email_key: data.email.trim().toLowerCase(),
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
    return row as EmailVerification;
  },
  async getLatestEmailVerification(email, purpose) {
    let q = db()
      .from("email_verifications")
      .select("*")
      .eq("email_key", email.trim().toLowerCase())
      .order("created_at", { ascending: false })
      .limit(1);
    if (purpose) q = q.eq("purpose", purpose);
    const { data, error } = await q.maybeSingle();
    if (error) err(error);
    return (data as EmailVerification) ?? null;
  },
  async updateEmailVerification(id, patch) {
    const { data, error } = await db()
      .from("email_verifications")
      .update(patch)
      .eq("id", id)
      .select("*")
      .maybeSingle();
    if (error) err(error);
    return data as EmailVerification;
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
    // The row is already in hand — only the sizes still need fetching.
    // (Calling hydrateCake() here re-read the same cake a second time.)
    const cake = data as Cake;
    const { data: sizes, error: sizesError } = await db()
      .from("cake_sizes")
      .select("*")
      .eq("cake_id", cake.id)
      .order("weight");
    if (sizesError) err(sizesError);
    return { ...cake, sizes: (sizes ?? []) as Cake["sizes"] };
  },
  async createCake(data) {
    const base = data.slug || slugBase(data.name, "cake");

    // Pre-check for a free slug, then retry on the off chance another writer
    // grabs it between the SELECT and the INSERT.
    for (let attempt = 0; attempt < 3; attempt++) {
      const slug = await nextUniqueSlug("cakes", base);
      const payload = {
        name: data.name,
        slug,
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
      if (!error) return { ...(row as Cake), sizes: [] };
      if (!isDuplicate(error)) err(error);
    }
    throw new Error("এই নামে কেক ইতিমধ্যে আছে — নাম একটু আলাদা করে আবার চেষ্টা করুন।");
  },
  async updateCake(id, patch) {
    let next: Partial<Cake> = patch;

    // An explicit slug change must stay unique too (the admin form derives
    // slugs from the name and never sends one, so this is the safety net).
    if (patch.slug !== undefined) {
      const base = patch.slug || slugBase(patch.name ?? "", "cake");
      const slug = await nextUniqueSlug("cakes", base, id);
      if (slug !== patch.slug) next = { ...patch, slug };
    }

    for (let attempt = 0; attempt < 3; attempt++) {
      const { error } = await db().from("cakes").update(next).eq("id", id);
      if (!error) return (await hydrateCake(id)) as Cake;
      if (!isDuplicate(error)) err(error);
      // Slug raced another writer — pick a fresh one and try again.
      if (next.slug !== undefined) next = { ...next, slug: await nextUniqueSlug("cakes", next.slug, id) };
    }
    throw new Error("সেভ করা যায়নি — স্লাগ ইতিমধ্যে ব্যবহৃত হয়েছে। আবার চেষ্টা করুন।");
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

  async listOrders(opts) {
    let q = db().from("orders").select("*").order("created_at", { ascending: false });
    if (typeof opts?.limit === "number" && opts.limit > 0) q = q.limit(opts.limit);
    const { data, error } = await q;
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
  async getOrderStatsForUser(key) {
    // Matched by user id and/or phone so guest orders placed with the same
    // number count towards the same customer.
    type Row = { id: string; order_status: string; total: number; is_flagged?: boolean | null };
    const byId = new Map<string, Row>();
    const collect = (rows: Row[] | null) => {
      for (const r of rows ?? []) if (r?.id) byId.set(r.id, r);
    };

    if (key.userId) {
      const { data, error } = await db()
        .from("orders")
        .select("id, order_status, total, is_flagged")
        .eq("user_id", key.userId);
      if (error && (error.code === "PGRST204" || /does not exist/i.test(error.message))) {
        // `is_flagged` ships with phase-admin-users.sql — until that migration
        // is run, degrade to unflagged stats instead of breaking the screen.
        const retry = await db()
          .from("orders")
          .select("id, order_status, total")
          .eq("user_id", key.userId);
        if (retry.error) err(retry.error);
        collect(retry.data as Row[]);
      } else if (error) {
        err(error);
      } else {
        collect(data as Row[]);
      }
    }

    if (key.phone && phoneKey(key.phone).length >= 10) {
      const { data, error } = await db().rpc("list_orders_by_phone_key", {
        p_key: phoneKey(key.phone),
      });
      if (error) err(error);
      collect(data as Row[]);
    }

    const rows = [...byId.values()];
    return {
      total: rows.length,
      cancelled: rows.filter((r) => r.order_status === "cancelled").length,
      delivered: rows.filter((r) => ["delivered", "completed"].includes(r.order_status)).length,
      flagged: rows.filter((r) => r.is_flagged).length,
      spent: rows
        .filter((r) => r.order_status !== "cancelled")
        .reduce((s, r) => s + (r.total ?? 0), 0),
    };
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

    // Timeline seed row. Best effort: a missing migration must not fail the
    // order (the UI falls back to the order's own created_at).
    const { error: he } = await db().from("order_status_history").insert({
      order_id: (data as Order).id,
      status: "pending",
    });
    if (he) console.warn("[store] order_status_history insert failed:", he.message);

    return data as Order;
  },
  async updateOrder(id, patch) {
    // Read the old status first — the timeline needs the transition, not the
    // final value.
    let previousStatus: string | null = null;
    if (patch.order_status) {
      const { data: before } = await db()
        .from("orders")
        .select("order_status")
        .eq("id", id)
        .maybeSingle();
      previousStatus = (before?.order_status as string) ?? null;
    }

    const { error } = await db()
      .from("orders")
      .update({ ...patch, updated_at: new Date().toISOString() })
      .eq("id", id);
    if (error) err(error);

    if (patch.order_status && previousStatus && previousStatus !== patch.order_status) {
      const { error: he } = await db().from("order_status_history").insert({
        order_id: id,
        status: patch.order_status,
      });
      if (he) console.warn("[store] order_status_history insert failed:", he.message);
    }

    const { data } = await db().from("orders").select("*").eq("id", id).maybeSingle();
    return data as Order;
  },
  async setOrderFlag(orderId, flagged) {
    const { error } = await db()
      .from("orders")
      .update({ is_flagged: flagged, updated_at: new Date().toISOString() })
      .eq("id", orderId);
    if (error) err(error);
  },

  async listOrderStatusHistory(orderId) {
    const { data, error } = await db()
      .from("order_status_history")
      .select("*")
      .eq("order_id", orderId)
      .order("created_at", { ascending: true });

    if (!error && data?.length) return data as OrderStatusHistory[];

    // Migration not applied yet (or a legacy order): show the placement time.
    const { data: order } = await db()
      .from("orders")
      .select("id, order_status, created_at")
      .eq("id", orderId)
      .maybeSingle();
    if (!order) return [];
    return [
      {
        id: `${order.id}_seed`,
        order_id: order.id as string,
        status: order.order_status as OrderStatusHistory["status"],
        note: null,
        created_at: order.created_at as string,
      },
    ];
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

  async listPayments(opts) {
    let q = db().from("payments").select("*").order("created_at", { ascending: false });
    if (opts?.orderId) q = q.eq("order_id", opts.orderId);
    // ilike without wildcards is a case-insensitive exact match; trx IDs are
    // stored upper-case by the app but older rows may not be.
    if (opts?.trxId) q = q.ilike("trx_id", opts.trxId.trim());
    const { data, error } = await q;
    if (error) err(error);
    return (data ?? []) as Payment[];
  },
  async updatePayment(id, patch) {
    const { error } = await db().from("payments").update(patch).eq("id", id);
    if (error) err(error);
    const { data } = await db().from("payments").select("*").eq("id", id).maybeSingle();
    return data as Payment;
  },
  async createPayment(input) {
    const { data, error } = await db()
      .from("payments")
      .insert({
        order_id: input.order_id,
        method: input.method,
        amount: input.amount,
        trx_id: input.trx_id ?? null,
        status: input.status,
        created_at: new Date().toISOString(),
      })
      .select("*")
      .single();
    if (error) {
      if (error.code === "23505") throw new Error("এই TrxID আগে ব্যবহার করা হয়েছে।");
      err(error);
    }
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
  async getCakeRatings() {
    const { data, error } = await db()
      .from("reviews")
      .select("cake_slug, rating")
      .eq("is_approved", true)
      .not("cake_slug", "is", null);

    if (error) err(error);

    const ratingMap = new Map<string, { total: number; count: number }>();
    for (const r of (data ?? [])) {
      const slug = r.cake_slug as string;
      const cur = ratingMap.get(slug) ?? { total: 0, count: 0 };
      cur.total += r.rating;
      cur.count += 1;
      ratingMap.set(slug, cur);
    }

    return Array.from(ratingMap.entries()).map(([cake_slug, stats]) => ({
      cake_slug,
      average_rating: stats.total / stats.count,
      review_count: stats.count,
    }));
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
    const derived = data.title
      .toLowerCase()
      .replace(/[^a-z0-9\u0980-\u09FF]+/g, "-")
      .replace(/^-|-$/g, "");
    // A title with no Latin/Bengali letters at all would derive "" — the
    // slugBase fallback keeps it unique instead of colliding on every insert.
    const base = data.slug || derived || slugBase(data.title, "post");

    for (let attempt = 0; attempt < 3; attempt++) {
      const slug = await nextUniqueSlug("blog_posts", base);
      const payload = {
        ...data,
        slug,
        created_at: new Date().toISOString(),
        published_at: data.is_published ? new Date().toISOString() : null,
      };
      const { data: row, error } = await db().from("blog_posts").insert(payload).select("*").single();
      if (!error) return row as BlogPost;
      if (!isDuplicate(error)) err(error);
    }
    throw new Error("এই স্লাগে পোস্ট ইতিমধ্যে আছে — টাইটেল একটু আলাদা করে আবার চেষ্টা করুন।");
  },
  async updatePost(id, patch) {
    let next: Partial<BlogPost> = patch;
    if (patch.slug !== undefined) {
      const slug = await nextUniqueSlug("blog_posts", patch.slug, id);
      if (slug !== patch.slug) next = { ...patch, slug };
    }

    for (let attempt = 0; attempt < 3; attempt++) {
      const { error } = await db().from("blog_posts").update(next).eq("id", id);
      if (!error) break;
      if (!isDuplicate(error)) err(error);
      if (attempt === 2) throw new Error("সেভ করা যায়নি — স্লাগ ইতিমধ্যে ব্যবহৃত।");
      if (next.slug !== undefined) {
        next = { ...next, slug: await nextUniqueSlug("blog_posts", next.slug, id) };
      }
    }
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
