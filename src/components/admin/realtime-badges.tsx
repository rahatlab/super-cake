"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "react-toastify";
import { playNotificationSound, setNotificationVolume, setSoundSettings } from "@/lib/notification-sound";
import type { Settings } from "@/lib/types";

export interface AdminBadges {
  unread: number;
  pendingReviews: number;
  pendingPayments: number;
  pendingOrders: number;
}

const POLL_MS = 20_000;

export function useAdminBadges(initial: AdminBadges, soundEnabled = true, soundVolume = 50, sounds: Settings["notification_sounds"] = {}) {
  const router = useRouter();
  const [badges, setBadges] = useState<AdminBadges>(initial);
  const prev = useRef<AdminBadges>(initial);

  useEffect(() => {
    setNotificationVolume(soundVolume / 100);
    for (const kind of ["order", "payment", "review"] as const) {
      const s = sounds[kind];
      if (s) setSoundSettings(kind, s);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- settings object identity changes per render
  }, [soundVolume, JSON.stringify(sounds)]);

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
          if (soundEnabled) playNotificationSound("review");
        }
        if (next.pendingPayments > p.pendingPayments) {
          toast.info("💸 নতুন পেমেন্ট যাচাই বাকি আছে");
          if (soundEnabled) playNotificationSound("payment");
        }
        if (next.pendingOrders > p.pendingOrders) {
          toast.info("🧾 নতুন অর্ডার এসেছে");
          if (soundEnabled) playNotificationSound("order");
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
  }, [router, soundEnabled]);

  return badges;
}
