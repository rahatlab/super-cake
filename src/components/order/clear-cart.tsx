"use client";

import { useEffect } from "react";
import { useCart } from "@/components/cart/cart-context";

/** Clears the local cart once a verified order success page is shown. */
export function ClearCartOnMount() {
  const { clear } = useCart();

  useEffect(() => {
    clear();
  }, [clear]);

  return null;
}
