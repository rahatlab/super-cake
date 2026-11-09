import type { Metadata } from "next";
import Link from "next/link";
import {
  getCachedCakeRatings,
  getCachedSettings,
  listCachedCakes,
} from "@/lib/store/cache";
import { OCCASIONS } from "@/lib/constants";
import { listCachedCategories } from "@/lib/store/cache";
import { CakesCatalog } from "@/components/cakes-catalog";
import { breadcrumbLd, ldJson } from "@/lib/seo";

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
  // `searchParams` keeps the first paint filtered for shared links and crawlers.
  // Everything after that is filtered client-side (see CakesCatalog), and the
  // catalog data itself comes from the tagged data cache — no DB hit per visit.
  const sp = await searchParams;
  const [cakes, ratings, settings, categories] = await Promise.all([
    listCachedCakes(),
    getCachedCakeRatings(),
    getCachedSettings(),
    listCachedCategories(),
  ]);

  const initial = {
    q: sp.q ?? "",
    occasion: sp.occasion ?? "",
    category: sp.category ?? "",
    sort: sp.sort ?? "popular",
  };

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

      <nav className="mb-6 flex flex-wrap items-center gap-1.5 text-xs text-muted">
        <Link href="/" className="hover:text-brand-strong">
          হোম
        </Link>
        <span>/</span>
        <span className="font-semibold text-fg">কেক সমূহ</span>
      </nav>

      <CakesCatalog
        // A fresh server navigation (e.g. the nav link back to /cakes) gets a new
        // key so in-memory filters reset instead of sticking around.
        key={JSON.stringify(initial)}
        cakes={cakes}
        ratings={ratings}
        categories={categories.map((c) => c.name)}
        occasions={OCCASIONS}
        initial={initial}
      />

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
