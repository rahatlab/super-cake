import { after } from "next/server";
import { revalidateTag } from "next/cache";
import { getStore } from "@/lib/store";
import { CACHE_TAGS } from "@/lib/store/cache";
import { sizeRows } from "@/lib/store/seed";
import type { Cake } from "@/lib/types";

/**
 * Auto-provisioned base cake for /custom-order.
 *
 * The custom-order form builds its order line from a real `cakes` row (that is
 * how `placeOrderAction` re-prices and reserves stock server-side), so a shop
 * with an empty catalog used to 404 on /custom-order. This helper guarantees a
 * usable row exists instead — created once, then reused.
 *
 * Price/sizes mirror the old seed's custom cake; admins can edit the row from
 * /admin/cakes like any other product.
 */
const BASE_PRICE = 1600;
/** Made to order — effectively unlimited, but finite so stock math stays sane. */
const STOCK = 1000;

/**
 * Invalidate the cakes cache after the response has been sent.
 *
 * `revalidateTag` throws when called during the render phase (Next 16 throws
 * `createRevalidateDuringRenderError` while the work-unit phase is `render`),
 * and this helper runs inside a Server Component. A direct call would either
 * abort the page or — inside a try/catch — be swallowed and silently skip the
 * invalidation, which is how /cakes kept serving the stale empty list for the
 * full 5-minute window. `after()` flips the phase to `after` before the
 * callback runs; Next then executes the queued tags via `withExecuteRevalidates`.
 */
function invalidateCakesCacheAfterRender(): void {
  after(() => {
    revalidateTag(CACHE_TAGS.cakes, "max");
  });
}

export async function ensureCustomBaseCake(): Promise<Cake> {
  const store = getStore();

  // Same selection the page does inline: an active custom-capable cake, else
  // the first active cake (normal case — nothing to create).
  const active = await store.listCakes();
  const usable = active.find((c) => c.is_custom_available) ?? active[0];
  if (usable) return usable;

  // Catalog is empty. Reuse a previously provisioned custom row (e.g. one an
  // admin deactivated) instead of inserting a duplicate on every visit.
  const all = await store.listCakes({ includeInactive: true });
  const existing = all.find((c) => c.is_custom_available);
  if (existing) {
    if (!existing.is_active) {
      await store.updateCake(existing.id, { is_active: true });
      invalidateCakesCacheAfterRender();
    }
    return {
      ...existing,
      is_active: true,
      sizes: existing.sizes?.length ? existing.sizes : sizeRows(existing.id, existing.base_price),
    };
  }

  try {
    const created = await store.createCake({
      name: "Custom Design",
      description:
        "আপনার নিজের ডিজাইন অনুযায়ী custom cake — flavour, ওজন, ওপরের লেখা ও reference ছবিসহ /custom-order ফর্মে অর্ডার করুন।",
      flavor: "Custom",
      category: "Custom",
      occasions: ["birthday", "anniversary", "occasion", "gift", "others"],
      image_urls: ["/cakes/custom-placeholder.svg"],
      base_price: BASE_PRICE,
      is_custom_available: true,
      is_featured: false,
      is_active: true,
      stock: STOCK,
    });
    const sizes = sizeRows(created.id, BASE_PRICE);
    await store.setCakeSizes(
      created.id,
      sizes.map(({ weight, price, is_available }) => ({ weight, price, is_available })),
    );
    invalidateCakesCacheAfterRender();
    return { ...created, sizes };
  } catch (e) {
    // Lost the race with a concurrent first visit — the row exists now.
    const again = await store.listCakes({ includeInactive: true });
    const found =
      again.find((c) => c.is_custom_available && c.is_active) ??
      again.find((c) => c.is_custom_available);
    if (found) return found;
    throw e;
  }
}
