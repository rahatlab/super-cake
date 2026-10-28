import type { Metadata } from "next";
import Link from "next/link";
import { Star } from "lucide-react";
import { getStore } from "@/lib/store";
import { cn, formatDateTime } from "@/lib/utils";
import { Stars } from "@/components/star-rating";
import { ReviewActions } from "@/components/admin/review-actions";

export const metadata: Metadata = { title: "Reviews" };

export default async function AdminReviewsPage() {
  const reviews = await getStore().listReviews();
  const sorted = [...reviews].sort(
    (a, b) => +new Date(b.created_at) - +new Date(a.created_at),
  );

  const pending = sorted.filter((r) => !r.is_approved);
  const approved = sorted.filter((r) => r.is_approved);
  const avg =
    approved.length > 0
      ? (approved.reduce((s, r) => s + r.rating, 0) / approved.length).toFixed(1)
      : "—";

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-extrabold">রিভিউ</h1>
          <p className="mt-1 text-sm text-muted">
            শুধু ডেলিভারি হওয়া অর্ডারের কাস্টমাররাই রিভিউ দিতে পারে — Approve করলে সাইটে দেখাবে
          </p>
        </div>
        <div className="flex gap-4 text-sm">
          <div className="text-right">
            <p className="text-xs font-bold uppercase tracking-wide text-muted">গড় রেটিং</p>
            <p className="flex items-center gap-1.5 font-display text-xl font-extrabold">
              {avg}
              <Star className="h-4 w-4 fill-warning text-warning" aria-hidden />
            </p>
          </div>
          <div className="text-right">
            <p className="text-xs font-bold uppercase tracking-wide text-muted">অপেক্ষমাণ</p>
            <p className="font-display text-xl font-extrabold">{pending.length}</p>
          </div>
        </div>
      </div>

      {sorted.length === 0 ? (
        <div className="card grid place-items-center gap-2 py-16 text-center">
          <span className="text-4xl" aria-hidden>
            ⭐
          </span>
          <p className="font-bold">এখনো কোনো রিভিউ নেই</p>
          <p className="text-sm text-muted">ডেলিভারির পর কাস্টমার রিভিউ দিলে এখানে আসবে</p>
        </div>
      ) : (
        <div className="space-y-3">
          {sorted.map((r) => (
            <article key={r.id} className="card p-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="font-bold">{r.customer_name}</p>
                    <Stars value={r.rating} size={14} />
                    <span
                      className={cn(
                        "badge",
                        r.is_approved
                          ? "bg-success/15 text-success"
                          : "bg-amber-500/15 text-amber-600 dark:text-amber-400",
                      )}
                    >
                      {r.is_approved ? "প্রকাশিত" : "অপেক্ষমাণ"}
                    </span>
                    {r.cake_slug && (
                      <Link
                        href={`/cakes/${r.cake_slug}`}
                        target="_blank"
                        className="badge bg-brand/10 text-brand-strong hover:underline"
                      >
                        🍰 {r.cake_slug}
                      </Link>
                    )}
                  </div>
                  <p className="mt-2 max-w-2xl text-sm leading-relaxed text-muted">{r.comment}</p>
                  <p className="mt-2 text-[11px] text-muted">
                    অর্ডার <span className="font-mono">{r.order_id}</span> · {formatDateTime(r.created_at)}
                  </p>
                </div>

                <ReviewActions reviewId={r.id} isApproved={r.is_approved} />
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}
