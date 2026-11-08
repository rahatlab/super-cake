"use client";

import Link from "next/link";
import type { Occasion } from "@/lib/types";
import { Heart, Gift, Sparkles, Star } from "@animateicons/react/huge";
import { useAnimIcon } from "@/components/ui/use-anim-icon";

const OCCASION_ICON: Record<Occasion, typeof Star> = {
  birthday: Star,
  anniversary: Heart,
  occasion: Sparkles,
  gift: Gift,
  others: Star,
};

/**
 * Occasion filter chip with AnimateIcon — icon plays on hover (docs:
 * "Buttons & tooltips" pattern: control owns hover, icon follows).
 */
export function OccasionChip({
  occasion,
}: {
  occasion: { value: Occasion; label: string; bn: string };
}) {
  const Icon = OCCASION_ICON[occasion.value];
  const ref = useAnimIcon();

  return (
    <Link
      href={`/cakes?occasion=${occasion.value}`}
      className="chip"
      onMouseEnter={() => ref.current?.startAnimation()}
      onMouseLeave={() => ref.current?.stopAnimation()}
    >
      <Icon ref={ref} size={16} aria-hidden />
      {occasion.label}
      <span className="font-normal text-muted">· {occasion.bn}</span>
    </Link>
  );
}

/**
 * Just the animated occasion icon (for admin chips, badges, etc.).
 * Wrap it in the interactive element and pass hover handlers.
 */
export function OccasionIcon({
  value,
  className,
  size = 16,
  onMouseEnter,
  onMouseLeave,
}: {
  value: Occasion;
  className?: string;
  size?: number;
  onMouseEnter?: () => void;
  onMouseLeave?: () => void;
}) {
  const Icon = OCCASION_ICON[value];
  const ref = useAnimIcon();
  return (
    <Icon
      ref={ref}
      size={size}
      className={className}
      aria-hidden
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
    />
  );
}
