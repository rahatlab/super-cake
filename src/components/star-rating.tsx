"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { Star } from "@animateicons/react/huge";
import { cn } from "@/lib/utils";
import { useAnimIcon } from "@/components/ui/use-anim-icon";

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
          size={size}
          className={i <= Math.round(value) ? "fill-warning text-warning" : "text-line"}
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
        <StarButton key={i} i={i} value={value} shown={shown} onChange={onChange} setHover={setHover} />
      ))}
    </div>
  );
}

function StarButton({
  i,
  value,
  shown,
  onChange,
  setHover,
}: {
  i: number;
  value: number;
  shown: number;
  onChange: (v: number) => void;
  setHover: (v: number) => void;
}) {
  const ref = useAnimIcon();
  return (
    <motion.button
      type="button"
      role="radio"
      aria-checked={value === i}
      aria-label={`${i} star`}
      onMouseEnter={() => {
        setHover(i);
        ref.current?.startAnimation();
      }}
      onMouseLeave={() => {
        setHover(0);
        ref.current?.stopAnimation();
      }}
      onClick={() => onChange(i)}
      whileTap={{ scale: 0.8 }}
      animate={{ scale: value === i ? 1.12 : 1 }}
      transition={{ type: "spring", stiffness: 420, damping: 14 }}
      className="grid place-items-center"
    >
      <Star
        ref={ref}
        size={30}
        className={i <= shown ? "fill-warning text-warning" : "text-line hover:text-muted"}
      />
    </motion.button>
  );
}
