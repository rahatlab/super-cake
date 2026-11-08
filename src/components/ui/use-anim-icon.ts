"use client";

import { useRef } from "react";

export interface AnimIconHandle {
  startAnimation: () => void;
  stopAnimation: () => void;
}

/**
 * Ref for an AnimateIcons icon (icons only animate through their ref).
 *
 * Attach it to the icon — `ref={iconRef}` — and drive it from the surface
 * that should trigger the animation (a card, a row, a button) with inline
 * event handlers:
 *
 *   onMouseEnter={() => iconRef.current?.startAnimation()}
 *   onMouseLeave={() => iconRef.current?.stopAnimation()}
 *
 * Inline handlers keep the ref read inside an event, which is what the
 * react-hooks/refs rule requires (returning handlers from a hook trips it).
 */
export function useAnimIcon() {
  return useRef<AnimIconHandle>(null);
}
