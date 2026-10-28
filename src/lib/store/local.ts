import { promises as fs } from "fs";
import path from "path";
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
import { uid, slugify, generateOrderNo, phoneKey } from "@/lib/utils";
import type {
  CreateOrderInput,
  StockLine,
  Store,
  StoreOperationResult,
} from "./store-interface";
import {
  SEED_SETTINGS,
  buildSeedBanners,
  buildSeedCakes,
  buildSeedNotifications,
  buildSeedOrders,
  buildSeedPosts,
  buildSeedPromos,
  buildSeedReferrals,
  buildSeedReviews,
  buildSeedUsers,
} from "./seed";

interface UsageRow {
  id: string;
  code: string;
  order_id: string;
  phone: string;
  created_at: string;
}

interface DB {
  settings: Settings;
  users: (Profile & { password: string })[];
  cakes: Cake[];
  orders: Order[];
  payments: Payment[];
  promos: PromoCode[];
  referrals: Referral[];
  promo_uses: UsageRow[];
  referral_usage: UsageRow[];
  reviews: Review[];
  verifications: PhoneVerification[];
  posts: BlogPost[];
  banners: Banner[];
  notifications: Notification[];
}

const DATA_DIR = path.join(process.cwd(), ".data");
const DB_FILE = path.join(DATA_DIR, "db.json");

/** Strip the password hash before a user record leaves the store. */
function publicProfile(user: Profile & { password: string }): Profile {
  return {
    id: user.id,
    name: user.name,
    phone: user.phone,
    email: user.email,
    role: user.role,
    created_at: user.created_at,
  };
}

function freshDB(): DB {
  const cakes = buildSeedCakes();
  return {
    settings: { ...SEED_SETTINGS },
    users: buildSeedUsers(),
    cakes,
    orders: buildSeedOrders(cakes),
    payments: [],
    promos: buildSeedPromos(),
    referrals: buildSeedReferrals(),
    promo_uses: [],
    referral_usage: [],
    reviews: buildSeedReviews(cakes),
    verifications: [],
    posts: buildSeedPosts(),
    banners: buildSeedBanners(),
    notifications: buildSeedNotifications(),
  };
}

async function load(): Promise<DB> {
  const g = globalThis as unknown as { __scdb?: Promise<DB> };
  if (g.__scdb) return g.__scdb;

  g.__scdb = (async () => {
    try {
      const raw = await fs.readFile(DB_FILE, "utf8");
      const parsed = JSON.parse(raw) as Partial<DB>;
      const incomplete = !parsed.settings || !Array.isArray(parsed.users) || !Array.isArray(parsed.cakes);
      if (incomplete) return { ...freshDB(), ...parsed } as DB;
      return {
        ...freshDB(),
        ...parsed,
        referrals: Array.isArray(parsed.referrals) ? parsed.referrals : buildSeedReferrals(),
        promo_uses: Array.isArray(parsed.promo_uses) ? parsed.promo_uses : [],
        referral_usage: Array.isArray(parsed.referral_usage) ? parsed.referral_usage : [],
        verifications: Array.isArray(parsed.verifications) ? parsed.verifications : [],
      } as DB;
    } catch {
      const db = freshDB();
      await persist(db);
      return db;
    }
  })();

  return g.__scdb;
}

async function persist(db: DB): Promise<void> {
  await fs.mkdir(DATA_DIR, { recursive: true });
  const tmp = `${DB_FILE}.${process.pid}.tmp`;
  await fs.writeFile(tmp, JSON.stringify(db, null, 2), "utf8");
  await fs.rename(tmp, DB_FILE);
}

/**
 * Serialise writes and mutate a clone so a thrown error cannot leave the
 * in-memory database half-updated.
 */
async function tx<T>(fn: (db: DB) => T | Promise<T>): Promise<T> {
  const g = globalThis as unknown as {
    __scdb?: Promise<DB>;
    __scdbChain?: Promise<unknown>;
  };
  const previous = g.__scdbChain ?? Promise.resolve();
  const run = previous.then(async () => {
    const db = structuredClone(await load());
    const result = await fn(db);
    await persist(db);
    g.__scdb = Promise.resolve(db);
    return result;
  });
  g.__scdbChain = run.catch(() => undefined);
  return run;
}

/* ---------------- helpers ---------------- */

function dashboardStats(db: DB): DashboardStats {
  const active = db.orders.filter((o) => o.order_status !== "cancelled");
  const delivered = db.orders.filter((o) =>
    ["delivered", "completed"].includes(o.order_status),
  );
  const realized = db.orders.filter(
    (o) => o.order_status !== "cancelled" && (o.payment_status === "paid" || ["delivered", "completed"].includes(o.order_status)),
  );

  const occasionMap = new Map<string, number>();
  const paymentMap = new Map<string, number>();
  const dayMap = new Map<string, number>();

  for (const o of active) {
    occasionMap.set(o.occasion, (occasionMap.get(o.occasion) ?? 0) + 1);
    paymentMap.set(
      o.payment_method === "cod" ? "Cash on Delivery" : "bKash",
      (paymentMap.get(o.payment_method === "cod" ? "Cash on Delivery" : "bKash") ?? 0) + 1,
    );
  }

  for (const o of realized) {
    const d = o.created_at.slice(0, 10);
    dayMap.set(d, (dayMap.get(d) ?? 0) + o.total);
  }

  const promoMap = new Map<string, number>();
  for (const p of db.promos) promoMap.set(p.code, p.used_count);

  const revenueByDay = [...dayMap.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .slice(-7)
    .map(([day, revenue]) => ({ day, revenue }));

  const ratings = db.reviews.filter((r) => r.is_approved).map((r) => r.rating);

  return {
    total_orders: active.length,
    pending_orders: db.orders.filter((o) =>
      ["pending", "confirmed", "baking"].includes(o.order_status),
    ).length,
    delivered_orders: delivered.length,
    revenue: realized.reduce((sum, o) => sum + o.total, 0),
    total_products: db.cakes.filter((c) => c.is_active).length,
    total_reviews: ratings.length,
    avg_rating: ratings.length
      ? Math.round((ratings.reduce((a, b) => a + b, 0) / ratings.length) * 10) / 10
      : 0,
    orders_by_occasion: [...occasionMap.entries()].map(([name, value]) => ({ name, value })),
    orders_by_payment: [...paymentMap.entries()].map(([name, value]) => ({ name, value })),
    promo_usage: [...promoMap.entries()].map(([name, value]) => ({ name, value })),
    revenue_by_day: revenueByDay,
  };
}

/* ---------------- store ---------------- */

export const localStore: Store = {
  /* settings */
  async getSettings() {
    return structuredClone((await load()).settings);
  },
  async updateSettings(patch) {
    return tx((db) => {
      db.settings = { ...db.settings, ...patch };
      return db.settings;
    });
  },

  /* auth */
  async findUserByEmail(email) {
    const db = await load();
    const q = email.trim().toLowerCase();
    return db.users.find((u) => u.email?.trim().toLowerCase() === q) ?? null;
  },
  async findUserByPhone(phone) {
    const db = await load();
    const q = phoneKey(phone);
    return db.users.find((u) => phoneKey(u.phone) === q) ?? null;
  },
  async getUserById(id) {
    const db = await load();
    const u = db.users.find((x) => x.id === id);
    if (!u) return null;
    return publicProfile(u);
  },
  async listUsers() {
    const db = await load();
    return db.users.map(publicProfile);
  },
  async createUser(data) {
    return tx((db) => {
      const email = data.email?.trim().toLowerCase();
      const key = phoneKey(data.phone);
      if (db.users.some((u) => phoneKey(u.phone) === key)) {
        throw new Error("এই ফোন নম্বরে অ্যাকাউন্ট আছে।");
      }
      if (email && db.users.some((u) => u.email?.trim().toLowerCase() === email)) {
        throw new Error("এই ইমেইলে অ্যাকাউন্ট আছে।");
      }
      const user = {
        id: uid("u"),
        name: data.name,
        phone: data.phone,
        email,
        role: data.role,
        created_at: new Date().toISOString(),
        // callers pass an already-hashed password (see registerAction)
        password: data.password,
      };
      db.users.push(user);
      return publicProfile(user);
    });
  },
  async getPasswordHash(userId) {
    const db = await load();
    return db.users.find((u) => u.id === userId)?.password ?? null;
  },
  async updatePassword(userId, passwordHash) {
    await tx((db) => {
      const user = db.users.find((u) => u.id === userId);
      if (!user) throw new Error("ইউজার পাওয়া যায়নি");
      user.password = passwordHash;
    });
  },

  /* phone verification */
  async savePhoneVerification(data) {
    return tx((db) => {
      const record: PhoneVerification = {
        id: uid("pv"),
        phone: data.phone,
        phone_key: phoneKey(data.phone),
        purpose: data.purpose,
        code_hash: data.code_hash,
        expires_at: data.expires_at,
        attempts: 0,
        verified_at: data.verified_at ?? null,
        consumed_at: null,
        created_at: new Date().toISOString(),
      };
      db.verifications.unshift(record);
      // Keep only the latest 20 records per phone to bound the local file.
      const mine = db.verifications.filter((v) => v.phone_key === record.phone_key);
      if (mine.length > 20) {
        db.verifications = db.verifications.filter(
          (v) => v.phone_key !== record.phone_key || mine.slice(0, 20).includes(v),
        );
      }
      return record;
    });
  },
  async getLatestPhoneVerification(phone, purpose) {
    const db = await load();
    const key = phoneKey(phone);
    return (
      db.verifications
        .filter((v) => v.phone_key === key && (!purpose || v.purpose === purpose))
        .sort((a, b) => b.created_at.localeCompare(a.created_at))[0] ?? null
    );
  },
  async updatePhoneVerification(id, patch) {
    return tx((db) => {
      const i = db.verifications.findIndex((v) => v.id === id);
      if (i < 0) throw new Error("Verification not found");
      db.verifications[i] = { ...db.verifications[i], ...patch };
      return db.verifications[i];
    });
  },

  /* cakes */
  async listCakes(opts) {
    const db = await load();
    return db.cakes.filter((c) => (opts?.includeInactive ? true : c.is_active));
  },
  async getCakeById(id) {
    const db = await load();
    return db.cakes.find((c) => c.id === id) ?? null;
  },
  async getCakeBySlug(slug) {
    const db = await load();
    return db.cakes.find((c) => c.slug === slug) ?? null;
  },
  async createCake(data) {
    return tx((db) => {
      const cake: Cake = {
        ...data,
        id: uid("cake"),
        slug: data.slug || slugify(data.name),
        created_at: new Date().toISOString(),
        image_urls: data.image_urls?.length ? data.image_urls : ["/cakes/custom-placeholder.svg"],
        sizes: [],
      };
      db.cakes.unshift(cake);
      return cake;
    });
  },
  async updateCake(id, patch) {
    return tx((db) => {
      const i = db.cakes.findIndex((c) => c.id === id);
      if (i < 0) throw new Error("Cake not found");
      db.cakes[i] = { ...db.cakes[i], ...patch };
      if (patch.slug === undefined && patch.name) {
        db.cakes[i].slug = slugify(patch.name);
      }
      return db.cakes[i];
    });
  },
  async deleteCake(id) {
    await tx((db) => {
      db.cakes = db.cakes.filter((c) => c.id !== id);
    });
  },
  async setCakeSizes(cakeId, sizes) {
    await tx((db) => {
      const cake = db.cakes.find((c) => c.id === cakeId);
      if (!cake) throw new Error("Cake not found");
      cake.sizes = sizes.map((s, i) => ({
        id: `${cakeId}-s${i}_${s.weight}`,
        cake_id: cakeId,
        weight: s.weight,
        price: s.price,
        is_available: s.is_available,
      }));
      if (cake.sizes.length && cake.sizes.some((s) => s.weight === 1)) {
        cake.base_price = cake.sizes.find((s) => s.weight === 1)!.price;
      }
    });
  },

  /* orders */
  async listOrders() {
    const db = await load();
    return [...db.orders].sort((a, b) => b.created_at.localeCompare(a.created_at));
  },
  async getOrderById(id) {
    const db = await load();
    return db.orders.find((o) => o.id === id) ?? null;
  },
  async getOrderByNo(orderNo) {
    const db = await load();
    const q = orderNo.trim();
    return (
      db.orders.find((o) => o.order_no.toUpperCase() === q.toUpperCase()) ??
      db.orders.find((o) => o.id === q) ??
      null
    );
  },
  async listOrdersByPhone(phone) {
    const db = await load();
    const key = phoneKey(phone);
    return db.orders
      .filter((o) => phoneKey(o.phone) === key)
      .sort((a, b) => b.created_at.localeCompare(a.created_at));
  },
  async listOrdersByUser(userId) {
    const db = await load();
    return db.orders
      .filter((o) => o.user_id === userId)
      .sort((a, b) => b.created_at.localeCompare(a.created_at));
  },
  async findOrderByIdempotencyKey(key) {
    if (!key) return null;
    const db = await load();
    return db.orders.find((o) => o.idempotency_key === key) ?? null;
  },
  async claimGuestOrders(userId, phone) {
    return tx((db) => {
      const key = phoneKey(phone);
      let claimed = 0;
      for (const order of db.orders) {
        if (!order.user_id && phoneKey(order.phone) === key) {
          order.user_id = userId;
          order.updated_at = new Date().toISOString();
          claimed += 1;
        }
      }
      return claimed;
    });
  },
  async createOrder(input: CreateOrderInput) {
    return tx((db) => {
      if (input.idempotency_key) {
        const existing = db.orders.find((o) => o.idempotency_key === input.idempotency_key);
        if (existing) return existing;
      }

      const now = new Date().toISOString();
      const order: Order = {
        ...input,
        id: uid("ord"),
        order_no: generateOrderNo(),
        payment_status: input.payment_method === "bkash" ? "pending_verify" : "unpaid",
        order_status: "pending",
        created_at: now,
        updated_at: now,
      };

      db.orders.unshift(order);

      if (order.payment_method === "bkash" && order.bkash_trx_id) {
        db.payments.unshift({
          id: uid("pay"),
          order_id: order.id,
          method: "bkash",
          amount: order.total,
          trx_id: order.bkash_trx_id,
          status: "pending_verify",
          created_at: now,
        });
      }

      db.notifications.unshift({
        id: uid("noti"),
        user_id: "u_admin",
        type: "order",
        title: "নতুন অর্ডার",
        message: `${order.order_no} — ${order.customer_name} ${order.total} টাকার অর্ডার দিয়েছেন।`,
        is_read: false,
        created_at: now,
      });

      return order;
    });
  },
  async updateOrder(id, patch) {
    return tx((db) => {
      const i = db.orders.findIndex((o) => o.id === id);
      if (i < 0) throw new Error("Order not found");
      db.orders[i] = { ...db.orders[i], ...patch, updated_at: new Date().toISOString() };
      return db.orders[i];
    });
  },

  /* stock */
  async reserveStock(items: StockLine[]) {
    return tx((db): StoreOperationResult => {
      for (const line of items) {
        const cake = db.cakes.find((c) => c.id === line.cake_id);
        if (!cake || !cake.is_active) {
          return { ok: false, reason: `"${cake?.name ?? line.cake_id}" এখন পাওয়া যাচ্ছে না।` };
        }
        if (cake.stock < line.quantity) {
          return { ok: false, reason: `"${cake.name}" এর স্টক শেষ (আছে ${cake.stock}টি)।` };
        }
      }
      for (const line of items) {
        const cake = db.cakes.find((c) => c.id === line.cake_id);
        if (cake) cake.stock = Math.max(0, cake.stock - line.quantity);
      }
      return { ok: true };
    });
  },
  async releaseStock(items: StockLine[]) {
    await tx((db) => {
      for (const line of items) {
        const cake = db.cakes.find((c) => c.id === line.cake_id);
        if (cake) cake.stock += line.quantity;
      }
    });
  },

  /* promo / referral */
  async consumePromo(code, orderId, phone) {
    return tx((db): StoreOperationResult => {
      const promo = db.promos.find((p) => p.code.toUpperCase() === code.trim().toUpperCase());
      if (!promo) return { ok: false, reason: "কোড পাওয়া যায়নি" };
      if (!promo.is_active) return { ok: false, reason: "এই কোড বন্ধ আছে" };
      if (promo.usage_limit > 0 && promo.used_count >= promo.usage_limit) {
        return { ok: false, reason: "কোডটি সবার কাছে শেষ হয়ে গেছে" };
      }
      const expires = promo.expires_at?.trim();
      if (expires) {
        const iso = /^\d{4}-\d{2}-\d{2}$/.test(expires) ? `${expires}T23:59:59.999+06:00` : expires;
        if (new Date(iso).getTime() < Date.now()) {
          return { ok: false, reason: "কোডের মেয়াদ শেষ" };
        }
      }
      promo.used_count += 1;
      db.promo_uses.unshift({
        id: uid("pu"),
        code: promo.code,
        order_id: orderId,
        phone: phoneKey(phone),
        created_at: new Date().toISOString(),
      });
      return { ok: true };
    });
  },
  async releasePromo(orderId) {
    await tx((db) => {
      const uses = db.promo_uses.filter((u) => u.order_id === orderId);
      if (!uses.length) return;
      for (const use of uses) {
        const promo = db.promos.find((p) => p.code.toUpperCase() === use.code.toUpperCase());
        if (promo && promo.used_count > 0) promo.used_count -= 1;
      }
      db.promo_uses = db.promo_uses.filter((u) => u.order_id !== orderId);
    });
  },
  async getReferralByCode(code) {
    const db = await load();
    return db.referrals.find((r) => r.code.toUpperCase() === code.trim().toUpperCase()) ?? null;
  },
  async consumeReferral(code, orderId, phone) {
    return tx((db): StoreOperationResult => {
      const referral = db.referrals.find((r) => r.code.toUpperCase() === code.trim().toUpperCase());
      if (!referral) return { ok: false, reason: "রেফারেল কোড পাওয়া যায়নি" };
      if (!referral.is_active) return { ok: false, reason: "এই রেফারেল কোড বন্ধ আছে" };
      if (referral.max_uses > 0 && referral.used_count >= referral.max_uses) {
        return { ok: false, reason: "এই রেফারেল কোড আর ব্যবহার করা যাবে না" };
      }
      const expires = referral.expires_at?.trim();
      if (expires) {
        const iso = /^\d{4}-\d{2}-\d{2}$/.test(expires) ? `${expires}T23:59:59.999+06:00` : expires;
        if (new Date(iso).getTime() < Date.now()) {
          return { ok: false, reason: "রেফারেল কোডের মেয়াদ শেষ" };
        }
      }
      const key = phoneKey(phone);
      if (db.referral_usage.some((u) => u.code.toUpperCase() === referral.code.toUpperCase() && u.phone === key)) {
        return { ok: false, reason: "এই রেফারেল কোড আপনি আগে ব্যবহার করেছেন" };
      }
      referral.used_count += 1;
      db.referral_usage.unshift({
        id: uid("ru"),
        code: referral.code,
        order_id: orderId,
        phone: key,
        created_at: new Date().toISOString(),
      });
      return { ok: true };
    });
  },
  async releaseReferral(orderId) {
    await tx((db) => {
      const uses = db.referral_usage.filter((u) => u.order_id === orderId);
      if (!uses.length) return;
      for (const use of uses) {
        const referral = db.referrals.find((r) => r.code.toUpperCase() === use.code.toUpperCase());
        if (referral && referral.used_count > 0) referral.used_count -= 1;
      }
      db.referral_usage = db.referral_usage.filter((u) => u.order_id !== orderId);
    });
  },

  /* payments */
  async listPayments() {
    const db = await load();
    return [...db.payments].sort((a, b) => b.created_at.localeCompare(a.created_at));
  },
  async updatePayment(id, patch) {
    return tx((db) => {
      const i = db.payments.findIndex((p) => p.id === id);
      if (i < 0) throw new Error("Payment not found");
      db.payments[i] = { ...db.payments[i], ...patch };
      return db.payments[i];
    });
  },

  /* promos */
  async listPromos() {
    const db = await load();
    return [...db.promos].sort((a, b) => b.created_at.localeCompare(a.created_at));
  },
  async getPromoByCode(code) {
    const db = await load();
    return db.promos.find((p) => p.code.toUpperCase() === code.trim().toUpperCase()) ?? null;
  },
  async createPromo(data) {
    return tx((db) => {
      const promo: PromoCode = {
        ...data,
        code: data.code.toUpperCase().trim(),
        id: uid("promo"),
        used_count: 0,
        created_at: new Date().toISOString(),
      };
      db.promos.unshift(promo);
      return promo;
    });
  },
  async updatePromo(id, patch) {
    return tx((db) => {
      const i = db.promos.findIndex((p) => p.id === id);
      if (i < 0) throw new Error("Promo not found");
      db.promos[i] = { ...db.promos[i], ...patch };
      if (patch.code) db.promos[i].code = patch.code.toUpperCase().trim();
      return db.promos[i];
    });
  },
  async deletePromo(id) {
    await tx((db) => {
      db.promos = db.promos.filter((p) => p.id !== id);
    });
  },

  /* reviews */
  async listReviews(opts) {
    const db = await load();
    const rows = opts?.approvedOnly ? db.reviews.filter((r) => r.is_approved) : db.reviews;
    return [...rows].sort((a, b) => b.created_at.localeCompare(a.created_at));
  },
  async getReviewByOrder(orderId) {
    const db = await load();
    return db.reviews.find((r) => r.order_id === orderId) ?? null;
  },
  async createReview(data) {
    return tx((db) => {
      const review: Review = {
        ...data,
        id: uid("rev"),
        is_approved: false,
        created_at: new Date().toISOString(),
      };
      db.reviews.unshift(review);
      return review;
    });
  },
  async updateReview(id, patch) {
    return tx((db) => {
      const i = db.reviews.findIndex((r) => r.id === id);
      if (i < 0) throw new Error("Review not found");
      db.reviews[i] = { ...db.reviews[i], ...patch };
      return db.reviews[i];
    });
  },
  async deleteReview(id) {
    await tx((db) => {
      db.reviews = db.reviews.filter((r) => r.id !== id);
    });
  },

  /* blog */
  async listPosts(opts) {
    const db = await load();
    const rows = opts?.publishedOnly ? db.posts.filter((p) => p.is_published) : db.posts;
    return [...rows].sort((a, b) =>
      (b.published_at ?? b.created_at).localeCompare(a.published_at ?? a.created_at),
    );
  },
  async getPostBySlug(slug) {
    const db = await load();
    return db.posts.find((p) => p.slug === slug) ?? null;
  },
  async createPost(data) {
    return tx((db) => {
      const post: BlogPost = {
        ...data,
        id: uid("post"),
        slug: data.slug || slugify(data.title),
        created_at: new Date().toISOString(),
        published_at: data.is_published ? new Date().toISOString() : null,
      };
      db.posts.unshift(post);
      return post;
    });
  },
  async updatePost(id, patch) {
    return tx((db) => {
      const i = db.posts.findIndex((p) => p.id === id);
      if (i < 0) throw new Error("Post not found");
      db.posts[i] = { ...db.posts[i], ...patch };
      if (patch.title && !patch.slug) db.posts[i].slug = slugify(patch.title);
      if (patch.is_published && !db.posts[i].published_at) {
        db.posts[i].published_at = new Date().toISOString();
      }
      return db.posts[i];
    });
  },
  async deletePost(id) {
    await tx((db) => {
      db.posts = db.posts.filter((p) => p.id !== id);
    });
  },

  /* banners */
  async listBanners(opts) {
    const db = await load();
    const rows = opts?.activeOnly ? db.banners.filter((b) => b.is_active) : db.banners;
    return [...rows].sort((a, b) => Number(b.is_active) - Number(a.is_active));
  },
  async createBanner(data) {
    return tx((db) => {
      const banner: Banner = { ...data, id: uid("banner") };
      db.banners.unshift(banner);
      return banner;
    });
  },
  async updateBanner(id, patch) {
    return tx((db) => {
      const i = db.banners.findIndex((b) => b.id === id);
      if (i < 0) throw new Error("Banner not found");
      db.banners[i] = { ...db.banners[i], ...patch };
      return db.banners[i];
    });
  },
  async deleteBanner(id) {
    await tx((db) => {
      db.banners = db.banners.filter((b) => b.id !== id);
    });
  },

  /* notifications */
  async listNotifications() {
    const db = await load();
    return [...db.notifications].sort((a, b) => b.created_at.localeCompare(a.created_at));
  },
  async createNotification(data) {
    return tx((db) => {
      const n: Notification = {
        ...data,
        id: uid("noti"),
        is_read: false,
        created_at: new Date().toISOString(),
      };
      db.notifications.unshift(n);
      return n;
    });
  },
  async markNotificationRead(id) {
    await tx((db) => {
      const n = db.notifications.find((x) => x.id === id);
      if (n) n.is_read = true;
    });
  },

  /* stats */
  async getDashboardStats() {
    return dashboardStats(await load());
  },
};
