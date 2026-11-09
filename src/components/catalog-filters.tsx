"use client";

import { Search, SlidersHorizontal } from "@animateicons/react/huge";
import { Cancel01 } from "@animateicons/react/huge";
import { AnimIcon } from "@/components/ui/anim-icon";
import { useAnimIcon } from "@/components/ui/use-anim-icon";

interface Opt {
  value: string;
  label: string;
  bn?: string;
}

/** Occasion value -> AnimIcon name (replaces the old emoji). */
export const OCCASION_ICON_NAME: Record<string, string> = {
  birthday: "cake",
  anniversary: "heart",
  occasion: "sparkles",
  gift: "gift",
  others: "star",
};

export interface CatalogState {
  q: string;
  occasion: string;
  category: string;
  sort: string;
}

/**
 * Controlled filter bar.
 *
 * It used to own the URL (and call `router.replace()` on every keystroke), which
 * made each character wait for a server render. Filtering now happens in memory
 * in `CakesCatalog`; this component is just the presentation layer.
 */
export function CatalogFilters({
  categories,
  occasions,
  value,
  onChange,
}: {
  categories: string[];
  occasions: Opt[];
  value: CatalogState;
  onChange: (next: CatalogState) => void;
}) {
  const set = (patch: Partial<CatalogState>) => onChange({ ...value, ...patch });
  const hasFilter = Boolean(value.occasion || value.category || value.q.trim());
  // AnimateIcons refs for filter icons
  const clearIcon = useAnimIcon();

  return (
    <div className="space-y-3">
      {/* row 1: search + sort */}
      <div className="flex flex-col gap-3 sm:flex-row">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
          <input
            type="search"
            value={value.q}
            onChange={(e) => set({ q: e.target.value })}
            placeholder="কেক খুঁজুন… (chocolate, red velvet, custom)"
            className="field !pl-10"
            aria-label="Search cakes"
          />
        </div>

        <div className="relative sm:w-56">
          <SlidersHorizontal className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
          <select
            value={value.sort}
            onChange={(e) => set({ sort: e.target.value })}
            className="field !pl-10 appearance-none"
            aria-label="Sort cakes"
          >
            <option value="popular">জনপ্রিয় আগে</option>
            <option value="newest">নতুন আগে</option>
            <option value="price_low">দাম: কম থেকে বেশি</option>
            <option value="price_high">দাম: বেশি থেকে কম</option>
            <option value="rating">রেটিং</option>
          </select>
        </div>
      </div>

      {/* row 2: occasions */}
      <div className="no-scrollbar -mx-1 flex gap-2 overflow-x-auto px-1 pb-1">
        <button
          type="button"
          data-active={!value.occasion}
          onClick={() => set({ occasion: "" })}
          className="chip shrink-0"
        >
          সব
        </button>
        {occasions.map((o) => (
          <button
            key={o.value}
            type="button"
            data-active={value.occasion === o.value}
            onClick={() => set({ occasion: value.occasion === o.value ? "" : o.value })}
            className="chip shrink-0"
          >
            <AnimIcon name={OCCASION_ICON_NAME[o.value] ?? "star"} className="h-4 w-4 shrink-0" /> {o.label}
          </button>
        ))}
      </div>

      {/* row 3: categories + clear */}
      <div className="flex flex-wrap items-center gap-2">
        {categories.map((c) => (
          <button
            key={c}
            type="button"
            data-active={value.category === c}
            onClick={() => set({ category: value.category === c ? "" : c })}
            className="chip !text-[13px]"
          >
            {c}
          </button>
        ))}

        {hasFilter && (
          <button
            type="button"
            onClick={() => onChange({ q: "", occasion: "", category: "", sort: "popular" })}
            className="ml-auto inline-flex items-center gap-1 text-xs font-semibold text-danger"
            onMouseEnter={() => clearIcon.current?.startAnimation()}
            onMouseLeave={() => clearIcon.current?.stopAnimation()}
          >
            <Cancel01 ref={clearIcon} className="h-3.5 w-3.5" /> ফিল্টার মুছুন
          </button>
        )}
      </div>
    </div>
  );
}
