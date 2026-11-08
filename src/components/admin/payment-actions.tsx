"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { BadgeCheck, CancelCircle, Loading01 } from "@animateicons/react/huge";
import { toast } from "react-toastify";
import { verifyPaymentAction } from "@/lib/actions/admin";
import { useAnimIcon } from "@/components/ui/use-anim-icon";

/** Approve / reject a bKash payment verification. */
export function PaymentActions({ orderId }: { orderId: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState<"approve" | "reject" | null>(null);
  const [pending, startTransition] = useTransition();
  // AnimateIcons refs for payment action icons
  const approveIcon = useAnimIcon();
  const rejectIcon = useAnimIcon();

  function verify(approve: boolean) {
    if (pending) return;
    setBusy(approve ? "approve" : "reject");
    startTransition(async () => {
      const toastId = toast.loading(
        approve ? "পেমেন্ট অনুমোদন করা হচ্ছে..." : "পেমেন্ট প্রত্যাখ্যান করা হচ্ছে..."
      );
      try {
        const res = await verifyPaymentAction(orderId, approve);
        if (res.error) {
          toast.update(toastId, {
            render: res.error,
            type: "error",
            isLoading: false,
            autoClose: 3500,
          });
        } else if (res.success) {
          toast.update(toastId, {
            render: res.success,
            type: "success",
            isLoading: false,
            autoClose: 3500,
          });
        }
        router.refresh();
      } catch (e) {
        toast.update(toastId, {
          render: (e as Error).message,
          type: "error",
          isLoading: false,
          autoClose: 3500,
        });
      } finally {
        setBusy(null);
      }
    });
  }

  return (
    <div>
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          disabled={pending}
          onClick={() => verify(true)}
          className="btn btn-sm bg-success/15 text-success hover:bg-success/25"
          aria-label="পেমেন্ট অনুমোদন করুন"
          onMouseEnter={() => approveIcon.current?.startAnimation()}
          onMouseLeave={() => approveIcon.current?.stopAnimation()}
        >
          {busy === "approve" ? <Loading01 ref={approveIcon} className="h-3.5 w-3.5 animate-spin" aria-hidden /> : <BadgeCheck ref={approveIcon} className="h-4 w-4" aria-hidden />}
          Approve
        </button>
        <button
          type="button"
          disabled={pending}
          onClick={() => verify(false)}
          className="btn btn-ghost btn-sm text-danger hover:bg-danger/10"
          aria-label="পেমেন্ট প্রত্যাখ্যান করুন"
          onMouseEnter={() => rejectIcon.current?.startAnimation()}
          onMouseLeave={() => rejectIcon.current?.stopAnimation()}
        >
          <CancelCircle ref={rejectIcon} className="h-4 w-4" aria-hidden />
          {busy === "reject" && <Loading01 ref={rejectIcon} className="h-3.5 w-3.5 animate-spin" aria-hidden />}
          Reject
        </button>
      </div>
    </div>
  );
}
