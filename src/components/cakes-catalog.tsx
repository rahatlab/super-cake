"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import type { Cake } from "@/lib/types";
import { CakeCard } from "@/components/cake-card";
import { CatalogFilters, type CatalogState } from "@/components/catalog-filters";
import { AnimIcon } from "@/components/ui/anim-icon";

interface Rating {
  cake_slug: string;
  average_rating: number;
  review_count: number;
}

interface Opt {
  value: string;
  label: string;
  bn?: string;
  emoji?: string;
}

/**
 * Client-side catalog.
 *
 * The server still renders the first paint from `?q=&occasion=` so links and
 * crawlers get a filtered page, but every subsequent filter change happens in
 * memory — no `router.replace()` per keystroke, no RSC round-trip. The URL is
 * kept shareable with the native History API.
 */
export function CakesCatalog({
  cakes,
  ratings,
  categories,
  occasions,
  initial,
}: {
  cakes: Cake[];
  ratings: Rating[];
  categories: string[];
  occasions: Opt[];
  initial: CatalogState;
}) {
  const [state, setState] = useState<CatalogState>(initial);

  const ratingMap = useMemo(() => new Map(ratings.map((r) => [r.cake_slug, r])), [ratings]);

  const list = useMemo(() => {
    const q = state.q.trim().toLowerCase();
    const active = cakes.filter((c) => c.is_active);

    const filtered = active.filter((c) => {
      if (q) {
        const haystack = [c.name, c.flavor, c.category, c.description].join(" ").toLowerCase();
        if (!haystack.includes(q)) return false;
      }
      if (state.occasion && !c.occasions.includes(state.occasion as never)) return false;
      if (state.category && c.category !== state.category) return false;
      return true;
    });

    const score = (slug: string) => {
      const r = ratingMap.get(slug);
      return r && r.review_count ? r.average_rating : 0;
    };

    return [...filtered].sort((a, b) => {
      if (state.sort === "price_low") return a.base_price - b.base_price;
      if (state.sort === "price_high") return b.base_price - a.base_price;
      if (state.sort === "rating") return score(b.slug) - score(a.slug);
      if (state.sort === "newest") return b.created_at.localeCompare(a.created_at);
      return (
        Number(b.is_featured) - Number(a.is_featured) || score(b.slug) - score(a.slug)
      );
    });
  }, [cakes, ratingMap, state]);

  // Keep the address bar in sync without asking Next.js to re-render the route.
  useEffect(() => {
    const params = new URLSearchParams();
    const q = state.q.trim();
    if (q) params.set("q", q);
    if (state.occasion) params.set("occasion", state.occasion);
    if (state.category) params.set("category", state.category);
    if (state.sort && state.sort !== "popular") params.set("sort", state.sort);

    const next = params.toString() ? `/cakes?${params.toString()}` : "/cakes";
    const current = `${window.location.pathname}${window.location.search}`;
    if (current !== next) window.history.replaceState(null, "", next);
  }, [state]);

  const activeOccasion = occasions.find((o) => o.value === state.occasion);

  return (
    <>
      <header className="mb-6">
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

      <CatalogFilters
        categories={categories}
        occasions={occasions}
        value={state}
        onChange={setState}
      />

      {list.length === 0 ? (
        <div className="card mt-8 flex flex-col items-center gap-3 px-6 py-16 text-center">
          <AnimIcon name="search" className="h-12 w-12" />
          <h2 className="text-lg font-bold">এই ফিল্টারে কোনো কেক পাওয়া যায়নি</h2>
          <p className="max-w-sm text-sm text-muted">
            অন্য ফিল্টার চেষ্টা করুন, অথবা আমাদের কাস্টম কেক অর্ডার করুন — আপনার ডিজাইনে বানিয়ে দিচ্ছি।
          </p>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setState({ q: "", occasion: "", category: "", sort: "popular" })}
              className="btn btn-ghost btn-sm"
            >
              সব কেক দেখুন
            </button>
            <Link href="/custom-order" className="btn btn-primary btn-sm">
              Custom Cake
            </Link>
          </div>
        </div>
      ) : (
        <div className="mt-7 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {list.map((cake, i) => {
            const stat = ratingMap.get(cake.slug);
            return (
              <CakeCard
                key={cake.id}
                cake={cake}
                rating={stat?.average_rating}
                reviewCount={stat?.review_count ?? 0}
                // First row is the LCP candidate on /cakes — preload it.
                priority={i < 4}
              />
            );
          })}
        </div>
      )}
    </>
  );
}
