"use client";

import { motion, useReducedMotion } from "framer-motion";

const PIECES = Array.from({ length: 34 }, (_, i) => ({
  id: i,
  x: (Math.random() - 0.5) * 520,
  y: -120 - Math.random() * 260,
  rot: Math.random() * 720 - 360,
  color: ["#ff5f7e", "#ffd166", "#8ee3ef", "#b58fd6", "#7ef0c0", "#ffb648"][i % 6],
  delay: Math.random() * 0.35,
  size: 7 + Math.random() * 8,
  round: i % 3 === 0,
}));

/** Confetti burst + checkmark pop for the order-success page. */
export function SuccessAnimation() {
  const reduce = useReducedMotion();

  return (
    <div className="relative mx-auto grid h-36 w-full max-w-md place-items-center overflow-visible">
      {!reduce && (
        <div aria-hidden className="pointer-events-none absolute inset-x-0 top-0">
          {PIECES.map((p) => (
            <motion.span
              key={p.id}
              className="absolute left-1/2 top-8"
              style={{
                width: p.size,
                height: p.round ? p.size : p.size * 1.8,
                background: p.color,
                borderRadius: p.round ? "999px" : "2px",
              }}
              initial={{ x: 0, y: 0, opacity: 1, rotate: 0, scale: 1 }}
              animate={{ x: p.x, y: p.y, opacity: 0, rotate: p.rot, scale: 0.5 }}
              transition={{ duration: 1.5, delay: p.delay, ease: [0.16, 1, 0.3, 1] }}
            />
          ))}
        </div>
      )}

      <motion.div
        initial={{ scale: 0, rotate: -30 }}
        animate={{ scale: 1, rotate: 0 }}
        transition={{ type: "spring", stiffness: 260, damping: 14, delay: 0.15 }}
        className="relative grid h-24 w-24 place-items-center rounded-full bg-gradient-to-br from-success/25 to-brand/20"
      >
        <motion.svg
          width="56"
          height="56"
          viewBox="0 0 56 56"
          initial={{ pathLength: 0 }}
          animate={{ pathLength: 1 }}
          transition={{ duration: 0.6, delay: 0.5, ease: "easeOut" }}
        >
          <motion.path
            d="M14 29 L24 39 L42 19"
            fill="none"
            stroke="hsl(var(--success))"
            strokeWidth="5"
            strokeLinecap="round"
            strokeLinejoin="round"
            initial={{ pathLength: 0 }}
            animate={{ pathLength: 1 }}
            transition={{ duration: 0.55, delay: 0.5, ease: "easeOut" }}
          />
        </motion.svg>
      </motion.div>
    </div>
  );
}
