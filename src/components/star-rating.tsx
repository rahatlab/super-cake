"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { Star } from "lucide-react";
import { cn } from "@/lib/utils";

export function Stars({
  value,
  size = 16,
  className = "",
}: {
  value: number;
  size?: number;
  className?: string;
}) {
  return (
    <span className={cn("inline-flex items-center gap-0.5", className)} aria-label={`${value} out of 5`}>
      {[1, 2, 3, 4, 5].map((i) => (
        <Star
          key={i}
          width={size}
          height={size}
          className={i <= Math.round(value) ? "fill-warning text-warning" : "text-line"}
          strokeWidth={1.5}
        />
      ))}
    </span>
  );
}

/** Interactive 1–5 star picker with a spring pop on select. */
export function StarInput({
  value,
  onChange,
}: {
  value: number;
  onChange: (v: number) => void;
}) {
  const [hover, setHover] = useState(0);
  const shown = hover || value;

  return (
    <div className="flex items-center gap-1.5" role="radiogroup" aria-label="Rating">
      {[1, 2, 3, 4, 5].map((i) => (
        <motion.button
          key={i}
          type="button"
          role="radio"
          aria-checked={value === i}
          aria-label={`${i} star`}
          onMouseEnter={() => setHover(i)}
          onMouseLeave={() => setHover(0)}
          onClick={() => onChange(i)}
          whileTap={{ scale: 0.8 }}
          animate={{ scale: value === i ? 1.12 : 1 }}
          transition={{ type: "spring", stiffness: 420, damping: 14 }}
          className="grid place-items-center"
        >
          <Star
            width={30}
            height={30}
            className={i <= shown ? "fill-warning text-warning" : "text-line hover:text-muted"}
            strokeWidth={1.6}
          />
        </motion.button>
      ))}
    </div>
  );
}
