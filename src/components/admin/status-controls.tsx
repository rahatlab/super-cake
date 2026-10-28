"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { ORDER_STATUS_FLOW, ORDER_STATUS_META } from "@/lib/constants";
import { cn } from "@/lib/utils";
import { updateOrderStatusAction, type ActionState } from "@/lib/actions/admin";
import type { OrderStatus } from "@/lib/types";

const ALL_STATUSES: OrderStatus[] = [...ORDER_STATUS_FLOW, "cancelled"];

export function StatusControls({ orderId, current }: { orderId: string; current: OrderStatus }) {
  const router = useRouter();
  const [msg, setMsg] = useState<ActionState>({});
  const [pending, startTransition] = useTransition();

  function setStatus(status: OrderStatus) {
    setMsg({});
    startTransition(async () => {
      const res = await updateOrderStatusAction(orderId, status);
      setMsg(res);
      router.refresh();
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
              {pending && <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden />}
              {meta.bn}
            </button>
          );
        })}
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
    </section>
  );
}
