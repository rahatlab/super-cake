"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { toast } from "react-toastify";
import { ORDER_STATUS_FLOW, ORDER_STATUS_META } from "@/lib/constants";
import { cn } from "@/lib/utils";
import { updateOrderStatusAction } from "@/lib/actions/admin";
import type { OrderStatus } from "@/lib/types";

const ALL_STATUSES: OrderStatus[] = [...ORDER_STATUS_FLOW, "cancelled"];

export function StatusControls({ orderId, current }: { orderId: string; current: OrderStatus }) {
  const router = useRouter();
  const [busy, setBusy] = useState<OrderStatus | null>(null);
  const [pending, startTransition] = useTransition();

  function setStatus(status: OrderStatus) {
    if (pending) return;
    // Spinner belongs to the clicked button only — a single shared `pending`
    // flag used to put a spinner on every button at once.
    setBusy(status);
    startTransition(async () => {
      const toastId = toast.loading(`স্ট্যাটাস ${ORDER_STATUS_META[status].bn} করা হচ্ছে...`);
      try {
        const res = await updateOrderStatusAction(orderId, status);
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
    <section className="card p-5" aria-label="অর্ডার স্ট্যাটাস পরিবর্তন">
      <h2 className="mb-1 text-base font-extrabold">স্ট্যাটাস পরিবর্তন</h2>
      <p className="mb-4 text-sm text-muted">
        বর্তমান: <strong className="text-fg">{ORDER_STATUS_META[current].bn}</strong> — স্ট্যাটাস বদলালে কাস্টমারকে
        WhatsApp এ অটো নোটিফিকেশন যাবে।
      </p>

      <div className="flex flex-wrap gap-2">
        {ALL_STATUSES.map((status) => {
          const meta = ORDER_STATUS_META[status];
          const isCurrent = status === current;
          const isCancelled = status === "cancelled";
          return (
            <button
              key={status}
              type="button"
              disabled={isCurrent || pending}
              onClick={() => setStatus(status)}
              aria-label={`স্ট্যাটাস ${meta.bn} করুন`}
              aria-busy={busy === status}
              className={cn(
                "btn btn-sm border",
                isCurrent
                  ? "cursor-default border-transparent font-extrabold"
                  : isCancelled
                    ? "btn-ghost border-rose-300/60 text-danger hover:bg-rose-500/10"
                    : "btn-ghost",
                isCurrent && meta.color,
              )}
            >
              {busy === status && <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden />}
              {meta.bn}
            </button>
          );
        })}
      </div>
    </section>
  );
}
