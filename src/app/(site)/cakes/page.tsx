import type { Metadata } from "next";
import Link from "next/link";
import { getStore } from "@/lib/store";
import { CATEGORIES, OCCASIONS } from "@/lib/constants";
import { CakeCard } from "@/components/cake-card";
import { CatalogFilters } from "@/components/catalog-filters";
import { breadcrumbLd, ldJson } from "@/lib/seo";
import { Suspense } from "react";

export const metadata: Metadata = {
  title: "সব কেক — Custom & Birthday Cakes",
  description:
    "Super Cake এর সম্পূর্ণ কালেকশন: chocolate, red velvet, cheesecake ও custom cake। ½ থেকে ৩ পাউন্ড পর্যন্ত ওজন ও দাম দেখে অর্ডার করুন।",
  alternates: { canonical: "/cakes" },
  openGraph: {
    title: "কেক সমূহ | Super Cake",
    description: "birthday, anniversary ও custom cake — সব এক জায়গায়",
    url: "/cakes",
    type: "website",
  },
};

interface Search {
  q?: string;
  occasion?: string;
  category?: string;
  sort?: string;
}

export default async function CakesPage({
  searchParams,
}: {
  searchParams: Promise<Search>;
}) {
  const sp = await searchParams;
  const store = getStore();
  const [cakes, reviews, settings] = await Promise.all([
    store.listCakes(),
    store.listReviews({ approvedOnly: true }),
    store.getSettings(),
  ]);

  const q = (sp.q ?? "").trim().toLowerCase();
  const occasion = sp.occasion ?? "";
  const category = sp.category ?? "";
  const sort = sp.sort ?? "popular";

  let list = cakes.filter((c) => c.is_active);

  if (q) {
    list = list.filter((c) =>
      [c.name, c.flavor, c.category, c.description].join(" ").toLowerCase().includes(q),
    );
  }
  if (occasion) list = list.filter((c) => c.occasions.includes(occasion as never));
  if (category) list = list.filter((c) => c.category === category);

  const ratingMap = new Map<string, { total: number; count: number }>();
  for (const r of reviews) {
    if (!r.cake_slug) continue;
    const cur = ratingMap.get(r.cake_slug) ?? { total: 0, count: 0 };
    cur.total += r.rating;
    cur.count += 1;
    ratingMap.set(r.cake_slug, cur);
  }

  list = [...list].sort((a, b) => {
    const ra = ratingMap.get(a.slug);
    const rb = ratingMap.get(b.slug);
    const score = (r?: { total: number; count: number }) => (r && r.count ? r.total / r.count : 0);
    if (sort === "price_low") return a.base_price - b.base_price;
    if (sort === "price_high") return b.base_price - a.base_price;
    if (sort === "rating") return score(rb) - score(ra);
    if (sort === "newest") return b.created_at.localeCompare(a.created_at);
    // popular = featured first, then rating
    return Number(b.is_featured) - Number(a.is_featured) || score(rb) - score(ra);
  });

  const activeOccasion = OCCASIONS.find((o) => o.value === occasion);

  return (
    <div className="container-page py-8">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: ldJson(
            breadcrumbLd([
              { name: "হোম", item: "/" },
              { name: "কেক সমূহ", item: "/cakes" },
            ]),
          ),
        }}
      />

      <header className="mb-6">
        <nav className="mb-3 flex flex-wrap items-center gap-1.5 text-xs text-muted">
          <Link href="/" className="hover:text-brand-strong">
            হোম
          </Link>
          <span>/</span>
          <span className="font-semibold text-fg">কেক সমূহ</span>
        </nav>

        <h1 className="text-3xl font-extrabold sm:text-4xl">
          {activeOccasion ? (
            <>
              <span aria-hidden>{activeOccasion.emoji}</span> {activeOccasion.label} Cakes
              <span className="ml-2 text-lg font-semibold text-muted">· {activeOccasion.bn}</span>
            </>
          ) : (
            <>
              আমাদের <span className="text-gradient">কালেকশন</span>
            </>
          )}
        </h1>
        <p className="mt-2 text-sm text-muted">
          {list.length} টি কেক পাওয়া গেছে · সবগুলো অর্ডারের পরে তাজা তৈরি
        </p>
      </header>

      <Suspense fallback={<div className="skeleton h-24 w-full" />}>
        <CatalogFilters categories={CATEGORIES} occasions={OCCASIONS} />
      </Suspense>

      {list.length === 0 ? (
        <div className="card mt-8 flex flex-col items-center gap-3 px-6 py-16 text-center">
          <span className="text-5xl">🔎</span>
          <h2 className="text-lg font-bold">এই ফিল্টারে কোনো কেক পাওয়া যায়নি</h2>
          <p className="max-w-sm text-sm text-muted">
            অন্য ফিল্টার চেষ্টা করুন, অথবা আমাদের কাস্টম কেক অর্ডার করুন — আপনার ডিজাইনে বানিয়ে দিচ্ছি।
          </p>
          <div className="flex gap-2">
            <Link href="/cakes" className="btn btn-ghost btn-sm">
              সব কেক দেখুন
            </Link>
            <Link href="/custom-order" className="btn btn-primary btn-sm">
              Custom Cake
            </Link>
          </div>
        </div>
      ) : (
        <div className="mt-7 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {list.map((cake) => {
            const stat = ratingMap.get(cake.slug);
            return (
              <CakeCard
                key={cake.id}
                cake={cake}
                rating={stat ? stat.total / stat.count : undefined}
                reviewCount={stat?.count ?? 0}
              />
            );
          })}
        </div>
      )}

      {/* SEO copy */}
      <section className="prose-bn mt-14 max-w-3xl rounded-2xl border border-line bg-surface p-6 text-sm">
        <h2>অনলাইনে কেক অর্ডার — কেন Super Cake?</h2>
        <p>
          {settings.store_name} — {settings.tagline}। প্রতিটি কেক অর্ডার পাওয়ার পরে তাজা তৈরি করা হয়, তাই
          আপনি পাবেন সবচেয়ে নরম ও সুস্বাদু কেক। আমাদের কালেকশনে আছে chocolate, vanilla, red velvet,
          cheesecake এবং সম্পূর্ণ custom design কেক।
        </p>
        <p>
          ওজন অনুযায়ী দাম দেখে নিন — ½ পাউন্ড থেকে ৩ পাউন্ড পর্যন্ত। ডেলিভারি চার্জ ও প্রোমো কোডের ছাড়
          checkout এ সাথে সাথে দেখানো হবে। পেমেন্ট করতে পারেন Cash on Delivery অথবা bKash দিয়ে।
        </p>
      </section>
    </div>
  );
}
