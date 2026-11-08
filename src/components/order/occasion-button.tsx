"use client";

import { motion } from "framer-motion";
import type { Occasion } from "@/lib/types";
import { Heart, Gift, Sparkles, Star } from "@animateicons/react/huge";
import { Check } from "lucide-react";
import { useAnimIcon } from "@/components/ui/use-anim-icon";

const OCCASION_ICON: Record<Occasion, typeof Star> = {
  birthday: Star,
  anniversary: Heart,
  occasion: Sparkles,
  gift: Gift,
  others: Star,
};

interface OccasionButtonProps {
  occasion: { value: Occasion; label: string; bn: string; hint: string };
  active: boolean;
  onSelect: (value: Occasion) => void;
}

export function OccasionButton({
  occasion,
  active,
  onSelect,
}: OccasionButtonProps) {
  const ref = useAnimIcon();
  const Icon = OCCASION_ICON[occasion.value];

  return (
    <motion.button
      type="button"
      onClick={() => onSelect(occasion.value)}
      whileHover={{ y: -4 }}
      whileTap={{ scale: 0.97 }}
      className={`relative rounded-2xl border-2 p-4 text-left transition-colors ${
        active ? "border-brand bg-brand/8" : "border-line bg-surface hover:border-brand/40"
      }`}
      aria-pressed={active}
      onMouseEnter={() => ref.current?.startAnimation()}
      onMouseLeave={() => ref.current?.stopAnimation()}
    >
      {active && (
        <motion.span
          layoutId="occ-check"
          className="absolute right-3 top-3 grid h-6 w-6 place-items-center rounded-full bg-brand text-brand-fg"
          transition={{ type: "spring", stiffness: 420, damping: 26 }}
        >
          <Check className="h-3.5 w-3.5" />
        </motion.span>
      )}
      <Icon ref={ref} size={32} aria-hidden />
      <p className="mt-2 text-sm font-extrabold">{occasion.label}</p>
      <p className="text-xs text-muted">
        {occasion.bn} · {occasion.hint}
      </p>
    </motion.button>
  );
}
