"use client";

import { useEffect, useRef, useState } from "react";
import type { OrderStatus, PaymentStatus } from "@/lib/types";
import { getBrowserSupabase } from "@/lib/supabase/browser";

export interface LiveUpdate {
  order_status: OrderStatus;
  payment_status: PaymentStatus;
  updated_at: string;
  /** Where the update came from — shown as a small badge in the UI. */
  source: "realtime" | "poll";
}

const POLL_MS = 15_000;

/**
 * Live order status.
 *
 * Supabase Realtime (postgres_changes on `order_tracking`) when an anon key is
 * configured; otherwise a 15s poll against `/api/order-status`. Both paths need
 * the order id/number + the phone used at checkout, so no extra data leaks.
 */
export function useOrderLive(
  target: { orderId: string; orderNo: string; phone: string } | null,
  initial?: { order_status: OrderStatus; payment_status: PaymentStatus },
): LiveUpdate | null {
  const [update, setUpdate] = useState<LiveUpdate | null>(null);
  const latest = useRef(initial ?? null);

  const orderId = target?.orderId;
  const orderNo = target?.orderNo;
  const phone = target?.phone;

  useEffect(() => {
    if (!orderId || !orderNo || !phone) return;

    let cancelled = false;
    const emit = (next: LiveUpdate) => {
      if (cancelled) return;
      const prev = latest.current;
      if (
        prev &&
        prev.order_status === next.order_status &&
        prev.payment_status === next.payment_status
      ) {
        return;
      }
      latest.current = { order_status: next.order_status, payment_status: next.payment_status };
      setUpdate(next);
    };

    const supabase = getBrowserSupabase();

    /* ---- preferred path: Realtime websocket ---- */
    if (supabase) {
      const channel = supabase
        .channel(`order-tracking:${orderId}`)
        .on(
          "postgres_changes",
          {
            event: "UPDATE",
            schema: "public",
            table: "order_tracking",
            filter: `order_id=eq.${orderId}`,
          },
          (payload) => {
            const row = payload.new as {
              order_status?: OrderStatus;
              payment_status?: PaymentStatus;
              updated_at?: string;
            };
            if (!row?.order_status || !row.payment_status) return;
            emit({
              order_status: row.order_status,
              payment_status: row.payment_status,
              updated_at: row.updated_at ?? new Date().toISOString(),
              source: "realtime",
            });
          },
        )
        .subscribe();

      return () => {
        cancelled = true;
        void supabase.removeChannel(channel);
      };
    }

    /* ---- fallback: short poll ---- */
    let timer: ReturnType<typeof setInterval> | null = null;

    const poll = async () => {
      try {
        const res = await fetch("/api/order-status", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ order_no: orderNo, phone }),
          cache: "no-store",
        });
        if (!res.ok) return;
        const data = (await res.json()) as {
          order_status?: OrderStatus;
          payment_status?: PaymentStatus;
          updated_at?: string;
        };
        if (!data.order_status || !data.payment_status) return;
        emit({
          order_status: data.order_status,
          payment_status: data.payment_status,
          updated_at: data.updated_at ?? new Date().toISOString(),
          source: "poll",
        });
      } catch {
        // Offline — the next tick retries.
      }
    };

    timer = setInterval(poll, POLL_MS);

    return () => {
      cancelled = true;
      if (timer) clearInterval(timer);
    };
  }, [orderId, orderNo, phone]);

  return update;
}
