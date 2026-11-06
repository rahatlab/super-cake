"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { toast } from "react-toastify";
import { toggleOrderFlagAction } from "@/lib/actions/admin";

/**
 * 🚩 Mark/unmark an order as a suspected fake order. The flag rolls up into
 * the customer's stats on the admin users screen.
 */
export function FlagToggle({ orderId, flagged }: { orderId: string; flagged: boolean }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [busy, setBusy] = useState(false);

  function toggle() {
    if (pending) return;
    setBusy(true);
    startTransition(async () => {
      try {
        const res = await toggleOrderFlagAction(orderId, !flagged);
        if (res.error) toast.error(res.error);
        else if (res.success) toast.success(res.success);
        router.refresh();
      } catch (e) {
        toast.error((e as Error).message || "কিছু ভুল হয়েছে");
      } finally {
        setBusy(false);
      }
    });
  }

  return (
    <button
      type="button"
      onClick={toggle}
      disabled={busy || pending}
      aria-pressed={flagged}
      className={`btn btn-sm border ${
        flagged
          ? "border-amber-400/60 bg-amber-500/15 text-amber-600 hover:bg-amber-500/25 dark:text-amber-400"
          : "btn-ghost border-line text-muted hover:text-amber-600 dark:hover:text-amber-400"
      }`}
      title="সন্দেহজনক / ফেক অর্ডার হিসেবে চিহ্নিত করুন"
    >
      {busy && <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden />}
      🚩 {flagged ? "ফেক চিহ্নিত" : "ফেক অর্ডার?"}
    </button>
  );
}
