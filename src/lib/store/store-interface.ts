import type {
  Banner,
  BlogPost,
  Cake,
  CakeCategory,
  CakeFlavour,
  DashboardStats,
  Notification,
  Order,
  OrderStatusHistory,
  Payment,
  PaymentMethod,
  Profile,
  PromoCode,
  Referral,
  Review,
  Settings,
  PhoneVerification,
  EmailVerification,
  UserOrderStats,
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
  /** Newest first. `limit` keeps the dashboard preview from shipping every row. */
  listUsers(opts?: { limit?: number }): Promise<Profile[]>;
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
  /**
   * Update a customer's own profile fields (name, birthdate, anniversary…).
   * `role` is intentionally absent — privilege escalation must not be possible
   * through a profile edit.
   */
  updateProfile(
    userId: string,
    patch: Partial<Pick<Profile, "name" | "birthdate" | "anniversary_date">>,
  ): Promise<Profile>;
  /**
   * Admin: Block or unblock a user to prevent/allow orders.
   */
  toggleUserBlock(userId: string, isBlocked: boolean): Promise<void>;
  /**
   * Stamp "a wish was sent for this date" so the daily cron never repeats it.
   * Returns `true` only when *this* call won the stamp — the caller must skip
   * the send when it returns `false` (another run already claimed the day).
   */
  markWishSent(
    userId: string,
    kind: "birthday" | "anniversary",
    date: string,
  ): Promise<boolean>;

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

  /* email verification (Resend OTP) */
  saveEmailVerification(data: {
    email: string;
    purpose: EmailVerification["purpose"];
    code_hash: string;
    expires_at: string;
    verified_at?: string | null;
  }): Promise<EmailVerification>;
  getLatestEmailVerification(
    email: string,
    purpose?: EmailVerification["purpose"],
  ): Promise<EmailVerification | null>;
  updateEmailVerification(
    id: string,
    patch: Partial<EmailVerification>,
  ): Promise<EmailVerification>;

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
  listOrders(opts?: { limit?: number }): Promise<Order[]>;
  getOrderById(id: string): Promise<Order | null>;
  getOrderByNo(orderNo: string): Promise<Order | null>;
  listOrdersByPhone(phone: string): Promise<Order[]>;
  listOrdersByUser(userId: string): Promise<Order[]>;
  /**
   * Aggregate one customer's orders (matched by user id and/or phone, so
   * guest orders placed with the same number are counted too).
   */
  getOrderStatsForUser(key: { userId?: string; phone?: string }): Promise<UserOrderStats>;
  findOrderByIdempotencyKey(key: string): Promise<Order | null>;
  /** Link unclaimed guest orders with this phone to the user. */
  claimGuestOrders(userId: string, phone: string): Promise<number>;
  createOrder(input: CreateOrderInput): Promise<Order>;
  updateOrder(id: string, patch: Partial<Order>): Promise<Order>;
  /** 🚩 Mark/unmark an order as a suspected fake order. */
  setOrderFlag(orderId: string, flagged: boolean): Promise<void>;

  /** Status transitions, oldest first. Used by the tracking timeline. */
  listOrderStatusHistory(orderId: string): Promise<OrderStatusHistory[]>;

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
  listPayments(opts?: { orderId?: string; trxId?: string }): Promise<Payment[]>;
  updatePayment(id: string, patch: Partial<Payment>): Promise<Payment>;
  createPayment(input: {
    order_id: string;
    method: PaymentMethod;
    amount: number;
    trx_id?: string | null;
    status: Payment["status"];
  }): Promise<Payment>;

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

  /* catalog lists (categories / flavours, admin CRUD) */
  listCategories(activeOnly?: boolean): Promise<CakeCategory[]>;
  createCategory(name: string): Promise<CakeCategory>;
  updateCategory(id: string, patch: Partial<CakeCategory>): Promise<CakeCategory>;
  deleteCategory(id: string): Promise<void>;
  listFlavours(activeOnly?: boolean): Promise<CakeFlavour[]>;
  createFlavour(name: string): Promise<CakeFlavour>;
  updateFlavour(id: string, patch: Partial<CakeFlavour>): Promise<CakeFlavour>;
  deleteFlavour(id: string): Promise<void>;

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
