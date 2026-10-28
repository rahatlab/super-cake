"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Check, Loader2, Trash2 } from "lucide-react";
import { moderateReviewAction } from "@/lib/actions/admin";

/** Approve (publish) or delete a customer review. */
export function ReviewActions({ reviewId, isApproved }: { reviewId: string; isApproved: boolean }) {
  const router = useRouter();
  const [msg, setMsg] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function approve() {
    startTransition(async () => {
      const res = await moderateReviewAction(reviewId, true);
      setMsg(res.error ? `⚠️ ${res.error}` : (res.success ?? null));
      router.refresh();
    });
  }

  function remove() {
    if (!window.confirm("এই রিভিউটি মুছে ফেলতে চান?")) return;
    startTransition(async () => {
      const res = await moderateReviewAction(reviewId, false);
      setMsg(res.error ? `⚠️ ${res.error}` : (res.success ?? null));
      router.refresh();
    });
  }

  return (
    <div className="flex flex-col items-end gap-1.5">
      <div className="flex flex-wrap justify-end gap-2">
        {!isApproved && (
          <button
            type="button"
            onClick={approve}
            disabled={pending}
            className="btn btn-sm bg-success/15 text-success hover:bg-success/25"
            aria-label="রিভিউ approve করুন"
          >
            {pending ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden />
            ) : (
              <Check className="h-3.5 w-3.5" aria-hidden />
            )}
            Approve
          </button>
        )}
        <button
          type="button"
          onClick={remove}
          disabled={pending}
          className="btn btn-sm btn-ghost text-danger hover:bg-danger/10"
          aria-label="রিভিউ মুছে ফেলুন"
        >
          {pending ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden />
          ) : (
            <Trash2 className="h-3.5 w-3.5" aria-hidden />
          )}
          Delete
        </button>
      </div>
      {msg && <span className="text-[11px] font-semibold text-muted">{msg}</span>}
    </div>
  );
}
