"use client";

import Link from "next/link";
import { useActionState, useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Check, Loader2, MapPin, MessageCircle, Phone, Radio, Search, Star } from "lucide-react";
import type { Order, OrderStatusHistory } from "@/lib/types";
import { ORDER_STATUS_FLOW, ORDER_STATUS_META, PAYMENT_METHOD_LABEL } from "@/lib/constants";
import { formatBDT, formatDateTime, waLink } from "@/lib/utils";
import { trackOrderAction, type TrackResult } from "@/lib/actions/order";
import { useOrderLive } from "@/components/track/use-order-live";
import { CustomDesignSummary, hasCustomDesign } from "@/components/order/custom-design-summary";

const initialState: TrackResult = {};

/** Build-time flag: Realtime needs the public anon key. */
const REALTIME_ENABLED = Boolean(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);

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
  const [history, setHistory] = useState<OrderStatusHistory[]>([]);
  const [lookupPhone, setLookupPhone] = useState("");
  const [state, formAction, pending] = useActionState(
    async (prev: TrackResult, fd: FormData) => {
      const result = await trackOrderAction(prev, fd);
      // Keep the last successful order visible when a later lookup fails.
      if (result.order) {
        setOrder(result.order);
        setHistory(result.history ?? []);
        setLookupPhone(String(fd.get("phone") ?? ""));
      }
      return result;
    },
    initialState,
  );

  const live = useOrderLive(
    order ? { orderId: order.id, orderNo: order.order_no, phone: lookupPhone } : null,
  );

  /**
   * Merge the websocket update during render instead of copying it into state:
   * no effect, no cascading renders, and the server history stays untouched.
   */
  const viewOrder: Order | undefined = useMemo(() => {
    if (!order) return undefined;
    if (!live) return order;
    return {
      ...order,
      order_status: live.order_status,
      payment_status: live.payment_status,
      updated_at: live.updated_at,
    };
  }, [order, live]);

  const viewHistory: OrderStatusHistory[] = useMemo(() => {
    if (!order) return [];
    if (!live || history.some((h) => h.status === live.order_status)) return history;
    return [
      ...history,
      {
        id: `live_${live.updated_at}`,
        order_id: order.id,
        status: live.order_status,
        note: null,
        created_at: live.updated_at,
      },
    ];
  }, [history, live, order]);

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
        {viewOrder && (
          <motion.div
            key={viewOrder.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
            className="mt-6 space-y-5"
          >
            <OrderTimeline order={viewOrder} history={viewHistory} liveSource={live?.source} />

            <div className="card p-5">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <p className="text-xs font-semibold text-muted">অর্ডার</p>
                  <p className="font-display text-xl font-extrabold">{viewOrder.order_no}</p>
                  <p className="mt-1 text-xs text-muted">
                    অর্ডারের সময়: {formatDateTime(viewOrder.created_at)}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-xs font-semibold text-muted">মোট</p>
                  <p className="font-display text-2xl font-extrabold text-brand-strong">
                    {formatBDT(viewOrder.total)}
                  </p>
                  <p className="text-[11px] text-muted">
                    {PAYMENT_METHOD_LABEL[viewOrder.payment_method] ?? viewOrder.payment_method} ·{" "}
                    {viewOrder.payment_status === "paid"
                      ? "Paid ✅"
                      : viewOrder.payment_status === "pending_verify"
                        ? "ভেরিফাই হচ্ছে"
                        : "বাকি"}
                  </p>
                </div>
              </div>

              <div className="mt-4 grid gap-3 border-t border-line pt-4 text-sm sm:grid-cols-2">
                <div>
                  <p className="text-xs font-semibold text-muted">আইটেম</p>
                  <ul className="mt-1 space-y-1">
                    {viewOrder.items.map((it, i) => (
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
                    {viewOrder.address}
                  </p>
                  <p className="mt-1 text-xs text-muted">{viewOrder.delivery_date}</p>
                </div>
              </div>
            </div>

            <CustomDesignPreview order={viewOrder} />

            <div className="grid gap-3 sm:grid-cols-2">
              <a
                href={waLink(
                  whatsappPhone,
                  `হ্যালো ${storeName}! আমার অর্ডার ${viewOrder.order_no} নিয়ে জানতে চাই।`,
                )}
                target="_blank"
                rel="noopener noreferrer"
                className="btn btn-soft btn-block"
              >
                <MessageCircle className="h-4 w-4" /> WhatsApp এ কথা বলুন
              </a>

              {["delivered", "completed"].includes(viewOrder.order_status) ? (
                <Link href={`/review/${viewOrder.id}`} className="btn btn-primary btn-block">
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

function OrderTimeline({
  order,
  history,
  liveSource,
}: {
  order: Order;
  history: OrderStatusHistory[];
  liveSource?: "realtime" | "poll";
}) {
  const cancelled = order.order_status === "cancelled";
  const flow = ORDER_STATUS_FLOW;
  const currentIndex = flow.indexOf(order.order_status);

  /** First time each status was entered. */
  const stamps = new Map<string, string>();
  for (const h of history) if (!stamps.has(h.status)) stamps.set(h.status, h.created_at);

  if (cancelled) {
    return (
      <div className="card border-danger/40 p-6 text-center">
        <span className="text-4xl">❌</span>
        <p className="mt-2 font-display text-xl font-extrabold text-danger">অর্ডার বাতিল করা হয়েছে</p>
        {stamps.get("cancelled") && (
          <p className="mt-1 text-xs text-muted">{formatDateTime(stamps.get("cancelled")!)}</p>
        )}
        <p className="mt-2 text-sm text-muted">বিস্তারিত জানতে আমাদের WhatsApp এ মেসেজ দিন।</p>
      </div>
    );
  }

  return (
    <div className="card p-6">
      <div className="mb-5 flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-lg font-extrabold">অর্ডার ট্র্যাকিং</h2>
        <div className="flex flex-wrap items-center gap-2">
          <LiveBadge source={liveSource} />
          <span className={`badge ${ORDER_STATUS_META[order.order_status].color}`}>
            {ORDER_STATUS_META[order.order_status].label} ·{" "}
            {ORDER_STATUS_META[order.order_status].bn}
          </span>
        </div>
      </div>

      <ol className="relative space-y-0">
        {flow.map((status, i) => {
          const done = i < currentIndex;
          const current = i === currentIndex;
          const meta = ORDER_STATUS_META[status];
          const stamp = stamps.get(status);

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
                {done ? (
                  <Check className="h-4 w-4" />
                ) : current ? (
                  <GlowDot />
                ) : (
                  <span className="h-2 w-2 rounded-full bg-current" />
                )}
              </motion.span>

              <div className="pt-1">
                <p
                  className={`text-sm font-bold ${
                    current ? "text-brand-strong" : done ? "text-fg" : "text-muted"
                  }`}
                >
                  {meta.label} <span className="font-medium text-muted">· {meta.bn}</span>
                </p>

                {stamp && (
                  <p className="mt-0.5 text-[11px] font-medium text-muted">
                    {formatDateTime(stamp)}
                  </p>
                )}

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
                {i < currentIndex && !stamp && (
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

function LiveBadge({ source }: { source?: "realtime" | "poll" }) {
  if (!REALTIME_ENABLED && !source) {
    return (
      <span className="badge bg-fg/5 text-muted" title="Supabase anon key নেই">
        ⏱ অটো রিফ্রেশ
      </span>
    );
  }

  return (
    <span
      className="badge bg-success/15 text-success"
      title={source === "realtime" ? "Supabase Realtime" : "প্রতি ১৫ সেকেন্ডে চেক"}
    >
      <Radio className="mr-1 h-3 w-3" aria-hidden />
      {source === "realtime" ? "লাইভ" : "অটো রিফ্রেশ"}
    </span>
  );
}

/* ---------------------- custom design preview ---------------------- */

function CustomDesignPreview({ order }: { order: Order }) {
  const spec = order.custom_spec;
  if (!spec) return null;

  const hasContent = Boolean(
    spec.design_notes ||
      spec.message_on_cake ||
      spec.reference_image ||
      spec.budget ||
      hasCustomDesign(spec),
  );
  if (!hasContent) return null;

  return (
    <section className="card p-5">
      <h2 className="mb-3 text-base font-extrabold">🎨 আপনার কাস্টম ডিজাইন</h2>

      <div className="grid gap-4 sm:grid-cols-[auto_1fr]">
        {spec.reference_image && (
          // Arbitrary customer-supplied host, so it stays a plain <img>:
          // next/image would reject hosts missing from remotePatterns.
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={spec.reference_image}
            alt="Reference design"
            loading="lazy"
            className="h-28 w-28 rounded-xl border border-line object-cover sm:h-32 sm:w-32"
          />
        )}

        <dl className="space-y-2 text-sm">
          {spec.message_on_cake && (
            <div>
              <dt className="text-xs font-semibold text-muted">কেকের লেখা</dt>
              <dd className="mt-0.5 rounded-lg border border-dashed border-brand/40 bg-brand/6 px-3 py-1.5 font-semibold text-brand-strong">
                ✍️ {spec.message_on_cake}
              </dd>
            </div>
          )}
          {spec.design_notes && (
            <div>
              <dt className="text-xs font-semibold text-muted">ডিজাইন নোট</dt>
              <dd className="mt-0.5 whitespace-pre-line text-muted">{spec.design_notes}</dd>
            </div>
          )}
          {spec.budget ? (
            <div>
              <dt className="text-xs font-semibold text-muted">বাজেট</dt>
              <dd className="mt-0.5 font-semibold">{formatBDT(spec.budget)}</dd>
            </div>
          ) : null}
        </dl>
      </div>

      <CustomDesignSummary spec={spec} />
    </section>
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
