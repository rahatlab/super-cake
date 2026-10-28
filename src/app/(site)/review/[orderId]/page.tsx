import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Lock, PartyPopper } from "lucide-react";
import { getStore } from "@/lib/store";
import { getCurrentUser, verifyReviewAccessToken } from "@/lib/auth";
import { formatBDT } from "@/lib/utils";
import { breadcrumbLd, ldJson } from "@/lib/seo";
import { ReviewForm } from "@/components/review-form";
import { Stars } from "@/components/star-rating";

export const metadata: Metadata = {
  title: "রিভিউ দিন",
  robots: { index: false },
};

export default async function ReviewPage({
  params,
  searchParams,
}: {
  params: Promise<{ orderId: string }>;
  searchParams: Promise<{ token?: string }>;
}) {
  const { orderId } = await params;
  const { token } = await searchParams;
  const store = getStore();

  const order = await store.getOrderById(orderId);
  if (!order) notFound();

  const tokenOrderId = verifyReviewAccessToken(token);
  const user = await getCurrentUser();
  const verified = tokenOrderId === order.id || Boolean(user && order.user_id === user.id);
  if (!verified) notFound();

  const existing = await store.getReviewByOrder(order.id);
  const delivered = ["delivered", "completed"].includes(order.order_status);

  return (
    <div className="container-page py-12">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: ldJson(
            breadcrumbLd([
              { name: "হোম", item: "/" },
              { name: "রিভিউ", item: `/review/${order.id}` },
            ]),
          ),
        }}
      />

      <div className="mx-auto max-w-xl">
        <div className="mb-6 text-center">
          <span className="badge bg-brand/12 text-brand-strong">🌟 Customer Review</span>
          <h1 className="mt-4 text-3xl font-extrabold sm:text-4xl">
            কেমন লাগলো <span className="text-gradient">আপনার কেক</span>?
          </h1>
          <p className="mt-3 text-sm text-muted">
            আপনার অভিজ্ঞতা শেয়ার করুন — ভবিষ্যতের customer রা সিদ্ধান্ত নিতে সাহায্য পাবে।
          </p>
        </div>

        {/* order summary */}
        <div className="card mb-6 flex items-center gap-4 p-4">
          <div className="min-w-0 flex-1">
            <p className="text-xs font-semibold text-muted">অর্ডার</p>
            <p className="truncate font-bold">{order.order_no}</p>
            <p className="truncate text-xs text-muted">{order.items[0]?.name}</p>
          </div>
          <div className="text-right">
            <p className="text-xs font-semibold text-muted">মোট</p>
            <p className="font-display text-lg font-extrabold text-brand-strong">{formatBDT(order.total)}</p>
          </div>
        </div>

        {/* states */}
        {existing ? (
          <div className="card p-8 text-center">
            <PartyPopper className="mx-auto h-10 w-10 text-brand" />
            <h2 className="mt-3 text-xl font-extrabold">ধন্যবাদ! আপনার রিভিউ জমা হয়েছে ✅</h2>
            <div className="mt-4 flex justify-center">
              <Stars value={existing.rating} size={22} />
            </div>
            <p className="mt-3 text-sm text-muted">“{existing.comment}”</p>
            <p className="mt-2 text-xs text-muted">
              {existing.is_approved
                ? "রিভিউটি ওয়েবসাইটে প্রকাশিত হয়েছে।"
                : "Admin approval-এর পর রিভিউটি ওয়েবসাইটে প্রকাশিত হবে।"}
            </p>
            <div className="mt-6 flex flex-wrap justify-center gap-2">
              <Link href="/cakes" className="btn btn-primary btn-sm">
                আরও কেক দেখুন
              </Link>
              <Link href={`/track?no=${order.order_no}`} className="btn btn-ghost btn-sm">
                অর্ডার ট্র্যাক
              </Link>
            </div>
          </div>
        ) : !delivered ? (
          <div className="card p-8 text-center">
            <Lock className="mx-auto h-9 w-9 text-muted" />
            <h2 className="mt-3 text-xl font-extrabold">রিভিউ এখনো খোলেনি</h2>
            <p className="mx-auto mt-2 max-w-sm text-sm text-muted">
              ডেলিভারি সম্পন্ন হওয়ার পরে এই পেজে রিভিউ দিতে পারবেন। আপনার বর্তমান স্ট্যাটাস:
              <strong className="ml-1 text-fg">{order.order_status.replace(/_/g, " ")}</strong>
            </p>
            <Link href={`/track?no=${order.order_no}`} className="btn btn-soft btn-sm mt-5">
              স্ট্যাটাস দেখুন
            </Link>
          </div>
        ) : (
          <ReviewForm
            orderId={order.id}
            customerName={order.customer_name}
            cakeSlug={order.items[0]?.slug ?? null}
            accessToken={token ?? ""}
          />
        )}
      </div>
    </div>
  );
}
