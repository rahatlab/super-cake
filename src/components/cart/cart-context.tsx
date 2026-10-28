"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import type { OrderItem } from "@/lib/types";

const KEY = "sc_cart_v1";

interface CartCtx {
  items: OrderItem[];
  count: number;
  subtotal: number;
  add: (item: OrderItem) => void;
  remove: (cakeId: string, weight?: number) => void;
  setQty: (cakeId: string, weight: number | undefined, qty: number) => void;
  clear: () => void;
  open: boolean;
  setOpen: (v: boolean) => void;
}

const Ctx = createContext<CartCtx | null>(null);

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<OrderItem[]>([]);
  const [open, setOpen] = useState(false);
  const [hydrated, setHydrated] = useState(false);
  const firstWrite = useRef(true);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        // eslint-disable-next-line react-hooks/set-state-in-effect -- localStorage is only readable after mount
        if (Array.isArray(parsed)) setItems(parsed as OrderItem[]);
      }
    } catch {
      /* ignore corrupt cart */
    }
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    try {
      localStorage.setItem(KEY, JSON.stringify(items));
      // Skip the very first write (items restored from storage) so a returning
      // visitor's cart still counts as "stale" for the reminder.
      if (firstWrite.current) {
        firstWrite.current = false;
        return;
      }
      localStorage.setItem("sc_cart_updated", String(Date.now()));
    } catch {
      /* storage full/blocked */
    }
  }, [items, hydrated]);

  const add = useCallback((item: OrderItem) => {
    setItems((prev) => {
      const idx = prev.findIndex(
        (p) => p.cake_id === item.cake_id && (p.weight ?? 0) === (item.weight ?? 0),
      );
      if (idx >= 0) {
        const next = [...prev];
        next[idx] = { ...next[idx], quantity: Math.min(50, next[idx].quantity + item.quantity) };
        return next;
      }
      return [...prev, item];
    });
    setOpen(true);
  }, []);

  const remove = useCallback((cakeId: string, weight?: number) => {
    setItems((prev) => prev.filter((p) => !(p.cake_id === cakeId && (p.weight ?? 0) === (weight ?? 0))));
  }, []);

  const setQty = useCallback((cakeId: string, weight: number | undefined, qty: number) => {
    setItems((prev) =>
      prev
        .map((p) =>
          p.cake_id === cakeId && (p.weight ?? 0) === (weight ?? 0)
            ? { ...p, quantity: Math.max(0, Math.min(50, qty)) }
            : p,
        )
        .filter((p) => p.quantity > 0),
    );
  }, []);

  const clear = useCallback(() => setItems([]), []);

  const value = useMemo<CartCtx>(() => {
    const count = items.reduce((s, i) => s + i.quantity, 0);
    const subtotal = items.reduce((s, i) => s + i.unit_price * i.quantity, 0);
    return { items, count, subtotal, add, remove, setQty, clear, open, setOpen };
  }, [items, add, remove, setQty, clear, open]);

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useCart(): CartCtx {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useCart must be used inside <CartProvider>");
  return ctx;
}
