import { cache } from "react";
import { getCachedCakeBySlug, listCachedApprovedReviews } from "./cache";

/**
 * Request-scoped memoised queries.
 *
 * `React.cache` dedupes calls made during a single server render, which is
 * exactly what pages need: `generateMetadata` and the page component both read
 * the same rows, and a Suspense-split section (testimonials) often re-reads data
 * the parent already fetched.
 *
 * The underlying helpers in `cache.ts` are already cross-request cached, so
 * this second layer mainly guarantees one promise per request (and keeps the
 * existing imports working).
 *
 * Scope is one request — nothing is shared between requests, so this is safe
 * for per-user data too.
 */

/** Cake detail used to be fetched 3× per request (metadata + page + hydrate). */
export const getCakeBySlug = cache((slug: string) => getCachedCakeBySlug(slug));

/** Approved reviews are read by the home hero, testimonials and cake pages. */
export const getApprovedReviews = cache(() => listCachedApprovedReviews());
