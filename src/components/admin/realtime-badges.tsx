"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "react-toastify";

export interface AdminBadges {
  unread: number;
  pendingReviews: number;
  pendingPayments: number;
  pendingOrders: number;
}

const POLL_MS = 20_000;

export function useAdminBadges(initial: AdminBadges) {
  const router = useRouter();
  const [badges, setBadges] = useState<AdminBadges>(initial);
  const prev = useRef<AdminBadges>(initial);

  useEffect(() => {
    let cancelled = false;
    const tick = async () => {
      try {
        const res = await fetch("/api/admin/badges", { cache: "no-store" });
        if (!res.ok || cancelled) return;
        const next = (await res.json()) as AdminBadges;
        const p = prev.current;
        if (next.pendingReviews > p.pendingReviews) {
          toast.info("⭐ নতুন রিভিউ এসেছে — approve করুন");
        }
        if (next.pendingPayments > p.pendingPayments) {
          toast.info("💸 নতুন পেমেন্ট যাচাই বাকি আছে");
        }
        if (next.pendingOrders > p.pendingOrders) {
          toast.info("🧾 নতুন অর্ডার এসেছে");
        }
        if (
          next.unread !== p.unread ||
          next.pendingReviews !== p.pendingReviews ||
          next.pendingPayments !== p.pendingPayments ||
          next.pendingOrders !== p.pendingOrders
        ) {
          setBadges(next);
          router.refresh();
        }
        prev.current = next;
      } catch {
        // Polling is best-effort; the next tick retries.
      }
    };
    const id = setInterval(tick, POLL_MS);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, [router]);

  return badges;
}
