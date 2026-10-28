import type { Metadata } from "next";
import Link from "next/link";
import { CheckCircle2, Clock3, Wallet } from "lucide-react";
import { getStore } from "@/lib/store";
import { cn, formatBDT, formatDateTime, waLink } from "@/lib/utils";
import type { PaymentStatus } from "@/lib/types";
import { PaymentActions } from "@/components/admin/payment-actions";

export const metadata: Metadata = { title: "Payments" };

const STATUS_STYLE: Record<PaymentStatus, string> = {
  unpaid: "bg-line/60 text-muted",
  pending_verify: "bg-amber-500/15 text-amber-600 dark:text-amber-400",
  paid: "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400",
  refunded: "bg-rose-500/15 text-rose-600 dark:text-rose-400",
};

const STATUS_LABEL: Record<PaymentStatus, string> = {
  unpaid: "অপরিশোধিত",
  pending_verify: "যাচাই বাকি",
  paid: "পরিশোধিত",
  refunded: "ফেরত",
};

export default async function AdminPaymentsPage() {
  const orders = await getStore().listOrders();
  const bkashOrders = orders
    .filter((o) => o.payment_method === "bkash")
    .sort((a, b) => +new Date(b.created_at) - +new Date(a.created_at));

  const pending = bkashOrders.filter((o) => o.payment_status === "pending_verify");
  const paid = bkashOrders.filter((o) => o.payment_status === "paid");

  const cards = [
    {
      label: "bKash অর্ডার",
      value: String(bkashOrders.length),
      sub: "ম্যানুয়াল পেমেন্ট",
      icon: Wallet,
      tone: "bg-brand/12 text-brand-strong",
    },
    {
      label: "যাচাই বাকি",
      value: String(pending.length),
      sub: formatBDT(pending.reduce((s, o) => s + o.total, 0)),
      icon: Clock3,
      tone: "bg-amber-500/15 text-amber-600 dark:text-amber-400",
    },
    {
      label: "ভেরিফাইড",
      value: String(paid.length),
      sub: formatBDT(paid.reduce((s, o) => s + o.total, 0)),
      icon: CheckCircle2,
      tone: "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400",
    },
  ];

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-extrabold">পেমেন্ট</h1>
        <p className="mt-1 text-sm text-muted">
          bKash TrxID মিলিয়ে Approve করুন — Approve করলেই অর্ডার অটো কনফার্ম হবে
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        {cards.map((c) => (
          <section key={c.label} className="card p-5">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-xs font-bold uppercase tracking-wide text-muted">{c.label}</p>
                <p className="mt-2 font-display text-2xl font-extrabold">{c.value}</p>
                <p className="mt-1 text-xs text-muted">{c.sub}</p>
              </div>
              <span className={`grid h-10 w-10 shrink-0 place-items-center rounded-xl ${c.tone}`}>
                <c.icon className="h-5 w-5" aria-hidden />
              </span>
            </div>
          </section>
        ))}
      </div>

      {bkashOrders.length === 0 ? (
        <div className="card grid place-items-center gap-2 py-16 text-center">
          <span className="text-4xl" aria-hidden>
            💸
          </span>
          <p className="font-bold">এখনো কোনো bKash পেমেন্ট নেই</p>
          <p className="text-sm text-muted">কাস্টমার bKash-এ অর্ডার করলে এখানে দেখা যাবে</p>
        </div>
      ) : (
        <div className="card overflow-x-auto">
          <table className="w-full min-w-[860px] text-left text-sm">
            <thead>
              <tr className="border-b border-line text-xs uppercase tracking-wide text-muted">
                <th scope="col" className="px-4 py-3 font-bold">
                  অর্ডার
                </th>
                <th scope="col" className="px-4 py-3 font-bold">
                  কাস্টমার
                </th>
                <th scope="col" className="px-4 py-3 font-bold">
                  TrxID
                </th>
                <th scope="col" className="px-4 py-3 font-bold">
                  পরিমাণ
                </th>
                <th scope="col" className="px-4 py-3 font-bold">
                  স্ট্যাটাস
                </th>
                <th scope="col" className="px-4 py-3 text-right font-bold">
                  অ্যাকশন
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {bkashOrders.map((o) => (
                <tr key={o.id} className="align-top transition-colors hover:bg-fg/[0.03]">
                  <td className="px-4 py-3">
                    <Link
                      href={`/admin/orders/${o.id}`}
                      className="font-bold hover:text-brand-strong hover:underline"
                    >
                      {o.order_no}
                    </Link>
                    <p className="mt-0.5 text-[11px] text-muted">{formatDateTime(o.created_at)}</p>
                  </td>
                  <td className="px-4 py-3">
                    <p className="font-semibold">{o.customer_name}</p>
                    <a
                      href={waLink(o.phone, `হ্যালো ${o.customer_name}, আপনার অর্ডার ${o.order_no} নিয়ে…`)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-[11px] text-muted hover:text-brand-strong hover:underline"
                    >
                      {o.phone}
                    </a>
                  </td>
                  <td className="px-4 py-3">
                    {o.bkash_trx_id ? (
                      <span className="font-mono text-xs font-bold">{o.bkash_trx_id}</span>
                    ) : (
                      <span className="text-xs text-muted">—</span>
                    )}
                  </td>
                  <td className="px-4 py-3 font-extrabold">{formatBDT(o.total)}</td>
                  <td className="px-4 py-3">
                    <span className={cn("badge", STATUS_STYLE[o.payment_status])}>
                      {STATUS_LABEL[o.payment_status]}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex justify-end">
                      {o.payment_status === "pending_verify" ? (
                        <PaymentActions orderId={o.id} />
                      ) : (
                        <Link href={`/admin/orders/${o.id}`} className="btn btn-ghost btn-sm">
                          বিস্তারিত
                        </Link>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <p className="text-xs text-muted">
        টিপস: কাস্টমার ভুল করে পেমেন্ট না করলে অর্ডার ডিটেইলস থেকে স্ট্যাটাস{" "}
        <strong className="text-fg">বাতিল</strong> করে দিন। bKash নম্বর সেটিংস পেজ থেকে বদলানো যায়।
      </p>
    </div>
  );
}
