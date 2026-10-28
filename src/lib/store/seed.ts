import type {
  Banner,
  BlogPost,
  Cake,
  Notification,
  Order,
  Profile,
  PromoCode,
  Referral,
  Review,
} from "@/lib/types";
import { DEFAULT_SETTINGS } from "@/lib/constants";
import { generateOrderNo, slugify } from "@/lib/utils";
import { hashPassword } from "@/lib/password";
import type { Settings } from "@/lib/types";

const now = Date.now();
const iso = (offsetDays = 0) => new Date(now + offsetDays * 86400_000).toISOString();
const day = (offsetDays = 0) => iso(offsetDays).slice(0, 10);

function sizeRows(cakeId: string, base: number) {
  return [
    { id: `${cakeId}-s05`, cake_id: cakeId, weight: 0.5, price: Math.round((base * 0.55) / 50) * 50, is_available: true },
    { id: `${cakeId}-s1`, cake_id: cakeId, weight: 1, price: base, is_available: true },
    { id: `${cakeId}-s2`, cake_id: cakeId, weight: 2, price: Math.round((base * 1.8) / 50) * 50, is_available: true },
    { id: `${cakeId}-s3`, cake_id: cakeId, weight: 3, price: Math.round((base * 2.5) / 50) * 50, is_available: base < 1800 },
  ];
}

const cakeSeeds: {
  name: string;
  base: number;
  flavor: string;
  category: string;
  occasions: Cake["occasions"];
  desc: string;
  featured?: boolean;
  custom?: boolean;
  img: string;
}[] = [
  {
    name: "Chocolate Truffle Delight",
    base: 1500,
    flavor: "Chocolate Truffle",
    category: "Chocolate",
    occasions: ["birthday", "anniversary", "gift", "occasion"],
    desc: "Rich Belgian chocolate truffle layered with dark chocolate ganache and a silky mousse finish.",
    featured: true,
    img: "chocolate-truffle",
  },
  {
    name: "Red Velvet Romance",
    base: 1700,
    flavor: "Red Velvet",
    category: "Red Velvet",
    occasions: ["anniversary", "gift", "birthday"],
    desc: "Classic red velvet sponge with cream cheese frosting — made for the ones you love.",
    featured: true,
    img: "red-velvet",
  },
  {
    name: "Black Forest Classic",
    base: 1400,
    flavor: "Chocolate Truffle",
    category: "Black Forest",
    occasions: ["birthday", "occasion"],
    desc: "Cherry compote, whipped cream and chocolate shavings over a light cocoa sponge.",
    img: "black-forest",
  },
  {
    name: "Vanilla Dream",
    base: 1200,
    flavor: "Vanilla Cream",
    category: "Vanilla",
    occasions: ["birthday", "gift", "others"],
    desc: "Madagascar vanilla bean sponge with smooth buttercream and a touch of honey.",
    img: "vanilla-dream",
  },
  {
    name: "Oreo Crunch",
    base: 1350,
    flavor: "Oreo",
    category: "Chocolate",
    occasions: ["birthday", "gift"],
    desc: "Crushed oreo cookies folded into vanilla cream — kids' absolute favourite.",
    img: "oreo-crunch",
  },
  {
    name: "Strawberry Bliss",
    base: 1450,
    flavor: "Strawberry",
    category: "Fruit",
    occasions: ["anniversary", "gift", "others"],
    desc: "Fresh strawberry compote between light sponge layers with whipped cream.",
    img: "strawberry-bliss",
  },
  {
    name: "Butterscotch Caramel",
    base: 1300,
    flavor: "Butterscotch",
    category: "Chocolate",
    occasions: ["birthday", "occasion"],
    desc: "Crunchy praline butterscotch with salted caramel drizzle.",
    img: "butterscotch",
  },
  {
    name: "Mango Delight",
    base: 1400,
    flavor: "Mango",
    category: "Fruit",
    occasions: ["occasion", "others", "birthday"],
    desc: "Seasonal mango pulp with cream — summer in a cake.",
    img: "mango-delight",
  },
  {
    name: "Berry Cheesecake",
    base: 1900,
    flavor: "Vanilla Cream",
    category: "Cheesecake",
    occasions: ["anniversary", "gift"],
    desc: "Baked New York cheesecake topped with mixed berry coulis.",
    featured: true,
    img: "berry-cheesecake",
  },
  {
    name: "Kids Cartoon Custom",
    base: 1600,
    flavor: "Vanilla Cream",
    category: "Custom",
    occasions: ["birthday", "others"],
    desc: "Fully custom hand-painted cartoon theme cake — tell us the character and we bake it.",
    featured: true,
    custom: true,
    img: "kids-cartoon",
  },
];

export const SEED_SETTINGS: Settings = { ...DEFAULT_SETTINGS };

export function buildSeedCakes(): Cake[] {
  return cakeSeeds.map((c, i) => {
    const id = `cake_${i + 1}`;
    return {
      id,
      name: c.name,
      slug: slugify(c.name),
      description: c.desc,
      flavor: c.flavor,
      category: c.category,
      occasions: c.occasions,
      image_urls: [`/cakes/${c.img}-1.svg`, `/cakes/${c.img}-2.svg`, `/cakes/${c.img}-3.svg`],
      base_price: c.base,
      is_custom_available: !!c.custom,
      is_featured: !!c.featured,
      is_active: true,
      stock: i === 4 ? 0 : 12,
      created_at: iso(-30 + i),
      sizes: sizeRows(id, c.base),
    };
  });
}

export function buildSeedUsers(): (Profile & { password: string })[] {
  return [
    {
      id: "u_admin",
      name: "Super Cake Admin",
      phone: "01700000000",
      email: "admin@supercake.com",
      role: "admin",
      created_at: iso(-60),
      password: hashPassword("admin1234"),
    },
    {
      id: "u_demo",
      name: "Rafiq Hasan",
      phone: "01812345678",
      email: "rafiq@example.com",
      role: "customer",
      created_at: iso(-20),
      password: hashPassword("demo1234"),
    },
  ];
}

const NAMES = ["Rafiq Hasan", "Nusrat Jahan", "Tanvir Ahmed", "Sadia Islam", "Mehedi Hasan", "Farhana Akter"];
const ADDRESSES = [
  "House 12, Road 5, Dhanmondi, Dhaka",
  "Flat 4B, Bashundhara R/A, Dhaka",
  "House 45, Gulshan 2, Dhaka",
  "Mirpur DOHS, Dhaka",
  "Uttara Sector 7, Dhaka",
  "Banani, Dhaka",
];

export function buildSeedOrders(cakes: Cake[]): Order[] {
  const statuses = [
    "completed",
    "completed",
    "delivered",
    "delivered",
    "completed",
    "out_for_delivery",
    "baking",
    "confirmed",
    "confirmed",
    "pending",
    "pending",
    "completed",
    "delivered",
    "cancelled",
  ] as const;

  const methods = ["cod", "bkash"] as const;
  const occasionList = ["birthday", "anniversary", "gift", "birthday", "occasion", "others"] as const;

  return statuses.map((status, i) => {
    const cake = cakes[i % cakes.length];
    const size = cake.sizes?.[1] ?? { price: cake.base_price, weight: 1 };
    const qty = (i % 3) + 1;
    const subtotal = size.price * qty;
    const promoApplied = i % 4 === 0;
    const discount = promoApplied ? Math.round(subtotal * 0.1) : 0;
    const delivery = i % 5 === 0 ? 0 : 80;
    const total = subtotal - discount + delivery;
    const method = methods[i % 2];
    const orderNo = generateOrderNo();
    return {
      id: `ord_${i + 1}`,
      order_no: orderNo,
      user_id: i === 0 ? "u_demo" : null,
      customer_name: NAMES[i % NAMES.length],
      phone: `018${String(10000000 + i * 137).slice(0, 8)}`,
      email: undefined,
      occasion: occasionList[i % occasionList.length],
      items: [
        {
          cake_id: cake.id,
          name: cake.name,
          slug: cake.slug,
          image: cake.image_urls[0],
          weight: size.weight,
          unit_price: size.price,
          quantity: qty,
        },
      ],
      custom_spec:
        cake.is_custom_available && i % 2 === 0
          ? { message_on_cake: "Happy Birthday Ayaan!", design_notes: "Blue dinosaur theme", servings: 20, budget: 2000 }
          : null,
      address: ADDRESSES[i % ADDRESSES.length],
      delivery_date: day(-6 + i),
      delivery_slot: "evening",
      subtotal,
      promo_code: promoApplied ? "WELCOME10" : null,
      discount_amount: discount,
      referral_code: null,
      referral_discount: 0,
      delivery_charge: delivery,
      total,
      payment_method: method,
      payment_status:
        status === "cancelled" ? "refunded" : method === "cod" ? "unpaid" : status === "pending" ? "pending_verify" : "paid",
      bkash_trx_id: method === "bkash" ? `9F${String(784200 + i)}KX` : null,
      order_status: status,
      note: i === 3 ? "Please deliver before 6pm" : undefined,
      created_at: iso(-6 + i),
      updated_at: iso(-5 + i),
    } as Order;
  });
}

export function buildSeedPromos(): PromoCode[] {
  return [
    {
      id: "promo_1",
      code: "WELCOME10",
      percent: 10,
      min_order: 500,
      max_discount: 300,
      usage_limit: 500,
      used_count: 42,
      expires_at: day(60),
      is_active: true,
      created_at: iso(-30),
    },
    {
      id: "promo_2",
      code: "EID20",
      percent: 20,
      min_order: 1500,
      max_discount: 800,
      usage_limit: 200,
      used_count: 18,
      expires_at: day(25),
      is_active: true,
      created_at: iso(-10),
    },
    {
      id: "promo_3",
      code: "BDAY15",
      percent: 15,
      min_order: 1000,
      max_discount: 500,
      usage_limit: 100,
      used_count: 100,
      expires_at: day(-2),
      is_active: false,
      created_at: iso(-40),
    },
  ];
}

export function buildSeedReferrals(): Referral[] {
  return [
    {
      id: "ref_1",
      code: "RAFIQ5",
      owner_id: "u_demo",
      used_count: 0,
      max_uses: 100,
      is_active: true,
      expires_at: day(120),
      created_at: iso(-30),
    },
    {
      id: "ref_2",
      code: "SUPER5",
      owner_id: "u_admin",
      used_count: 0,
      max_uses: 50,
      is_active: true,
      expires_at: day(60),
      created_at: iso(-10),
    },
  ];
}

export function buildSeedReviews(cakes: Cake[]): Review[] {
  const rows: [number, number, string][] = [
    [0, 5, "চকলেট ট্রাফল অসাধারণ ছিল! Delivery সময়মতো পেয়েছি, সবাই খুব পছন্দ করেছে। 🎂"],
    [1, 5, "Red velvet cake টা দারুণ। আমার anniversary এ সবাই ভাবলো professional bakery থেকে নিয়েছি।"],
    [4, 4, "Oreo crunch ভালো ছিল, একটু বেশি মিষ্টি হলেও বাচ্চারা ভালোবাসে। আবার নেব।"],
    [8, 5, "Cheesecake টা texture একদম নরম, berry topping fresh। Price ও reasonable।"],
    [9, 5, "Custom cartoon cake টা ঠিক আমার design এর মতো হয়েছে। Thank you Super Cake!"],
  ];
  return rows.map(([idx, rating, comment], i) => ({
    id: `rev_${i + 1}`,
    order_id: `ord_${idx + 1}`,
    customer_name: NAMES[i % NAMES.length],
    rating,
    comment,
    cake_slug: cakes[idx % cakes.length].slug,
    is_approved: true,
    created_at: iso(-4 + i),
  }));
}

export function buildSeedPosts(): BlogPost[] {
  return [
    {
      id: "post_1",
      title: "কেক কেন অর্ডার করার আগে যা যা খেয়াল রাখবেন",
      slug: "cake-ordering-guide",
      excerpt: "সঠিক weight, flavour, delivery date ও budget — অনলাইনে কেক অর্ডার করার সম্পূর্ণ গাইড।",
      content:
        "## কেন এত জরুরি?\\n\\nএকটা কেক শুধু dessert নয়, এটা উদ্‌যাপনের কেন্দ্রবিন্দু। সঠিক কেক না বেছে নিলে পুরো অনুষ্ঠানের mood বদলে যেতে পারে।\\n\\n## ১. Weight ঠিক করুন\\n\\nসাধারণভাবে প্রতি জনের জন্য আধা পাউন্ড হিসাব ধরুন। ১০ জনের অনুষ্ঠান হলে ৫ পাউন্ড কেক নিশ্চিত করুন।\\n\\n## ২. Flavour ও occasion মেলান\\n\\n- জন্মদিন → Chocolate, Red Velvet\\n- বার্ষিকী → Red Velvet, Cheesecake\\n- বাচ্চাদের অনুষ্ঠান → Oreo, Vanilla\\n\\n## ৩. Delivery date অন্তত ২ দিন আগে\\n\\nCustom cake তৈরিতে সময় লাগে। আমরা অন্তত ৪৮ ঘণ্টা আগে অর্ডার নেওয়ার পরামর্শ দিই।\\n\\n## ৪. Message on cake\\n\\nছোট ও স্পষ্ট লেখা সবচেয়ে সুন্দর দেখায়। ২০ অক্ষরের মধ্যে রাখলে piping একদম clean হয়।",
      cover_image: "/cakes/chocolate-truffle-1.svg",
      meta_title: "অনলাইনে কেক অর্ডার করার সম্পূর্ণ গাইড | Super Cake",
      meta_description: "সঠিক weight, flavour, delivery date ও budget বেছে নেওয়ার গাইড। Super Cake থেকে সহজে কেক অর্ডার করুন।",
      is_published: true,
      published_at: iso(-12),
      created_at: iso(-12),
    },
    {
      id: "post_2",
      title: "Birthday Cake Trends 2026: এবার কী ফ্যাশনে?",
      slug: "birthday-cake-trends-2026",
      excerpt: "Photo-print cake, minimalist drip, এবং earth-tone design — এ বছরের সবচেয়ে জনপ্রিয় ট্রেন্ড।",
      content:
        "## Minimalist এর যুগ\\n\\n২০২৬ সালে customer রা কম color, বেশি texture চাইছেন। Smooth buttercream finish ও neutral tone সবচেয়ে বেশি অর্ডার হচ্ছে।\\n\\n## Photo-print cake\\n\\nEdible print দিয়ে ছবি বসানো cake corporate event ও anniversary এ অনেক জনপ্রিয়।\\n\\n## Earth tone palette\\n\\nSage green, dusty rose ও chocolate brown — এই তিন রঙ দিয়ে বানানো design এ বছরের trend।\\n\\nআমাদের custom order এ আপনি যেকোনো reference image পাঠাতে পারেন, আমরা সেটা বাস্তবায়ন করি।",
      cover_image: "/cakes/red-velvet-1.svg",
      meta_title: "Birthday Cake Trends 2026 | Super Cake Blog",
      meta_description: "২০২৬ সালের birthday cake trend — photo-print, minimalist drip ও earth-tone design।",
      is_published: true,
      published_at: iso(-5),
      created_at: iso(-5),
    },
    {
      id: "post_3",
      title: "bKash দিয়ে কেক অর্ডার পেমেন্ট: ধাপে ধাপে নির্দেশনা",
      slug: "bkash-payment-guide",
      excerpt: "Send Money করে TrxID সাবমিট করুন, আমরা ১০ মিনিটের মধ্যে অর্ডার কনফার্ম করব।",
      content:
        "## ধাপ ১: bKash Send Money\\n\\nআমাদের bKash নম্বরে Send Money করুন এবং TrxID কপি করুন।\\n\\n## ধাপ ২: TrxID সাবমিট\\n\\nCheckout page এ payment method হিসেবে bKash বেছে নিয়ে TrxID বসান।\\n\\n## ধাপ ৩: ভেরিফিকেশন\\n\\nআমাদের admin টি ১০ মিনিটের মধ্যে payment verify করে WhatsApp এ confirm করেন।\\n\\n## Cash on Delivery\\n\\nঢাকার ভিতরে আপনি Cash on Delivery এও পেমেন্ট করতে পারেন।",
      cover_image: "/cakes/vanilla-dream-1.svg",
      meta_title: "bKash Payment Guide | Super Cake",
      meta_description: "Super Cake এ bKash দিয়ে পেমেন্ট করার ধাপে ধাপে নির্দেশনা।",
      is_published: true,
      published_at: iso(-2),
      created_at: iso(-2),
    },
  ];
}

export function buildSeedBanners(): Banner[] {
  return [
    {
      id: "banner_1",
      title: "ঈদ মোবারক অফার — সব কেকে ২০% ছাড়",
      subtitle: "কোড EID20 ব্যবহার করুন। ফ্রি ডেলিভারি ৳২,০০০+ অর্ডারে",
      cta_text: "অর্ডার করুন",
      cta_link: "/cakes",
      ends_at: iso(7),
      is_active: true,
    },
  ];
}

export function buildSeedNotifications(): Notification[] {
  return [
    {
      id: "noti_1",
      user_id: "u_admin",
      type: "order",
      title: "নতুন অর্ডার",
      message: "ord_11 — Rafiq Hasan ৳1,280 এর অর্ডার দিয়েছেন।",
      is_read: false,
      created_at: iso(0),
    },
    {
      id: "noti_2",
      user_id: "u_admin",
      type: "payment",
      title: "bKash TrxID এসেছে",
      message: "ord_8 এর TrxID ভেরিফাই করুন।",
      is_read: false,
      created_at: iso(-1),
    },
    {
      id: "noti_3",
      user_id: "u_admin",
      type: "review",
      title: "নতুন রিভিউ",
      message: "Nusrat Jahan ৫ স্টার রিভিউ দিয়েছেন।",
      is_read: true,
      created_at: iso(-2),
    },
  ];
}
