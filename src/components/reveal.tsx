import type { CSSProperties, ReactNode } from "react";

/**
 * Scroll/mount reveal — pure CSS, no framer-motion.
 *
 * The old `initial="hidden"` variant rendered `opacity: 0` into the HTML, so
 * nothing below the fold was visible until the JS bundle loaded and the
 * IntersectionObserver fired (bad for LCP and for no-JS readers). The CSS
 * animation here starts from the server HTML and ends in the visible state,
 * and the global `prefers-reduced-motion` rule disables it entirely.
 */
export function Reveal({
  children,
  delay = 0,
  className = "",
}: {
  children: ReactNode;
  delay?: number;
  className?: string;
  /** Kept for API compatibility; the CSS animation always plays once. */
  once?: boolean;
}) {
  return (
    <div
      className={`${className} animate-reveal-up`}
      style={{ animationDelay: `${delay}s` } as CSSProperties}
    >
      {children}
    </div>
  );
}

/** Value pop-in used for prices, ratings and totals — CSS only. */
export function AnimatedNumber({
  value,
  prefix = "",
  className = "",
}: {
  value: number;
  prefix?: string;
  className?: string;
}) {
  return (
    <span
      key={value}
      className={`${className} inline-block animate-rise-in`}
      style={{ animationDelay: "0s" } as CSSProperties}
    >
      {prefix}
      {new Intl.NumberFormat("en-BD").format(Math.round(value))}
    </span>
  );
}
