export type Role = "customer" | "admin";

export type Occasion = "birthday" | "anniversary" | "occasion" | "gift" | "others";

export type OrderStatus =
  | "pending"
  | "confirmed"
  | "baking"
  | "out_for_delivery"
  | "delivered"
  | "completed"
  | "cancelled";

export type PaymentMethod = "cod" | "bkash";
export type PaymentStatus = "unpaid" | "pending_verify" | "paid" | "refunded";

export interface Profile {
  id: string;
  name: string;
  phone: string;
  email?: string;
  role: Role;
  created_at: string;
}

export interface CakeSize {
  id: string;
  cake_id: string;
  /** weight in pounds, e.g. 0.5 | 1 | 2 | 3 */
  weight: number;
  price: number;
  is_available: boolean;
}

export interface Cake {
  id: string;
  name: string;
  slug: string;
  description: string;
  flavor: string;
  category: string;
  occasions: Occasion[];
  image_urls: string[];
  /** base price (fallback when no size rows) */
  base_price: number;
  is_custom_available: boolean;
  is_featured: boolean;
  is_active: boolean;
  stock: number;
  created_at: string;
  sizes?: CakeSize[];
}

export interface OrderItem {
  cake_id: string;
  name: string;
  slug: string;
  image?: string;
  weight?: number;
  unit_price: number;
  quantity: number;
}

export interface Order {
  id: string;
  order_no: string;
  user_id?: string | null;
  customer_name: string;
  phone: string;
  email?: string;
  occasion: Occasion;
  items: OrderItem[];
  /** custom cake specification */
  custom_spec?: {
    design_notes?: string;
    message_on_cake?: string;
    servings?: number;
    reference_image?: string;
    budget?: number;
  } | null;
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
  payment_method: PaymentMethod;
  payment_status: PaymentStatus;
  bkash_trx_id?: string | null;
  order_status: OrderStatus;
  note?: string;
  review_requested_at?: string | null;
  idempotency_key?: string | null;
  created_at: string;
  updated_at: string;
}

export interface Payment {
  id: string;
  order_id: string;
  method: PaymentMethod;
  amount: number;
  trx_id?: string | null;
  status: PaymentStatus;
  verified_by?: string | null;
  created_at: string;
}

export interface PromoCode {
  id: string;
  code: string;
  /** 1-100 percent */
  percent: number;
  min_order: number;
  max_discount: number;
  usage_limit: number;
  used_count: number;
  expires_at?: string | null;
  is_active: boolean;
  created_at: string;
}

export interface Referral {
  id: string;
  code: string;
  owner_id: string;
  used_count: number;
  max_uses: number;
  is_active: boolean;
  expires_at?: string | null;
  created_at?: string;
}

export type VerificationPurpose = "register" | "reset" | "claim";

export interface PhoneVerification {
  id: string;
  phone: string;
  phone_key: string;
  purpose: VerificationPurpose;
  code_hash: string;
  expires_at: string;
  attempts: number;
  verified_at?: string | null;
  consumed_at?: string | null;
  created_at: string;
}

export interface Review {
  id: string;
  order_id: string;
  customer_name: string;
  rating: number;
  comment: string;
  cake_slug?: string | null;
  is_approved: boolean;
  created_at: string;
}

export interface BlogPost {
  id: string;
  title: string;
  slug: string;
  excerpt: string;
  content: string;
  cover_image?: string | null;
  meta_title?: string | null;
  meta_description?: string | null;
  is_published: boolean;
  published_at?: string | null;
  created_at: string;
}

export interface Banner {
  id: string;
  title: string;
  subtitle?: string | null;
  cta_text?: string | null;
  cta_link?: string | null;
  /** ISO date; countdown target */
  ends_at?: string | null;
  is_active: boolean;
}

export interface Notification {
  id: string;
  user_id?: string | null;
  type: "order" | "payment" | "review" | "system";
  title: string;
  message: string;
  is_read: boolean;
  created_at: string;
}

export interface Settings {
  store_name: string;
  tagline: string;
  phone: string;
  whatsapp_phone: string;
  email: string;
  address: string;
  bkash_number: string;
  delivery_charge: number;
  free_delivery_min: number;
  free_delivery_enabled: boolean;
  cod_enabled: boolean;
  bkash_enabled: boolean;
  instagram?: string;
  facebook?: string;
}

/* ---------- derived / report shapes ---------- */

export interface DashboardStats {
  total_orders: number;
  pending_orders: number;
  delivered_orders: number;
  revenue: number;
  total_products: number;
  total_reviews: number;
  avg_rating: number;
  orders_by_occasion: { name: string; value: number }[];
  orders_by_payment: { name: string; value: number }[];
  promo_usage: { name: string; value: number }[];
  revenue_by_day: { day: string; revenue: number }[];
}
