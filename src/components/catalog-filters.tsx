"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { Search, SlidersHorizontal, X } from "lucide-react";

interface Opt {
  value: string;
  label: string;
  bn?: string;
  emoji?: string;
}

export function CatalogFilters({ categories, occasions }: { categories: string[]; occasions: Opt[] }) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();

  const [q, setQ] = useState(params.get("q") ?? "");
  const debounce = useRef<ReturnType<typeof setTimeout> | null>(null);

  const update = (key: string, value: string | null) => {
    const next = new URLSearchParams(params.toString());
    if (value && value.length) next.set(key, value);
    else next.delete(key);
    router.replace(`${pathname}?${next.toString()}`, { scroll: false });
  };

  useEffect(() => {
    if (debounce.current) clearTimeout(debounce.current);
    debounce.current = setTimeout(() => {
      const current = params.get("q") ?? "";
      if (q !== current) update("q", q);
    }, 320);
    return () => {
      if (debounce.current) clearTimeout(debounce.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q]);

  const occasion = params.get("occasion") ?? "";
  const category = params.get("category") ?? "";
  const sort = params.get("sort") ?? "popular";
  const hasFilter = Boolean(occasion || category || q);

  const clearAll = () => {
    setQ("");
    router.replace(pathname, { scroll: false });
  };

  return (
    <div className="space-y-3">
      {/* row 1: search + sort */}
      <div className="flex flex-col gap-3 sm:flex-row">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
          <input
            type="search"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="কেক খুঁজুন… (chocolate, red velvet, custom)"
            className="field !pl-10"
            aria-label="Search cakes"
          />
        </div>

        <div className="relative sm:w-56">
          <SlidersHorizontal className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
          <select
            value={sort}
            onChange={(e) => update("sort", e.target.value)}
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
          data-active={!occasion}
          onClick={() => update("occasion", null)}
          className="chip shrink-0"
        >
          সব
        </button>
        {occasions.map((o) => (
          <button
            key={o.value}
            type="button"
            data-active={occasion === o.value}
            onClick={() => update("occasion", occasion === o.value ? null : o.value)}
            className="chip shrink-0"
          >
            {o.emoji} {o.label}
          </button>
        ))}
      </div>

      {/* row 3: categories + clear */}
      <div className="flex flex-wrap items-center gap-2">
        {categories.map((c) => (
          <button
            key={c}
            type="button"
            data-active={category === c}
            onClick={() => update("category", category === c ? null : c)}
            className="chip !text-[13px]"
          >
            {c}
          </button>
        ))}

        {hasFilter && (
          <button type="button" onClick={clearAll} className="ml-auto inline-flex items-center gap-1 text-xs font-semibold text-danger">
            <X className="h-3.5 w-3.5" /> ফিল্টার মুছুন
          </button>
        )}
      </div>
    </div>
  );
}
