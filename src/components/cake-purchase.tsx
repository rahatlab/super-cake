"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { Check, Minus, Plus, ShoppingBag, Zap } from "lucide-react";
import type { Cake } from "@/lib/types";
import { formatBDT, waLink, weightLabel } from "@/lib/utils";
import { AnimatedNumber } from "@/components/reveal";
import { useCart } from "@/components/cart/cart-context";

export function CakePurchase({
  cake,
  whatsappPhone,
  storeName,
  deliveryCharge,
  freeDeliveryEnabled,
  freeDeliveryMin,
}: {
  cake: Cake;
  whatsappPhone: string;
  storeName: string;
  deliveryCharge: number;
  freeDeliveryEnabled: boolean;
  freeDeliveryMin: number;
}) {
  const router = useRouter();
  const { add, setOpen } = useCart();

  const available = useMemo(() => (cake.sizes ?? []).filter((s) => s.is_available), [cake.sizes]);
  const initial = available.find((s) => s.weight === 1) ?? available[0];

  const [weight, setWeight] = useState<number | undefined>(initial?.weight);
  const [qty, setQty] = useState(1);
  const [added, setAdded] = useState(false);

  const selected = available.find((s) => Math.abs((s.weight ?? 0) - (weight ?? 0)) < 0.01);
  const unit = selected?.price ?? cake.base_price;
  const lineTotal = unit * qty;
  const soldOut = cake.stock <= 0;

  const item = {
    cake_id: cake.id,
    name: cake.name,
    slug: cake.slug,
    image: cake.image_urls[0],
    weight,
    unit_price: unit,
    quantity: qty,
  };

  const handleAdd = () => {
    if (soldOut) return;
    add(item);
    setAdded(true);
    setTimeout(() => setAdded(false), 1600);
  };

  const handleBuyNow = () => {
    if (soldOut) return;
    add(item);
    setOpen(false);
    router.push("/order");
  };

  const wa = waLink(
    whatsappPhone,
    `হ্যালো ${storeName}! আমি "${cake.name}" (${weight ? weightLabel(weight) : "1 lb"} × ${qty}) অর্ডার করতে চাই। দাম ${formatBDT(lineTotal)}।`,
  );

  return (
    <div className="space-y-5">
      {/* weight selector */}
      {available.length > 0 && (
        <div>
          <div className="mb-2 flex items-baseline justify-between">
            <span className="label !mb-0">ওজন বাছুন</span>
            <span className="text-xs text-muted">½ lb – 3 lb</span>
          </div>
          <div className="flex flex-wrap gap-2">
            {available.map((s) => {
              const active = Math.abs((weight ?? 0) - s.weight) < 0.01;
              return (
                <motion.button
                  key={s.id}
                  type="button"
                  onClick={() => setWeight(s.weight)}
                  whileTap={{ scale: 0.95 }}
                  data-active={active}
                  className="chip relative"
                  aria-pressed={active}
                >
                  {weightLabel(s.weight)}
                  <span className="ml-1 text-[11px] font-semibold text-muted">{formatBDT(s.price)}</span>
                  {active && (
                    <motion.span
                      layoutId="weight-active"
                      className="absolute inset-0 -z-10 rounded-full border-2 border-brand"
                      transition={{ type: "spring", stiffness: 420, damping: 32 }}
                    />
                  )}
                </motion.button>
              );
            })}
          </div>
        </div>
      )}

      {/* live price */}
      <div className="card flex items-end justify-between gap-3 bg-brand/6 !border-brand/25 px-4 py-3.5">
        <div>
          <p className="text-xs font-semibold text-muted">একক দাম</p>
          <AnimatedNumber
            key={`${weight}-${qty}`}
            value={unit}
            prefix="৳"
            className="font-display text-3xl font-extrabold text-brand-strong"
          />
        </div>
        <div className="text-right">
          <p className="text-xs font-semibold text-muted">মোট ({qty} টি)</p>
          <AnimatedNumber
            key={`total-${lineTotal}`}
            value={lineTotal}
            prefix="৳"
            className="font-display text-xl font-extrabold"
          />
        </div>
      </div>

      {/* quantity */}
      <div className="flex items-center justify-between gap-4 rounded-2xl border border-line px-4 py-3">
        <span className="text-sm font-semibold">পরিমাণ</span>
        <div className="flex items-center gap-3">
          <motion.button
            whileTap={{ scale: 0.85 }}
            onClick={() => setQty((q) => Math.max(1, q - 1))}
            disabled={qty <= 1}
            className="grid h-9 w-9 place-items-center rounded-full border border-line disabled:opacity-40"
            aria-label="কমান"
          >
            <Minus className="h-4 w-4" />
          </motion.button>
          <AnimatePresence mode="popLayout">
            <motion.span
              key={qty}
              initial={{ y: -10, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 10, opacity: 0 }}
              className="w-8 text-center text-lg font-extrabold tabular-nums"
            >
              {qty}
            </motion.span>
          </AnimatePresence>
          <motion.button
            whileTap={{ scale: 0.85 }}
            onClick={() => setQty((q) => Math.min(50, q + 1))}
            disabled={qty >= 50}
            className="grid h-9 w-9 place-items-center rounded-full border border-line disabled:opacity-40"
            aria-label="বাড়ান"
          >
            <Plus className="h-4 w-4" />
          </motion.button>
        </div>
      </div>

      {/* actions */}
      <div className="space-y-2.5">
        <motion.button
          whileTap={{ scale: 0.98 }}
          onClick={handleAdd}
          disabled={soldOut}
          className="btn btn-primary btn-lg btn-block"
        >
          <AnimatePresence mode="wait" initial={false}>
            {added ? (
              <motion.span
                key="done"
                initial={{ scale: 0.6, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.6, opacity: 0 }}
                className="inline-flex items-center gap-2"
              >
                <Check className="h-4 w-4" /> কার্টে যোগ হয়েছে
              </motion.span>
            ) : (
              <motion.span
                key="add"
                initial={{ scale: 0.6, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.6, opacity: 0 }}
                className="inline-flex items-center gap-2"
              >
                <ShoppingBag className="h-4 w-4" />
                {soldOut ? "Sold Out" : "কার্টে দিন"}
              </motion.span>
            )}
          </AnimatePresence>
        </motion.button>

        {!soldOut && (
          <button onClick={handleBuyNow} className="btn btn-ghost btn-lg btn-block">
            <Zap className="h-4 w-4" /> সরাসরি অর্ডার করুন
          </button>
        )}

        <a href={wa} target="_blank" rel="noopener noreferrer" className="btn btn-soft btn-block">
          💬 WhatsApp এ অর্ডার
        </a>
      </div>

      <ul className="space-y-1.5 border-t border-line pt-4 text-[13px] text-muted">
        <li>
          {deliveryCharge <= 0 || (freeDeliveryEnabled && freeDeliveryMin <= 0)
            ? "🚚 ডেলিভারি সম্পূর্ণ ফ্রি"
            : freeDeliveryEnabled && freeDeliveryMin > 0
              ? `🚚 ডেলিভারি ${formatBDT(deliveryCharge)} — ${formatBDT(freeDeliveryMin)}+ অর্ডারে ফ্রি`
              : `🚚 ডেলিভারি চার্জ ${formatBDT(deliveryCharge)} — পরের step এ যোগ হবে`}
        </li>
        <li>💳 Cash on Delivery বা bKash — দুটোই চলবে</li>
        <li>✍️ Message on cake ও design note অর্ডারের সময় দিতে পারবেন</li>
      </ul>
    </div>
  );
}
