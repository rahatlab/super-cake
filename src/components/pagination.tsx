"use client";

import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

type PageItem = number | "gap";

/** Windowed page numbers: 1 … 4 5 6 … 12 (max five slots). */
function pageItems(current: number, total: number): PageItem[] {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);
  const pages = [...new Set([1, total, current - 1, current, current + 1])]
    .filter((p) => p >= 1 && p <= total)
    .sort((a, b) => a - b);

  const items: PageItem[] = [];
  let prev = 0;
  for (const p of pages) {
    if (p - prev > 1) items.push("gap");
    items.push(p);
    prev = p;
  }
  return items;
}

/**
 * Shared dashboard pagination.
 *
 * - `onPageChange` given → controlled (client lists slice their own rows).
 * - no `onPageChange` → rewrites `?page=` via the router (server pages).
 *
 * Renders nothing when everything fits on a single page.
 */
export function Pagination({
  page,
  totalPages,
  total,
  onPageChange,
  className,
}: {
  /** 1-based current page. */
  page: number;
  totalPages: number;
  /** Optional row count for the "মোট X টি" label. */
  total?: number;
  onPageChange?: (page: number) => void;
  className?: string;
}) {
  const pathname = usePathname();
  if (totalPages <= 1) return null;

  const current = Math.min(Math.max(1, page), totalPages);

  const hrefFor = (p: number) =>
    p <= 1 ? pathname : `${pathname}?page=${p}`;

  return (
    <nav
      aria-label="পৃষ্ঠা"
      className={cn(
        "flex flex-wrap items-center justify-between gap-3 pt-2",
        className,
      )}
    >
      <p className="text-xs font-semibold text-muted">
        {total != null && `মোট ${total} টি · `}
        পৃষ্ঠা {current} / {totalPages}
      </p>

      <div className="flex items-center gap-1.5">
        <PageButton
          href={hrefFor(current - 1)}
          disabled={current <= 1}
          onPageChange={onPageChange}
          target={current - 1}
          label="আগের পৃষ্ঠা"
        >
          <ChevronLeft className="h-4 w-4" aria-hidden />
        </PageButton>

        {pageItems(current, totalPages).map((item, i) =>
          item === "gap" ? (
            <span key={`gap-${i}`} className="px-1 text-sm text-muted" aria-hidden>
              …
            </span>
          ) : (
            <PageButton
              key={item}
              href={hrefFor(item)}
              active={item === current}
              onPageChange={onPageChange}
              target={item}
              label={`পৃষ্ঠা ${item}`}
            >
              {item}
            </PageButton>
          ),
        )}

        <PageButton
          href={hrefFor(current + 1)}
          disabled={current >= totalPages}
          onPageChange={onPageChange}
          target={current + 1}
          label="পরের পৃষ্ঠা"
        >
          <ChevronRight className="h-4 w-4" aria-hidden />
        </PageButton>
      </div>
    </nav>
  );
}

function PageButton({
  href,
  disabled,
  active,
  onPageChange,
  target,
  label,
  children,
}: {
  href: string;
  disabled?: boolean;
  active?: boolean;
  onPageChange?: (page: number) => void;
  target: number;
  label: string;
  children: React.ReactNode;
}) {
  const className = cn(
    "btn btn-sm",
    active
      ? "btn-soft pointer-events-none text-brand-strong"
      : "bg-transparent text-muted hover:bg-fg/[0.05]",
    disabled && "pointer-events-none opacity-40",
  );

  // Controlled mode: the parent list slices its rows itself.
  if (onPageChange) {
    return (
      <button
        type="button"
        aria-label={label}
        aria-current={active ? "page" : undefined}
        disabled={disabled}
        onClick={() => onPageChange(target)}
        className={className}
      >
        {children}
      </button>
    );
  }

  if (disabled) {
    return (
      <span aria-label={label} className={className} aria-hidden>
        {children}
      </span>
    );
  }

  return (
    <Link href={href} aria-label={label} aria-current={active ? "page" : undefined} className={className}>
      {children}
    </Link>
  );
}
