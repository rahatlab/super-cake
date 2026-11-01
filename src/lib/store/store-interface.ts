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

export interface CreateOrderInput {
  customer_name: string;
  phone: string;
  email?: string;
  occasion: Order["occasion"];
  items: Order["items"];
  custom_spec?: Order["custom_spec"];
  address: string;
  delivery_date: string;
  delivery_slot?: string;
  subtotal: number;
  promo_code?: string | null;
  discount_amount: number;
  referral_code?: string | null;
  referral_discount: number;
  delivery_charge: number;
  total: number;
  payment_method: Order["payment_method"];
  bkash_trx_id?: string | null;
  note?: string;
  user_id?: string | null;
  idempotency_key?: string | null;
}

export interface StoreOperationResult {
  ok: boolean;
  reason?: string;
}

export interface StockLine {
  cake_id: string;
  quantity: number;
}

export interface CakeRating {
  cake_slug: string;
  average_rating: number;
  review_count: number;
}

export interface Store {
  /* settings */
  getSettings(): Promise<Settings>;
  updateSettings(patch: Partial<Settings>): Promise<Settings>;

  /* auth */
  findUserByEmail(email: string): Promise<Profile | null>;
  findUserByPhone(phone: string): Promise<Profile | null>;
  getUserById(id: string): Promise<Profile | null>;
  listUsers(): Promise<Profile[]>;
  createUser(data: {
    name: string;
    phone: string;
    email?: string;
    role: Profile["role"];
    /** already hashed with hashPassword() */
    password: string;
  }): Promise<Profile>;
  /** Internal only — never returned through the public Profile shape. */
  getPasswordHash(userId: string): Promise<string | null>;
  /** Sets an already-hashed password. */
  updatePassword(userId: string, passwordHash: string): Promise<void>;

  /* phone verification (WhatsApp self-send OTP) */
  savePhoneVerification(data: {
    phone: string;
    purpose: PhoneVerification["purpose"];
    code_hash: string;
    expires_at: string;
    verified_at?: string | null;
  }): Promise<PhoneVerification>;
  getLatestPhoneVerification(
    phone: string,
    purpose?: PhoneVerification["purpose"],
  ): Promise<PhoneVerification | null>;
  updatePhoneVerification(
    id: string,
    patch: Partial<PhoneVerification>,
  ): Promise<PhoneVerification>;

  /* cakes */
  listCakes(opts?: { includeInactive?: boolean }): Promise<Cake[]>;
  getCakeById(id: string): Promise<Cake | null>;
  getCakeBySlug(slug: string): Promise<Cake | null>;
  createCake(data: Omit<Cake, "id" | "created_at" | "slug"> & { slug?: string }): Promise<Cake>;
  updateCake(id: string, patch: Partial<Cake>): Promise<Cake>;
  deleteCake(id: string): Promise<void>;
  setCakeSizes(
    cakeId: string,
    sizes: { weight: number; price: number; is_available: boolean }[],
  ): Promise<void>;

  /* orders */
  listOrders(): Promise<Order[]>;
  getOrderById(id: string): Promise<Order | null>;
  getOrderByNo(orderNo: string): Promise<Order | null>;
  listOrdersByPhone(phone: string): Promise<Order[]>;
  listOrdersByUser(userId: string): Promise<Order[]>;
  findOrderByIdempotencyKey(key: string): Promise<Order | null>;
  /** Link unclaimed guest orders with this phone to the user. */
  claimGuestOrders(userId: string, phone: string): Promise<number>;
  createOrder(input: CreateOrderInput): Promise<Order>;
  updateOrder(id: string, patch: Partial<Order>): Promise<Order>;

  /* stock */
  /** Atomically reserve stock for all lines; fails if any line is short. */
  reserveStock(items: StockLine[]): Promise<StoreOperationResult>;
  releaseStock(items: StockLine[]): Promise<void>;

  /* promo / referral usage */
  consumePromo(code: string, orderId: string, phone: string): Promise<StoreOperationResult>;
  releasePromo(orderId: string): Promise<void>;
  getReferralByCode(code: string): Promise<Referral | null>;
  consumeReferral(code: string, orderId: string, phone: string): Promise<StoreOperationResult>;
  releaseReferral(orderId: string): Promise<void>;

  /* payments */
  listPayments(): Promise<Payment[]>;
  updatePayment(id: string, patch: Partial<Payment>): Promise<Payment>;

  /* promos */
  listPromos(): Promise<PromoCode[]>;
  getPromoByCode(code: string): Promise<PromoCode | null>;
  createPromo(data: Omit<PromoCode, "id" | "used_count" | "created_at">): Promise<PromoCode>;
  updatePromo(id: string, patch: Partial<PromoCode>): Promise<PromoCode>;
  deletePromo(id: string): Promise<void>;

  /* reviews */
  listReviews(opts?: { approvedOnly?: boolean }): Promise<Review[]>;
  getCakeRatings(): Promise<CakeRating[]>;
  getReviewByOrder(orderId: string): Promise<Review | null>;
  createReview(data: Omit<Review, "id" | "created_at" | "is_approved">): Promise<Review>;
  updateReview(id: string, patch: Partial<Review>): Promise<Review>;
  deleteReview(id: string): Promise<void>;

  /* blog */
  listPosts(opts?: { publishedOnly?: boolean }): Promise<BlogPost[]>;
  getPostBySlug(slug: string): Promise<BlogPost | null>;
  createPost(data: Omit<BlogPost, "id" | "created_at" | "slug"> & { slug?: string }): Promise<BlogPost>;
  updatePost(id: string, patch: Partial<BlogPost>): Promise<BlogPost>;
  deletePost(id: string): Promise<void>;

  /* banners */
  listBanners(opts?: { activeOnly?: boolean }): Promise<Banner[]>;
  createBanner(data: Omit<Banner, "id">): Promise<Banner>;
  updateBanner(id: string, patch: Partial<Banner>): Promise<Banner>;
  deleteBanner(id: string): Promise<void>;

  /* notifications */
  listNotifications(): Promise<Notification[]>;
  createNotification(data: Omit<Notification, "id" | "created_at" | "is_read">): Promise<Notification>;
  markNotificationRead(id: string): Promise<void>;

  /* stats */
  getDashboardStats(): Promise<DashboardStats>;
}
