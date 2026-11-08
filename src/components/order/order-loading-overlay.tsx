"use client";

import { useEffect } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Loading01Icon } from "@animateicons/react/huge";

/**
 * Full-page loading overlay shown while an order is being placed.
 */
export function OrderLoadingOverlay({
  show,
  message,
}: {
  show: boolean;
  message?: string;
}) {
  useEffect(() => {
    if (!show) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [show]);

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          className="fixed inset-0 z-[100] grid place-items-center bg-black/70 backdrop-blur-sm"
          role="status"
          aria-live="polite"
          aria-label={message ?? "অর্ডার প্রসেস হচ্ছে"}
        >
          <div className="flex flex-col items-center gap-4 px-6 text-center">
            <span className="grid h-16 w-16 place-items-center rounded-full bg-brand/15">
              {/* animateicons loader — spins for as long as the overlay is up. */}
              <Loading01Icon size={32} className="animate-spin text-brand" />
            </span>
            <p className="text-lg font-extrabold text-white">
              {message ?? "অর্ডার প্রসেস হচ্ছে…"}
            </p>
            <p className="max-w-xs text-sm text-white/70">
              অনুগ্রহ করে অপেক্ষা করুন — পেজ বন্ধ করবেন না।
            </p>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
