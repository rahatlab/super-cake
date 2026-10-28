"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { BadgeCheck, Loader2, XCircle } from "lucide-react";
import { verifyPaymentAction, type ActionState } from "@/lib/actions/admin";

/** Approve / reject a bKash payment verification. */
export function PaymentActions({ orderId }: { orderId: string }) {
  const router = useRouter();
  const [msg, setMsg] = useState<ActionState>({});
  const [pending, startTransition] = useTransition();

  function verify(approve: boolean) {
    setMsg({});
    startTransition(async () => {
      const res = await verifyPaymentAction(orderId, approve);
      setMsg(res);
      router.refresh();
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
        >
          {pending ? <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden /> : <BadgeCheck className="h-4 w-4" aria-hidden />}
          Approve
        </button>
        <button
          type="button"
          disabled={pending}
          onClick={() => verify(false)}
          className="btn btn-ghost btn-sm text-danger hover:bg-danger/10"
          aria-label="পেমেন্ট প্রত্যাখ্যান করুন"
        >
          <XCircle className="h-4 w-4" aria-hidden />
          Reject
        </button>
      </div>

      {msg.success && (
        <p role="status" className="mt-3 rounded-xl bg-success/10 px-3 py-2 text-sm font-semibold text-success">
          ✅ {msg.success}
        </p>
      )}
      {msg.error && (
        <p role="alert" className="mt-3 rounded-xl bg-danger/10 px-3 py-2 text-sm font-semibold text-danger">
          ⚠️ {msg.error}
        </p>
      )}
    </div>
  );
}
