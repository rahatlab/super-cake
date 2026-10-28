"use client";

import { useState } from "react";
import { Check, Copy } from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";

export function BlogShare({ title }: { title: string }) {
  const [copied, setCopied] = useState(false);

  const share = async () => {
    // Read the URL at click time: window is not available during SSR, and this
    // avoids a mount-only state update.
    const url = window.location.href;
    if (typeof navigator.share === "function") {
      try {
        await navigator.share({ title, text: title, url });
        return;
      } catch {
        /* user dismissed — fall through to copy */
      }
    }
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      /* clipboard blocked */
    }
  };

  return (
    <button type="button" onClick={share} className="btn btn-ghost btn-sm !px-3">
      <AnimatePresence mode="wait" initial={false}>
        {copied ? (
          <motion.span
            key="copied"
            initial={{ scale: 0.7, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.7, opacity: 0 }}
            className="inline-flex items-center gap-1.5 text-success"
          >
            <Check className="h-3.5 w-3.5" /> কপি হয়েছে
          </motion.span>
        ) : (
          <motion.span
            key="share"
            initial={{ scale: 0.7, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.7, opacity: 0 }}
            className="inline-flex items-center gap-1.5"
          >
            <Copy className="h-3.5 w-3.5" />
            শেয়ার
          </motion.span>
        )}
      </AnimatePresence>
    </button>
  );
}
