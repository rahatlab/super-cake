"use client";

import { useEffect, useState } from "react";
import { useTheme } from "next-themes";
import { AnimatePresence, motion } from "framer-motion";

export function ThemeToggle({ className = "" }: { className?: string }) {
  const { resolvedTheme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  // eslint-disable-next-line react-hooks/set-state-in-effect -- next-themes resolves the theme after hydration
  useEffect(() => setMounted(true), []);

  const isDark = resolvedTheme === "dark";

  return (
    <button
      type="button"
      aria-label={isDark ? "Light theme চালু করুন" : "Dark theme চালু করুন"}
      onClick={() => setTheme(isDark ? "light" : "dark")}
      className={`relative grid h-10 w-10 place-items-center overflow-hidden rounded-full border border-line bg-surface transition-colors hover:border-brand/50 ${className}`}
    >
      {/* soft glow behind the icon */}
      <span
        className="pointer-events-none absolute inset-0 transition-opacity duration-300"
        style={{
          opacity: mounted ? (isDark ? 1 : 0) : 0,
          background: "radial-gradient(circle at 50% 50%, hsl(var(--brand) / 0.35), transparent 65%)",
        }}
      />
      <AnimatePresence mode="wait" initial={false}>
        {mounted ? (
          isDark ? (
            <motion.span
              key="moon"
              initial={{ y: -14, opacity: 0, rotate: -40 }}
              animate={{ y: 0, opacity: 1, rotate: 0 }}
              exit={{ y: 14, opacity: 0, rotate: 40 }}
              transition={{ type: "spring", stiffness: 420, damping: 22 }}
              className="relative text-lg"
            >
              🌙
            </motion.span>
          ) : (
            <motion.span
              key="sun"
              initial={{ y: 14, opacity: 0, scale: 0.6 }}
              animate={{ y: 0, opacity: 1, scale: 1 }}
              exit={{ y: -14, opacity: 0, scale: 0.6 }}
              transition={{ type: "spring", stiffness: 420, damping: 22 }}
              className="relative text-lg"
            >
              ☀️
            </motion.span>
          )
        ) : (
          <span className="relative text-lg opacity-0">☀️</span>
        )}
      </AnimatePresence>
    </button>
  );
}
