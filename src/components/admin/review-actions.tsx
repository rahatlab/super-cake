"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { Check, Loading01 } from "@animateicons/react/huge";
import { Delete02 } from "@animateicons/react/huge";
import { toast } from "react-toastify";
import { confirmDialog } from "@/lib/confirm";
import { moderateReviewAction } from "@/lib/actions/admin";
import { useAnimIcon } from "@/components/ui/use-anim-icon";

/** Approve (publish) or delete a customer review. */
export function ReviewActions({ reviewId, isApproved }: { reviewId: string; isApproved: boolean }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const approveIcon = useAnimIcon();
  const trashIcon = useAnimIcon();

  function approve() {
    if (pending) return;
    startTransition(async () => {
      const toastId = toast.loading("রিভিউ প্রকাশ করা হচ্ছে...");
      const res = await moderateReviewAction(reviewId, true);
      if (res.error) {
        toast.update(toastId, {
          render: res.error,
          type: "error",
          isLoading: false,
          autoClose: 3500,
        });
      } else {
        toast.update(toastId, {
          render: res.success ?? "রিভিউ প্রকাশিত হয়েছে",
          type: "success",
          isLoading: false,
          autoClose: 3500,
        });
      }
      router.refresh();
    });
  }

  async function remove() {
    if (pending) return;
    const ok = await confirmDialog({
      title: "এই রিভিউটি মুছে ফেলবেন?",
      text: "প্রকাশিত রিভিউ সাইট থেকে স্থায়ীভাবে সরে যাবে।",
      confirmText: "মুছে ফেলুন",
    });
    if (!ok) return;
    startTransition(async () => {
      const toastId = toast.loading("রিভিউ মুছে ফেলা হচ্ছে...");
      const res = await moderateReviewAction(reviewId, false);
      if (res.error) {
        toast.update(toastId, {
          render: res.error,
          type: "error",
          isLoading: false,
          autoClose: 3500,
        });
      } else {
        toast.update(toastId, {
          render: res.success ?? "রিভিউ মুছে ফেলা হয়েছে",
          type: "success",
          isLoading: false,
          autoClose: 3500,
        });
      }
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
            onMouseEnter={() => approveIcon.current?.startAnimation()}
            onMouseLeave={() => approveIcon.current?.stopAnimation()}
            className="btn btn-sm bg-success/15 text-success hover:bg-success/25"
            aria-label="রিভিউ approve করুন"
          >
            {pending ? (
              <Loading01 className="h-3.5 w-3.5 animate-spin" aria-hidden />
            ) : (
              <Check ref={approveIcon} className="h-3.5 w-3.5" aria-hidden />
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
          onMouseEnter={() => trashIcon.current?.startAnimation()}
          onMouseLeave={() => trashIcon.current?.stopAnimation()}
        >
          {pending ? (
            <Loading01 ref={trashIcon} className="h-3.5 w-3.5 animate-spin" aria-hidden />
          ) : (
            <Delete02 ref={trashIcon} className="h-3.5 w-3.5" aria-hidden />
          )}
          Delete
        </button>
      </div>
    </div>
  );
}
