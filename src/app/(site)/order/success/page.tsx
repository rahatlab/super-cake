import type { Metadata } from "next";
import Link from "next/link";
import { CheckCircle2, Home, MessageCircle, PackageCheck, Search } from "lucide-react";
import { getStore } from "@/lib/store";
import { notFound } from "next/navigation";
import { formatBDT, waLink } from "@/lib/utils";
import { ORDER_STATUS_META } from "@/lib/constants";
import { getCurrentUser, verifyOrderAccessToken, createReviewAccessToken } from "@/lib/auth";
import { SuccessAnimation } from "@/components/order/success-animation";
import { ClearCartOnMount } from "@/components/order/clear-cart";

export const metadata: Metadata = {
  title: "অর্ডার সফল হয়েছে",
  robots: { index: false },
};

export default async function OrderSuccessPage({
  searchParams,
}: {
  searchParams: Promise<{ no?: string; token?: string }>;
}) {
  const { no, token } = await searchParams;
  if (!no) notFound();

  const store = getStore();
  const order = await store.getOrderByNo(no);
  if (!order) notFound();

  const tokenOrderId = verifyOrderAccessToken(token);
  const user = await getCurrentUser();
  const ownsBySession = Boolean(user && order.user_id === user.id);
  const verified = tokenOrderId === order.id || ownsBySession;

  // Never expose customer PII just because someone guessed/knows an order number.
  if (!verified) {
    return (
      <div className="container-page py-16">
        <div className="card mx-auto max-w-lg p-8 text-center">
          <CheckCircle2 className="mx-auto h-10 w-10 text-success" />
          <h1 className="mt-4 text-2xl font-extrabold">অর্ডার গ্রহণ করা হয়েছে</h1>
          <p className="mt-2 text-sm text-muted">
            অর্ডার নম্বর <strong className="font-mono text-fg">{order.order_no}</strong>। বিস্তারিত
            দেখতে অনুগ্রহ করে আপনার অর্ডার নম্বর ও ফোন নম্বর দিয়ে ট্র্যাক করুন।
          </p>
          <div className="mt-5 flex flex-wrap justify-center gap-2">
            <Link href={`/track?no=${encodeURIComponent(order.order_no)}`} className="btn btn-primary">
              <Search className="h-4 w-4" /> ট্র্যাক করুন
            </Link>
            <Link href="/" className="btn btn-ghost">
              <Home className="h-4 w-4" /> হোম
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const settings = await store.getSettings();
  const wa = waLink(
    settings.whatsapp_phone,
    `হ্যালো ${settings.store_name}! আমার অর্ডার ${order.order_no} নিয়ে কথা বলতে চাই।`,
  );
  const meta = ORDER_STATUS_META[order.order_status];
  const canReview = ["delivered", "completed"].includes(order.order_status);
  const reviewToken = createReviewAccessToken(order.id);

  return (
    <div className="container-page py-12">
      <ClearCartOnMount />
      <SuccessAnimation />

      <div className="mx-auto mt-7 max-w-xl text-center">
        <span className="badge bg-success/15 text-success">✓ {meta.bn}</span>
        <h1 className="mt-4 text-3xl font-extrabold sm:text-4xl">অর্ডার সফল হয়েছে! 🎉</h1>
        <p className="mt-3 text-sm leading-relaxed text-muted">
          ধন্যবাদ <strong className="text-fg">{order.customer_name}</strong> — আপনার অর্ডার আমরা পেয়েছি।
          {order.payment_method === "bkash" && order.payment_status === "pending_verify"
            ? " TrxID যাচাই করে WhatsApp এ জানানো হবে।"
            : " কনফার্মেশন WhatsApp এ পাঠানো হবে।"}
        </p>
      </div>

      <div className="mx-auto mt-8 max-w-2xl space-y-4">
        {/* order card */}
        <div className="card overflow-hidden">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line bg-brand/6 px-5 py-4">
            <div>
              <p className="text-xs font-semibold text-muted">অর্ডার আইডি</p>
              <p className="font-display text-xl font-extrabold">{order.order_no}</p>
            </div>
            <span className={`badge ${meta.color}`}>
              {meta.label} · {meta.bn}
            </span>
          </div>

          <div className="space-y-3 px-5 py-4 text-sm">
            {order.items.map((it, i) => (
              <div key={i} className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="truncate font-semibold">{it.name}</p>
                  <p className="text-xs text-muted">
                    {it.weight ? `${it.weight} lb` : "১ lb"} × {it.quantity}
                  </p>
                </div>
                <span className="shrink-0 font-bold">{formatBDT(it.unit_price * it.quantity)}</span>
              </div>
            ))}
          </div>

          <div className="space-y-2 border-t border-line px-5 py-4 text-sm">
            <div className="flex justify-between">
              <span className="text-muted">Subtotal</span>
              <span className="font-semibold">{formatBDT(order.subtotal)}</span>
            </div>
            {order.discount_amount > 0 && (
              <div className="flex justify-between">
                <span className="text-muted">Promo {order.promo_code}</span>
                <span className="font-semibold text-success">− {formatBDT(order.discount_amount)}</span>
              </div>
            )}
            {order.referral_discount > 0 && (
              <div className="flex justify-between">
                <span className="text-muted">Referral</span>
                <span className="font-semibold text-success">− {formatBDT(order.referral_discount)}</span>
              </div>
            )}
            <div className="flex justify-between">
              <span className="text-muted">Delivery</span>
              <span className="font-semibold">
                {order.delivery_charge === 0 ? "ফ্রি 🎉" : formatBDT(order.delivery_charge)}
              </span>
            </div>
            <div className="flex items-center justify-between border-t border-line pt-3">
              <span className="font-extrabold">মোট</span>
              <span className="font-display text-2xl font-extrabold text-brand-strong">
                {formatBDT(order.total)}
              </span>
            </div>
            <p className="pt-1 text-xs text-muted">
              পেমেন্ট:{" "}
              <strong>{order.payment_method === "cod" ? "Cash on Delivery" : "bKash"}</strong>
              {order.payment_method === "bkash" && order.payment_status === "pending_verify" && (
                <span className="text-warning"> · TrxID ভেরিফাই হচ্ছে</span>
              )}
            </p>
          </div>
        </div>

        {/* delivery info */}
        <div className="card flex flex-wrap items-center justify-between gap-3 px-5 py-4 text-sm">
          <div>
            <p className="text-xs font-semibold text-muted">ডেলিভারি</p>
            <p className="font-semibold">{order.delivery_date}</p>
            <p className="text-xs text-muted">{order.address}</p>
          </div>
          <PackageCheck className="h-8 w-8 text-brand" />
        </div>

        {/* actions */}
        <div className="grid gap-3 sm:grid-cols-3">
          <Link href={`/track?no=${encodeURIComponent(order.order_no)}`} className="btn btn-primary">
            <Search className="h-4 w-4" /> ট্র্যাক করুন
          </Link>
          <a href={wa} target="_blank" rel="noopener noreferrer" className="btn btn-soft">
            <MessageCircle className="h-4 w-4" /> WhatsApp
          </a>
          <Link href="/" className="btn btn-ghost">
            <Home className="h-4 w-4" /> হোম
          </Link>
        </div>

        {canReview && (
          <div className="rounded-2xl border border-dashed border-brand/40 bg-brand/6 p-5 text-center">
            <CheckCircle2 className="mx-auto h-6 w-6 text-brand" />
            <p className="mt-2 text-sm font-bold">আপনার অভিজ্ঞতা শেয়ার করুন</p>
            <p className="mt-1 text-xs text-muted">
              রিভিউ admin approval-এর পর ওয়েবসাইটে প্রকাশিত হবে।
            </p>
            <Link
              href={`/review/${order.id}?token=${encodeURIComponent(reviewToken)}`}
              className="btn btn-soft mt-3"
            >
              রিভিউ দিন
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
