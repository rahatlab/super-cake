import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import { notFound } from "next/navigation";
import {
  ArrowLeft,
  CalendarDays,
  MapPin,
  MessageCircle,
  Phone,
  User,
} from "lucide-react";
import { getStore } from "@/lib/store";
import { OCCASIONS, ORDER_STATUS_META } from "@/lib/constants";
import { formatBDT, formatDateTime, waLink, weightLabel } from "@/lib/utils";
import { StatusControls } from "@/components/admin/status-controls";
import { PaymentActions } from "@/components/admin/payment-actions";

export const metadata: Metadata = { title: "Order Details" };

export default async function AdminOrderDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const store = getStore();
  const order = await store.getOrderById(id);
  if (!order) notFound();

  const settings = await store.getSettings();
  const meta = ORDER_STATUS_META[order.order_status];
  const occasion = OCCASIONS.find((o) => o.value === order.occasion);

  const wa = waLink(
    order.phone,
    `হ্যালো ${order.customer_name}! ${settings.store_name} থেকে বলছি — আপনার অর্ডার ${order.order_no} নিয়ে…`,
  );

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <Link
            href="/admin/orders"
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-muted hover:text-fg"
          >
            <ArrowLeft className="h-3.5 w-3.5" aria-hidden /> অর্ডার লিস্ট
          </Link>
          <h1 className="mt-2 font-display text-2xl font-extrabold">{order.order_no}</h1>
          <p className="mt-1 text-xs text-muted">তৈরি হয়েছে {formatDateTime(order.created_at)}</p>
        </div>
        <span className={`badge text-sm ${meta.color}`}>
          {meta.label} · {meta.bn}
        </span>
      </div>

      <div className="grid gap-5 lg:grid-cols-[1.6fr_1fr]">
        {/* ---------------- left column ---------------- */}
        <div className="space-y-5">
          {/* customer */}
          <section className="card p-5">
            <h2 className="mb-4 text-base font-extrabold">কাস্টমার তথ্য</h2>
            <dl className="grid gap-4 sm:grid-cols-2">
              <div>
                <dt className="text-xs font-bold uppercase tracking-wide text-muted">নাম</dt>
                <dd className="mt-1 flex items-center gap-2 text-sm font-semibold">
                  <User className="h-3.5 w-3.5 text-brand" aria-hidden /> {order.customer_name}
                </dd>
              </div>
              <div>
                <dt className="text-xs font-bold uppercase tracking-wide text-muted">ফোন</dt>
                <dd className="mt-1 flex items-center gap-2 text-sm font-semibold">
                  <Phone className="h-3.5 w-3.5 text-brand" aria-hidden />
                  <a href={`tel:${order.phone}`} className="hover:underline">
                    {order.phone}
                  </a>
                </dd>
              </div>
              {order.email && (
                <div>
                  <dt className="text-xs font-bold uppercase tracking-wide text-muted">ইমেইল</dt>
                  <dd className="mt-1 text-sm">{order.email}</dd>
                </div>
              )}
              <div>
                <dt className="text-xs font-bold uppercase tracking-wide text-muted">Occasion</dt>
                <dd className="mt-1 text-sm font-semibold">
                  {occasion ? `${occasion.emoji} ${occasion.label} · ${occasion.bn}` : order.occasion}
                </dd>
              </div>
              <div className="sm:col-span-2">
                <dt className="text-xs font-bold uppercase tracking-wide text-muted">ঠিকানা</dt>
                <dd className="mt-1 flex items-start gap-2 text-sm">
                  <MapPin className="mt-0.5 h-3.5 w-3.5 shrink-0 text-brand" aria-hidden />
                  {order.address}
                </dd>
              </div>
              <div>
                <dt className="text-xs font-bold uppercase tracking-wide text-muted">ডেলিভারি তারিখ</dt>
                <dd className="mt-1 flex items-center gap-2 text-sm font-semibold">
                  <CalendarDays className="h-3.5 w-3.5 text-brand" aria-hidden />
                  {order.delivery_date}
                  {order.delivery_slot ? ` · ${order.delivery_slot}` : ""}
                </dd>
              </div>
              {order.note && (
                <div className="sm:col-span-2">
                  <dt className="text-xs font-bold uppercase tracking-wide text-muted">বিশেষ নির্দেশনা</dt>
                  <dd className="mt-1 rounded-xl bg-warning/10 px-3 py-2 text-sm">{order.note}</dd>
                </div>
              )}
            </dl>

            <div className="mt-4 flex flex-wrap gap-2 border-t border-line pt-4">
              <a href={wa} target="_blank" rel="noopener noreferrer" className="btn btn-soft btn-sm">
                <MessageCircle className="h-3.5 w-3.5" aria-hidden /> WhatsApp
              </a>
              <a href={`tel:${order.phone}`} className="btn btn-ghost btn-sm">
                <Phone className="h-3.5 w-3.5" aria-hidden /> কল করুন
              </a>
            </div>
          </section>

          {/* items */}
          <section className="card overflow-hidden">
            <h2 className="border-b border-line px-5 py-4 text-base font-extrabold">আইটেম</h2>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[620px] text-left text-sm">
                <thead>
                  <tr className="border-b border-line text-xs uppercase tracking-wide text-muted">
                    <th scope="col" className="px-5 py-2.5 font-bold">
                      কেক
                    </th>
                    <th scope="col" className="px-3 py-2.5 font-bold">
                      ওজন
                    </th>
                    <th scope="col" className="px-3 py-2.5 font-bold">
                      একক দাম
                    </th>
                    <th scope="col" className="px-3 py-2.5 font-bold">
                      Qty
                    </th>
                    <th scope="col" className="px-5 py-2.5 text-right font-bold">
                      মোট
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-line">
                  {order.items.map((it, i) => (
                    <tr key={`${it.cake_id}-${i}`}>
                      <td className="px-5 py-3">
                        <div className="flex items-center gap-3">
                          {it.image && (
                            <span className="relative h-10 w-10 shrink-0 overflow-hidden rounded-lg bg-brand/10">
                              <Image
                                src={it.image}
                                alt={it.name}
                                fill
                                sizes="40px"
                                className="object-cover"
                                unoptimized
                              />
                            </span>
                          )}
                          <Link
                            href={`/cakes/${it.slug}`}
                            target="_blank"
                            className="font-semibold hover:text-brand-strong hover:underline"
                          >
                            {it.name}
                          </Link>
                        </div>
                      </td>
                      <td className="px-3 py-3 text-muted">
                        {it.weight ? weightLabel(it.weight) : "—"}
                      </td>
                      <td className="px-3 py-3">{formatBDT(it.unit_price)}</td>
                      <td className="px-3 py-3">{it.quantity}</td>
                      <td className="px-5 py-3 text-right font-bold">
                        {formatBDT(it.unit_price * it.quantity)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {order.custom_spec && (
              <div className="border-t border-line bg-brand/[0.04] px-5 py-4 text-sm">
                <p className="text-xs font-bold uppercase tracking-wide text-muted">Custom specification</p>
                {order.custom_spec.message_on_cake && (
                  <p className="mt-2">
                    ✍️ <strong>কেকের লেখা:</strong> {order.custom_spec.message_on_cake}
                  </p>
                )}
                {order.custom_spec.design_notes && (
                  <p className="mt-1">
                    🎨 <strong>ডিজাইন:</strong> {order.custom_spec.design_notes}
                  </p>
                )}
                {order.custom_spec.servings != null && (
                  <p className="mt-1">
                    👥 <strong>Servings:</strong> {order.custom_spec.servings}
                  </p>
                )}
                {order.custom_spec.budget != null && (
                  <p className="mt-1">
                    💰 <strong>বাজেট:</strong> {formatBDT(order.custom_spec.budget)}
                  </p>
                )}
                {order.custom_spec.reference_image && (
                  <p className="mt-1 break-all">
                    🖼️ <strong>Reference:</strong>{" "}
                    <a
                      href={order.custom_spec.reference_image}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-brand-strong underline"
                    >
                      {order.custom_spec.reference_image}
                    </a>
                  </p>
                )}
              </div>
            )}

            {/* totals */}
            <div className="space-y-2 border-t border-line px-5 py-4 text-sm">
              <Row label="Subtotal" value={formatBDT(order.subtotal)} />
              {order.discount_amount > 0 && (
                <Row
                  label={`Promo ${order.promo_code ?? ""}`}
                  value={`− ${formatBDT(order.discount_amount)}`}
                  accent
                />
              )}
              {order.referral_discount > 0 && (
                <Row
                  label={`Referral ${order.referral_code ?? ""}`}
                  value={`− ${formatBDT(order.referral_discount)}`}
                  accent
                />
              )}
              <Row
                label="ডেলিভারি চার্জ"
                value={order.delivery_charge === 0 ? "ফ্রি 🎉" : formatBDT(order.delivery_charge)}
                accent={order.delivery_charge === 0}
              />
              <div className="flex items-center justify-between border-t border-line pt-3">
                <span className="font-extrabold">সর্বমোট</span>
                <span className="font-display text-xl font-extrabold text-brand-strong">
                  {formatBDT(order.total)}
                </span>
              </div>
            </div>
          </section>

          <StatusControls orderId={order.id} current={order.order_status} />
        </div>

        {/* ---------------- right column ---------------- */}
        <div className="space-y-5">
          <section className="card p-5">
            <h2 className="text-base font-extrabold">পেমেন্ট</h2>
            <dl className="mt-3 space-y-2 text-sm">
              <div className="flex items-center justify-between gap-3">
                <dt className="text-muted">মেথড</dt>
                <dd className="font-semibold">
                  {order.payment_method === "cod" ? "Cash on Delivery" : "bKash"}
                </dd>
              </div>
              <div className="flex items-center justify-between gap-3">
                <dt className="text-muted">স্ট্যাটাস</dt>
                <dd>
                  <span
                    className={`badge ${
                      order.payment_status === "paid"
                        ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400"
                        : order.payment_status === "pending_verify"
                          ? "bg-amber-500/15 text-amber-600 dark:text-amber-400"
                          : order.payment_status === "refunded"
                            ? "bg-rose-500/15 text-rose-600 dark:text-rose-400"
                            : "bg-line/60 text-muted"
                    }`}
                  >
                    {order.payment_status.replace("_", " ")}
                  </span>
                </dd>
              </div>
              {order.bkash_trx_id && (
                <div className="flex items-center justify-between gap-3">
                  <dt className="text-muted">bKash TrxID</dt>
                  <dd className="font-mono text-xs font-bold">{order.bkash_trx_id}</dd>
                </div>
              )}
              <div className="flex items-center justify-between gap-3">
                <dt className="text-muted">পরিমাণ</dt>
                <dd className="font-extrabold">{formatBDT(order.total)}</dd>
              </div>
            </dl>

            {order.payment_method === "bkash" && order.payment_status === "pending_verify" && (
              <div className="mt-4 border-t border-line pt-4">
                <p className="mb-2.5 text-xs text-muted">
                  TrxID মিলিয়ে দেখে Approve করুন — তখন অর্ডার অটো কনফার্ম হবে।
                </p>
                <PaymentActions orderId={order.id} />
              </div>
            )}

            {order.payment_status === "paid" && order.order_status === "pending" && (
              <p className="mt-3 rounded-xl bg-success/10 px-3 py-2 text-xs font-semibold text-success">
                পেমেন্ট ভেরিফাইড — অর্ডার অটো কনফার্ম হয়েছে ✅
              </p>
            )}

            {order.payment_method === "cod" && (
              <p className="mt-3 rounded-xl bg-accent/10 px-3 py-2 text-xs text-muted">
                Cash on Delivery — ডেলিভারির সময় টাকা সংগ্রহ করুন।
              </p>
            )}
          </section>

          <section className="card p-5">
            <h2 className="text-base font-extrabold">অর্ডার তথ্য</h2>
            <dl className="mt-3 space-y-2 text-xs">
              <div className="flex items-center justify-between gap-3">
                <dt className="text-muted">Order ID</dt>
                <dd className="font-mono">{order.id}</dd>
              </div>
              <div className="flex items-center justify-between gap-3">
                <dt className="text-muted">তৈরি</dt>
                <dd>{formatDateTime(order.created_at)}</dd>
              </div>
              <div className="flex items-center justify-between gap-3">
                <dt className="text-muted">আপডেট</dt>
                <dd>{formatDateTime(order.updated_at)}</dd>
              </div>
              {order.user_id && (
                <div className="flex items-center justify-between gap-3">
                  <dt className="text-muted">User ID</dt>
                  <dd className="font-mono">{order.user_id}</dd>
                </div>
              )}
            </dl>
          </section>
        </div>
      </div>
    </div>
  );
}

function Row({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span className="text-muted">{label}</span>
      <span className={accent ? "font-semibold text-success" : "font-semibold"}>{value}</span>
    </div>
  );
}
