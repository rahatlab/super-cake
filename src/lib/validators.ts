import { z } from "zod";
import { MIN_DELIVERY_LEAD_DAYS } from "./constants";
import { dateOnlyUtc, dhakaDatePlus, phoneKey } from "./utils";

export const phoneSchema = z
  .string()
  .trim()
  .min(10, "সঠিক ফোন নম্বর দিন")
  .max(20, "সঠিক ফোন নম্বর দিন")
  .regex(/^[0-9+\-\s()]+$/, "সঠিক ফোন নম্বর দিন")
  .refine((v) => {
    const digits = phoneKey(v);
    return digits.length >= 10 && digits.length <= 15;
  }, "সঠিক ফোন নম্বর দিন");

export const emailSchema = z
  .string()
  .trim()
  .max(160)
  .email("সঠিক ইমেইল দিন")
  .transform((v) => v.toLowerCase());

export const optionalEmailSchema = z
  .union([z.literal(""), emailSchema])
  .optional()
  .transform((v) => v || "");

export const passwordSchema = z
  .string()
  .min(8, "পাসওয়ার্ড অন্তত ৮ অক্ষর হতে হবে")
  .max(128, "পাসওয়ার্ড ১২৮ অক্ষরের বেশি হতে পারে না");

export const occasionSchema = z.enum(["birthday", "anniversary", "occasion", "gift", "others"]);

export const orderItemSchema = z.object({
  cake_id: z.string().min(1),
  name: z.string().min(1).max(120),
  slug: z.string().min(1).max(160),
  image: z.string().max(500).optional(),
  weight: z.number().positive().optional(),
  unit_price: z.number().nonnegative(),
  quantity: z.number().int().min(1).max(20),
});

export const deliverySlotSchema = z.enum(["morning", "afternoon", "evening", "night"]);

export { MIN_DELIVERY_LEAD_DAYS };

export function validateDeliveryDate(value: string): string | null {
  const parsed = dateOnlyUtc(value);
  if (parsed == null) return "সঠিক ডেলিভারি তারিখ দিন";
  const earliest = dateOnlyUtc(dhakaDatePlus(MIN_DELIVERY_LEAD_DAYS));
  if (earliest == null) return "সঠিক ডেলিভারি তারিখ দিন";
  if (parsed < earliest) {
    return `ডেলিভারির জন্য অন্তত ${MIN_DELIVERY_LEAD_DAYS} দিন আগে অর্ডার করতে হবে`;
  }
  const latest = dateOnlyUtc(dhakaDatePlus(120));
  if (latest != null && parsed > latest) return "ডেলিভারি তারিখ ১২০ দিনের মধ্যে দিন";
  return null;
}

export const trxIdSchema = z
  .string()
  .trim()
  .transform((v) => v.toUpperCase())
  .refine((v) => /^[A-Z0-9]{8,20}$/.test(v), "TrxID ৮–২০ অক্ষরের ইংরেজি অক্ষর/সংখ্যা হতে হবে");

export const checkoutSchema = z
  .object({
    customer_name: z.string().trim().min(2, "নাম দিন").max(80),
    phone: phoneSchema,
    email: optionalEmailSchema,
    occasion: occasionSchema,
    items: z.array(orderItemSchema).min(1, "কার্ট খালি").max(20),
    custom_spec: z
      .object({
        design_notes: z.string().max(500).optional(),
        message_on_cake: z.string().max(60).optional(),
        servings: z.number().int().min(1).max(200).optional(),
        reference_image: z.string().max(500).optional(),
        budget: z.number().nonnegative().optional(),
      })
      .optional()
      .nullable(),
    address: z.string().trim().min(5, "সম্পূর্ণ ঠিকানা দিন").max(250),
    delivery_date: z.string().min(1, "ডেলিভারি তারিখ দিন"),
    delivery_slot: deliverySlotSchema,
    promo_code: z.string().trim().max(30).optional().nullable(),
    referral_code: z.string().trim().max(30).optional().nullable(),
    payment_method: z.enum(["cod", "bkash"]),
    bkash_trx_id: z.string().trim().max(40).optional().nullable(),
    note: z.string().trim().max(300).optional(),
    /** client-calculated totals — always re-validated server side */
    subtotal: z.number().nonnegative(),
    discount_amount: z.number().nonnegative(),
    referral_discount: z.number().nonnegative(),
    delivery_charge: z.number().nonnegative(),
    total: z.number().nonnegative(),
  })
  .superRefine((data, ctx) => {
    const dateError = validateDeliveryDate(data.delivery_date);
    if (dateError) ctx.addIssue({ code: "custom", message: dateError, path: ["delivery_date"] });

    if (data.payment_method === "bkash") {
      const raw = (data.bkash_trx_id ?? "").trim();
      if (!raw) {
        ctx.addIssue({ code: "custom", message: "bKash TrxID দিন।", path: ["bkash_trx_id"] });
      } else if (!/^[A-Z0-9]{8,20}$/i.test(raw)) {
        ctx.addIssue({
          code: "custom",
          message: "TrxID ৮–২০ অক্ষরের ইংরেজি অক্ষর/সংখ্যা হতে হবে",
          path: ["bkash_trx_id"],
        });
      }
    }
  });

export const customOrderSchema = checkoutSchema;

export const reviewSchema = z.object({
  order_id: z.string().min(1).max(100),
  access_token: z.string().min(1).max(500).optional(),
  customer_name: z.string().trim().min(2, "নাম দিন").max(80),
  rating: z.number().int().min(1, "১-৫ স্টার দিন").max(5),
  comment: z.string().trim().min(3, "কমপক্ষে ৩ অক্ষর লিখুন").max(500),
});

export const cakeSchema = z.object({
  name: z.string().trim().min(2, "কেকের নাম দিন").max(100),
  description: z.string().max(600).default(""),
  flavor: z.string().min(1, "Flavour দিন").max(60),
  category: z.string().min(1, "Category দিন").max(60),
  occasions: z.array(occasionSchema).min(1, "অন্তত একটা occasion বাছুন"),
  image_urls: z.array(z.string().max(500)).min(1, "অন্তত একটা ছবি দিন").max(8),
  base_price: z.number().int().min(0),
  is_custom_available: z.boolean().default(false),
  is_featured: z.boolean().default(false),
  is_active: z.boolean().default(true),
  stock: z.number().int().min(0).max(100000).default(10),
  sizes: z
    .array(
      z.object({
        weight: z.number().positive().max(50),
        price: z.number().int().min(0).max(1_000_000),
        is_available: z.boolean(),
      }),
    )
    .max(20)
    .default([]),
});

export const promoSchema = z.object({
  code: z.string().trim().min(3, "কোড দিন").max(24),
  percent: z.number().int().min(1, "১-১০০%").max(100, "১০০% এর বেশি হতে পারে না"),
  min_order: z.number().int().min(0).default(0),
  max_discount: z.number().int().min(0).default(0),
  usage_limit: z.number().int().min(1).default(100),
  expires_at: z.string().optional().nullable(),
  is_active: z.boolean().default(true),
});

export const postSchema = z.object({
  title: z.string().min(3, "টাইটেল দিন").max(160),
  excerpt: z.string().max(300).default(""),
  content: z.string().min(10, "কন্টেন্ট লিখুন"),
  cover_image: z.string().max(500).optional().nullable(),
  meta_title: z.string().max(160).optional().nullable(),
  meta_description: z.string().max(300).optional().nullable(),
  is_published: z.boolean().default(false),
});

export const registerSchema = z.object({
  name: z.string().trim().min(2, "নাম দিন").max(80),
  phone: phoneSchema,
  email: optionalEmailSchema,
  password: passwordSchema,
});

/** Phone ownership is proven separately through the WhatsApp OTP record. */
export const resetPasswordSchema = z
  .object({
    phone: phoneSchema,
    new_password: passwordSchema,
    confirm_password: z.string().min(1, "নতুন পাসওয়ার্ড আবার লিখুন").max(128),
  })
  .refine((d) => d.new_password === d.confirm_password, {
    message: "নতুন পাসওয়ার্ড দুইবার একই লিখুন",
    path: ["confirm_password"],
  });

export const loginSchema = z.object({
  identifier: z.string().trim().min(3, "ইমেইল/ফোন দিন").max(160),
  password: z.string().min(1, "পাসওয়ার্ড দিন").max(128),
});

export const settingsSchema = z.object({
  store_name: z.string().min(2),
  tagline: z.string().max(120),
  phone: phoneSchema,
  whatsapp_phone: phoneSchema,
  email: z.string().email(),
  address: z.string().max(200),
  bkash_number: phoneSchema,
  delivery_charge: z.number().int().min(0),
  free_delivery_min: z.number().int().min(0),
  free_delivery_enabled: z.boolean(),
  cod_enabled: z.boolean(),
  bkash_enabled: z.boolean(),
  instagram: z.string().max(200).optional(),
  facebook: z.string().max(200).optional(),
});

export const trackSchema = z.object({
  order_no: z.string().trim().min(3, "অর্ডার আইডি দিন").max(60),
  phone: phoneSchema,
});

export const changePasswordSchema = z
  .object({
    current_password: z.string().min(1, "বর্তমান পাসওয়ার্ড দিন").max(128),
    new_password: passwordSchema,
    confirm_password: z.string().min(1, "নতুন পাসওয়ার্ড আবার লিখুন").max(128),
  })
  .refine((d) => d.new_password === d.confirm_password, {
    message: "নতুন পাসওয়ার্ড দুইবার একই লিখুন",
    path: ["confirm_password"],
  })
  .refine((d) => d.new_password !== d.current_password, {
    message: "নতুন পাসওয়ার্ড আগেরটার মতোই — ভিন্ন কিছু দিন",
    path: ["new_password"],
  });

export const otpRequestSchema = z.object({
  phone: phoneSchema,
  purpose: z.enum(["register", "reset", "claim"]),
});

export const otpVerifySchema = z.object({
  phone: phoneSchema,
  code: z.string().trim().regex(/^\d{6}$/, "৬ সংখ্যার কোড দিন"),
});

export const cartLeadSchema = z.object({
  token: z.string().min(1).max(500),
  customer_name: z.string().max(80).optional(),
  items: z
    .array(
      z.object({
        cake_id: z.string().max(100).optional(),
        name: z.string().max(120).optional(),
        quantity: z.number().int().min(1).max(20).optional(),
      }).catchall(z.unknown()),
    )
    .min(1)
    .max(20),
  subtotal: z.number().nonnegative().max(1_000_000),
  opted_in: z.boolean(),
});

export type CheckoutInput = z.infer<typeof checkoutSchema>;
export type CakeInput = z.infer<typeof cakeSchema>;
export type PromoInput = z.infer<typeof promoSchema>;
export type PostInput = z.infer<typeof postSchema>;
export type RegisterInput = z.infer<typeof registerSchema>;
export type CartLeadInput = z.infer<typeof cartLeadSchema>;
