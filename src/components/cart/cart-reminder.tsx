"use client";

import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { CakeSlice, ShoppingBag, X } from "lucide-react";
import { useCart } from "./cart-context";
import { formatBDT, waLink } from "@/lib/utils";

const UPDATED_KEY = "sc_cart_updated";
const DISMISS_KEY = "sc_cart_reminder_dismissed";
/** Only nudge when the cart has been idle for 30+ minutes. */
const STALE_MS = 30 * 60 * 1000;

/**
 * Abandoned-cart reminder.
 *
 * The cart lives in localStorage, so a returning visitor with old items gets a
 * gentle nudge plus a pre-filled WhatsApp order link. Shown at most once per
 * browser session.
 */
export function CartReminder({ whatsappPhone }: { whatsappPhone: string }) {
  const { count, items, subtotal, setOpen } = useCart();
  const [show, setShow] = useState(false);

  useEffect(() => {
    if (count === 0) return;
    try {
      if (sessionStorage.getItem(DISMISS_KEY) === "1") return;
      const raw = localStorage.getItem(UPDATED_KEY);
      const ts = raw ? Number(raw) : 0;
      if (!ts || Date.now() - ts < STALE_MS) return;
      const timer = window.setTimeout(() => setShow(true), 2500);
      return () => window.clearTimeout(timer);
    } catch {
      return;
    }
  }, [count]);

  function dismiss() {
    setShow(false);
    try {
      sessionStorage.setItem(DISMISS_KEY, "1");
    } catch {
      /* ignore */
    }
  }

  const summary = items
    .slice(0, 4)
    .map((i) => `• ${i.name}${i.weight ? ` (${i.weight} lb)` : ""} × ${i.quantity}`)
    .join("\n");

  const message = `হ্যালো! আমার কার্টে এই কেকগুলো আছে:\n${summary}\n\nমোট: ${formatBDT(
    subtotal,
  )}\nঅর্ডারটি সম্পন্ন করতে চাই 🎂`;

  return (
    <AnimatePresence>
      {show && count > 0 && (
        <motion.aside
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 24 }}
          transition={{ type: "spring", stiffness: 320, damping: 28 }}
          role="status"
          aria-label="কার্ট রিমাইন্ডার"
          className="fixed inset-x-3 bottom-3 z-40 mx-auto max-w-md rounded-2xl border border-brand/30 bg-surface/95 p-4 shadow-soft backdrop-blur sm:inset-x-auto sm:left-4 sm:mx-0"
        >
          <div className="flex items-start gap-3">
            <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-brand/12 text-brand-strong">
              <CakeSlice className="h-5 w-5" aria-hidden />
            </span>

            <div className="min-w-0 flex-1">
              <p className="text-sm font-extrabold">আপনার কার্টে কেক অপেক্ষা করছে 🎂</p>
              <p className="mt-0.5 text-xs text-muted">
                {count} টি আইটেম · {formatBDT(subtotal)} — অর্ডারটি শেষ করবেন?
              </p>

              <div className="mt-3 flex flex-wrap gap-2">
                <button type="button" onClick={() => { setOpen(true); dismiss(); }} className="btn btn-primary btn-sm">
                  <ShoppingBag className="h-3.5 w-3.5" aria-hidden />
                  কার্ট দেখুন
                </button>
                <a
                  href={waLink(whatsappPhone, message)}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={dismiss}
                  className="btn btn-soft btn-sm"
                >
                  WhatsApp-এ অর্ডার
                </a>
              </div>
            </div>

            <button
              type="button"
              onClick={dismiss}
              className="grid h-7 w-7 shrink-0 place-items-center rounded-full text-muted hover:bg-fg/5 hover:text-fg"
              aria-label="রিমাইন্ডার বন্ধ করুন"
            >
              <X className="h-4 w-4" aria-hidden />
            </button>
          </div>
        </motion.aside>
      )}
    </AnimatePresence>
  );
}
