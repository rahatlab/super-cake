import { unstable_cache } from "next/cache";
import { getStore } from "./index";

/**
 * Cross-request data cache for the public (read-only) side of the store.
 *
 * `React.cache` in `queries.ts` only dedupes within one render; every visitor
 * still hit Supabase for settings, cakes, posts and reviews. These helpers put
 * that data in Next's data cache (the `unstable_cache` model, because this app
 * runs with `cacheComponents: false`) so a cached page render costs zero DB
 * round-trips.
 *
 * Invalidation is tag based — see `revalidatePublic()` in `lib/actions/admin.ts`.
 * Admin screens keep reading the store directly so they always see fresh rows.
 */

/** Tag names used by `revalidateTag()` after an admin write. */
export const CACHE_TAGS = {
  settings: "settings",
  cakes: "cakes",
  posts: "posts",
  reviews: "reviews",
  banners: "banners",
} as const;

export type CacheTag = (typeof CACHE_TAGS)[keyof typeof CACHE_TAGS];

const FIVE_MINUTES = 300;
const ONE_HOUR = 3600;

export const getCachedSettings = unstable_cache(
  async () => getStore().getSettings(),
  ["public-settings"],
  { tags: [CACHE_TAGS.settings], revalidate: ONE_HOUR },
);

export const listCachedCakes = unstable_cache(
  async (includeInactive = false) => getStore().listCakes({ includeInactive }),
  ["public-cakes"],
  { tags: [CACHE_TAGS.cakes], revalidate: FIVE_MINUTES },
);

export const getCachedCakeBySlug = unstable_cache(
  async (slug: string) => getStore().getCakeBySlug(slug),
  ["public-cake"],
  { tags: [CACHE_TAGS.cakes], revalidate: FIVE_MINUTES },
);

export const getCachedCakeRatings = unstable_cache(
  async () => getStore().getCakeRatings(),
  ["public-cake-ratings"],
  { tags: [CACHE_TAGS.reviews, CACHE_TAGS.cakes], revalidate: FIVE_MINUTES },
);

export const listCachedPosts = unstable_cache(
  async (publishedOnly = true) => getStore().listPosts({ publishedOnly }),
  ["public-posts"],
  { tags: [CACHE_TAGS.posts], revalidate: FIVE_MINUTES },
);

export const getCachedPostBySlug = unstable_cache(
  async (slug: string) => getStore().getPostBySlug(slug),
  ["public-post"],
  { tags: [CACHE_TAGS.posts], revalidate: FIVE_MINUTES },
);

export const listCachedBanners = unstable_cache(
  async (activeOnly = true) => getStore().listBanners({ activeOnly }),
  ["public-banners"],
  { tags: [CACHE_TAGS.banners], revalidate: FIVE_MINUTES },
);

export const listCachedApprovedReviews = unstable_cache(
  async () => getStore().listReviews({ approvedOnly: true }),
  ["public-reviews"],
  { tags: [CACHE_TAGS.reviews], revalidate: FIVE_MINUTES },
);
