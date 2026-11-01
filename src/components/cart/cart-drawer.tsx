"use client";

import Link from "next/link";
import Image from "next/image";
import { AnimatePresence, motion } from "framer-motion";
import { Minus, Plus, ShoppingBag, Trash2, X } from "lucide-react";
import { useCart } from "./cart-context";
import { formatBDT, weightLabel } from "@/lib/utils";

export function CartDrawer() {
  const { items, open, setOpen, subtotal, setQty, remove, count } = useCart();

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            key="overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setOpen(false)}
            className="fixed inset-0 z-50 bg-black/55 backdrop-blur-[2px]"
          />
          <motion.aside
            key="drawer"
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ type: "spring", stiffness: 340, damping: 34 }}
            className="fixed right-0 top-0 z-50 flex h-full w-full max-w-md flex-col border-l border-line bg-surface shadow-lift"
            aria-label="Shopping cart"
          >
            <header className="flex items-center justify-between border-b border-line px-5 py-4">
              <div className="flex items-center gap-2">
                <ShoppingBag className="h-5 w-5 text-brand" />
                <h2 className="text-base font-bold">আপনার কার্ট</h2>
                <span className="badge bg-brand/12 text-brand-strong">{count} item</span>
              </div>
              <button
                onClick={() => setOpen(false)}
                aria-label="Close cart"
                className="grid h-9 w-9 place-items-center rounded-full border border-line hover:bg-fg/5"
              >
                <X className="h-4 w-4" />
              </button>
            </header>

            <div className="flex-1 overflow-y-auto px-4 py-4">
              {items.length === 0 ? (
                <div className="flex h-full flex-col items-center justify-center gap-3 text-center">
                  <span className="text-5xl">🧺</span>
                  <p className="font-semibold">কার্ট এখন খালি</p>
                  <p className="text-sm text-muted">মজার কেক বেছে নিন এখনই!</p>
                  <Link href="/cakes" onClick={() => setOpen(false)} className="btn btn-primary btn-sm">
                    কেক দেখুন
                  </Link>
                </div>
              ) : (
                <ul className="space-y-3">
                  {items.map((it) => (
                    <motion.li
                      key={`${it.cake_id}-${it.weight ?? 0}`}
                      layout
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, x: 30 }}
                      className="flex gap-3 rounded-2xl border border-line bg-bg p-3"
                    >
                      <div className="relative h-16 w-16 shrink-0 overflow-hidden rounded-xl bg-brand/10">
                        {it.image && <Image src={it.image} alt={it.name} fill sizes="64px" className="object-cover" />}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-semibold">{it.name}</p>
                        {it.weight ? (
                          <p className="text-xs text-muted">{weightLabel(it.weight)}</p>
                        ) : null}
                        <p className="mt-1 text-sm font-bold text-brand-strong">
                          {formatBDT(it.unit_price * it.quantity)}
                        </p>
                      </div>
                      <div className="flex flex-col items-end justify-between">
                        <button
                          onClick={() => remove(it.cake_id, it.weight)}
                          aria-label="Remove"
                          className="text-muted transition-colors hover:text-danger"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                        <div className="flex items-center gap-1.5 rounded-full border border-line px-1">
                          <button
                            onClick={() => setQty(it.cake_id, it.weight, it.quantity - 1)}
                            aria-label="Decrease"
                            className="grid h-6 w-6 place-items-center rounded-full hover:bg-fg/5"
                          >
                            <Minus className="h-3 w-3" />
                          </button>
                          <span className="w-4 text-center text-xs font-bold">{it.quantity}</span>
                          <button
                            onClick={() => setQty(it.cake_id, it.weight, it.quantity + 1)}
                            aria-label="Increase"
                            className="grid h-6 w-6 place-items-center rounded-full hover:bg-fg/5"
                          >
                            <Plus className="h-3 w-3" />
                          </button>
                        </div>
                      </div>
                    </motion.li>
                  ))}
                </ul>
              )}
            </div>

            {items.length > 0 && (
              <footer className="border-t border-line px-5 py-4">
                <div className="mb-3 flex items-center justify-between text-sm">
                  <span className="text-muted">সাবটোটাল</span>
                  <span className="text-lg font-extrabold">{formatBDT(subtotal)}</span>
                </div>
                <Link
                  href="/order"
                  onClick={() => setOpen(false)}
                  className="btn btn-primary btn-block btn-lg"
                >
                  Checkout এ যান →
                </Link>
                <p className="mt-2 text-center text-[11px] text-muted">
                  ডেলিভারি চার্জ ও ছাড় checkout-এ যোগ হবে
                </p>
              </footer>
            )}
          </motion.aside>
        </>
      )}
    </AnimatePresence>
  );
}
