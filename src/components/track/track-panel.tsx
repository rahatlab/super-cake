"use client";

import Link from "next/link";
import { useActionState, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Check, Loader2, MapPin, MessageCircle, Phone, Search, Star } from "lucide-react";
import type { Order } from "@/lib/types";
import { ORDER_STATUS_FLOW, ORDER_STATUS_META } from "@/lib/constants";
import { formatBDT, formatDateTime, waLink } from "@/lib/utils";
import { trackOrderAction, type TrackResult } from "@/lib/actions/order";

const initialState: TrackResult = {};

export function TrackPanel({
  initialNo,
  phone,
  storeName,
  whatsappPhone,
}: {
  initialNo?: string;
  phone?: string;
  storeName: string;
  whatsappPhone: string;
}) {
  const [order, setOrder] = useState<Order | undefined>(undefined);
  const [state, formAction, pending] = useActionState(
    async (prev: TrackResult, fd: FormData) => {
      const result = await trackOrderAction(prev, fd);
      // Keep the last successful order visible when a later lookup fails.
      if (result.order) setOrder(result.order);
      return result;
    },
    initialState,
  );

  return (
    <div className="mx-auto max-w-3xl">
      {/* search card */}
      <div className="card relative overflow-hidden p-6">
        <div
          aria-hidden
          className="pointer-events-none absolute -right-16 -top-16 h-52 w-52 rounded-full blur-3xl"
          style={{ background: "radial-gradient(circle, hsl(var(--brand) / 0.25), transparent 70%)" }}
        />

        <form action={formAction} className="relative grid gap-3 sm:grid-cols-[1.4fr_1fr_auto]">
          <div>
            <label className="label" htmlFor="order_no">অর্ডার আইডি</label>
            <input
              id="order_no"
              name="order_no"
              required
              className="field uppercase"
              defaultValue={initialNo ?? ""}
              placeholder="SC-261026-1234"
            />
          </div>
          <div>
            <label className="label" htmlFor="phone">ফোন নম্বর</label>
            <input
              id="phone"
              name="phone"
              required
              inputMode="tel"
              className="field"
              defaultValue={phone ?? ""}
              placeholder="01XXXXXXXXX"
            />
          </div>
          <div className="flex items-end">
            <button type="submit" disabled={pending} className="btn btn-primary btn-lg w-full sm:w-auto">
              {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
              খুঁজুন
            </button>
          </div>
        </form>

        <AnimatePresence>
          {state.error && (
            <motion.p
              initial={{ opacity: 0, y: -6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="mt-3 rounded-xl border border-danger/40 bg-danger/10 px-4 py-2.5 text-sm text-danger"
            >
              {state.error}
            </motion.p>
          )}
        </AnimatePresence>
      </div>

      {/* result */}
      <AnimatePresence mode="wait">
        {order && (
          <motion.div
            key={order.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
            className="mt-6 space-y-5"
          >
            <OrderTimeline order={order} />

            <div className="card p-5">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <p className="text-xs font-semibold text-muted">অর্ডার</p>
                  <p className="font-display text-xl font-extrabold">{order.order_no}</p>
                  <p className="mt-1 text-xs text-muted">অর্ডারের সময়: {formatDateTime(order.created_at)}</p>
                </div>
                <div className="text-right">
                  <p className="text-xs font-semibold text-muted">মোট</p>
                  <p className="font-display text-2xl font-extrabold text-brand-strong">
                    {formatBDT(order.total)}
                  </p>
                  <p className="text-[11px] text-muted">
                    {order.payment_method === "cod" ? "Cash on Delivery" : "bKash"} ·{" "}
                    {order.payment_status === "paid"
                      ? "Paid ✅"
                      : order.payment_status === "pending_verify"
                        ? "ভেরিফাই হচ্ছে"
                        : "বাকি"}
                  </p>
                </div>
              </div>

              <div className="mt-4 grid gap-3 border-t border-line pt-4 text-sm sm:grid-cols-2">
                <div>
                  <p className="text-xs font-semibold text-muted">আইটেম</p>
                  <ul className="mt-1 space-y-1">
                    {order.items.map((it, i) => (
                      <li key={i}>
                        {it.name}
                        {it.weight ? ` · ${it.weight} lb` : ""} × {it.quantity}
                      </li>
                    ))}
                  </ul>
                </div>
                <div>
                  <p className="text-xs font-semibold text-muted">ডেলিভারি</p>
                  <p className="mt-1 flex items-start gap-1.5">
                    <MapPin className="mt-0.5 h-3.5 w-3.5 shrink-0 text-brand" />
                    {order.address}
                  </p>
                  <p className="mt-1 text-xs text-muted">{order.delivery_date}</p>
                </div>
              </div>

              {order.custom_spec?.message_on_cake && (
                <p className="mt-3 rounded-xl border border-dashed border-brand/40 bg-brand/6 px-4 py-2.5 text-center text-sm font-semibold text-brand-strong">
                  ✍️ {order.custom_spec.message_on_cake}
                </p>
              )}
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <a
                href={waLink(
                  whatsappPhone,
                  `হ্যালো ${storeName}! আমার অর্ডার ${order.order_no} নিয়ে জানতে চাই।`,
                )}
                target="_blank"
                rel="noopener noreferrer"
                className="btn btn-soft btn-block"
              >
                <MessageCircle className="h-4 w-4" /> WhatsApp এ কথা বলুন
              </a>

              {["delivered", "completed"].includes(order.order_status) ? (
                <Link href={`/review/${order.id}`} className="btn btn-primary btn-block">
                  <Star className="h-4 w-4" /> রিভিউ দিন
                </Link>
              ) : (
                <span className="btn btn-ghost btn-block !cursor-default opacity-70">
                  <Phone className="h-4 w-4" /> ডেলিভারির পর রিভিউ দিতে পারবেন
                </span>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

/* --------------------------- timeline --------------------------- */

function OrderTimeline({ order }: { order: Order }) {
  const cancelled = order.order_status === "cancelled";
  const flow = ORDER_STATUS_FLOW;
  const currentIndex = flow.indexOf(order.order_status);

  if (cancelled) {
    return (
      <div className="card border-danger/40 p-6 text-center">
        <span className="text-4xl">❌</span>
        <p className="mt-2 font-display text-xl font-extrabold text-danger">অর্ডার বাতিল করা হয়েছে</p>
        <p className="mt-1 text-sm text-muted">
          বিস্তারিত জানতে আমাদের WhatsApp এ মেসেজ দিন।
        </p>
      </div>
    );
  }

  return (
    <div className="card p-6">
      <div className="mb-5 flex items-center justify-between">
        <h2 className="text-lg font-extrabold">অর্ডার ট্র্যাকিং</h2>
        <span className={`badge ${ORDER_STATUS_META[order.order_status].color}`}>
          {ORDER_STATUS_META[order.order_status].label} · {ORDER_STATUS_META[order.order_status].bn}
        </span>
      </div>

      <ol className="relative space-y-0">
        {flow.map((status, i) => {
          const done = i < currentIndex;
          const current = i === currentIndex;
          const meta = ORDER_STATUS_META[status];

          return (
            <li key={status} className="relative flex gap-4 pb-6 last:pb-0">
              {/* connector */}
              {i < flow.length - 1 && (
                <span
                  className="absolute left-[15px] top-8 h-[calc(100%-1.5rem)] w-0.5"
                  style={{ background: done ? "hsl(var(--success))" : "hsl(var(--border))" }}
                />
              )}

              <motion.span
                initial={{ scale: 0.5, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ delay: i * 0.07, type: "spring", stiffness: 300, damping: 18 }}
                className="relative z-10 grid h-8 w-8 shrink-0 place-items-center rounded-full border-2"
                style={{
                  background: done
                    ? "hsl(var(--success))"
                    : current
                      ? "hsl(var(--brand))"
                      : "hsl(var(--bg-elevated))",
                  borderColor: done
                    ? "hsl(var(--success))"
                    : current
                      ? "hsl(var(--brand))"
                      : "hsl(var(--border))",
                  color: done || current ? "hsl(var(--brand-fg))" : "hsl(var(--muted))",
                }}
              >
                {done ? <Check className="h-4 w-4" /> : current ? <GlowDot /> : <span className="h-2 w-2 rounded-full bg-current" />}
              </motion.span>

              <div className="pt-1">
                <p
                  className={`text-sm font-bold ${
                    current ? "text-brand-strong" : done ? "text-fg" : "text-muted"
                  }`}
                >
                  {meta.label} <span className="font-medium text-muted">· {meta.bn}</span>
                </p>
                {current && (
                  <motion.p
                    initial={{ opacity: 0, y: 4 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="mt-0.5 text-xs text-muted"
                  >
                    {status === "pending"
                      ? "অর্ডার পেয়েছি — শীঘ্রই confirm করবো"
                      : status === "confirmed"
                        ? "অর্ডার নিশ্চিত — তৈরি শুরু হবে খুব শীঘ্রই"
                        : status === "baking"
                          ? "আপনার কেক তৈরি হচ্ছে 🍰"
                          : status === "out_for_delivery"
                            ? "কেক ডেলিভারির পথে 🚗"
                            : status === "delivered"
                              ? "কেক পৌঁছে গেছে — রিভিউ দিন! 🌟"
                              : "অর্ডার সম্পন্ন"}
                  </motion.p>
                )}
                {i < currentIndex && (
                  <p className="text-[11px] text-muted">✓ সম্পন্ন</p>
                )}
              </div>
            </li>
          );
        })}
      </ol>
    </div>
  );
}

function GlowDot() {
  return (
    <span className="relative grid h-full w-full place-items-center">
      <span className="absolute h-2.5 w-2.5 animate-ping rounded-full bg-white/70" />
      <span className="relative h-2 w-2 rounded-full bg-white" />
    </span>
  );
}
