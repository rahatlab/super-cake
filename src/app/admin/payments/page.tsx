import type { Metadata } from "next";
import Link from "next/link";
import { CheckCircle2, Clock3, Wallet } from "lucide-react";
import { getStore } from "@/lib/store";
import { cn, formatBDT, formatDateTime, parsePageParam, waLink } from "@/lib/utils";
import type { PaymentMethod, PaymentStatus } from "@/lib/types";
import { PaymentActions } from "@/components/admin/payment-actions";
import { Pagination } from "@/components/pagination";
import { AnimIcon } from "@/components/ui/anim-icon";

export const metadata: Metadata = { title: "Payments" };

const PAGE_SIZE = 10;

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

const METHOD_LABEL: Record<PaymentMethod, string> = {
  cod: "Cash on Delivery",
  bkash: "bKash",
  paystation: "PayStation",
};

export default async function AdminPaymentsPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string; method?: string; status?: string }>;
}) {
  const store = getStore();
  const [payments, orders] = await Promise.all([store.listPayments(), store.listOrders()]);
  const orderById = new Map(orders.map((o) => [o.id, o]));

  const sp = await searchParams;
  const methodFilter = (["cod", "bkash", "paystation"] as PaymentMethod[]).includes(sp.method as PaymentMethod)
    ? (sp.method as PaymentMethod)
    : null;
  const statusFilter = (["unpaid", "pending_verify", "paid", "refunded"] as PaymentStatus[]).includes(sp.status as PaymentStatus)
    ? (sp.status as PaymentStatus)
    : null;

  const rows = payments
    .filter((p) => !methodFilter || p.method === methodFilter)
    .filter((p) => !statusFilter || p.status === statusFilter)
    .sort((a, b) => +new Date(b.created_at) - +new Date(a.created_at));

  const paid = payments.filter((p) => p.status === "paid");
  const pending = payments.filter((p) => p.status === "pending_verify");

  const page = parsePageParam(sp.page);
  const totalPages = Math.max(1, Math.ceil(rows.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const visible = rows.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);

  const cards = [
    {
      label: "সব পেমেন্ট",
      value: String(payments.length),
      sub: formatBDT(payments.reduce((s, p) => s + p.amount, 0)),
      icon: Wallet,
      tone: "bg-brand/12 text-brand-strong",
    },
    {
      label: "যাচাই বাকি",
      value: String(pending.length),
      sub: formatBDT(pending.reduce((s, p) => s + p.amount, 0)),
      icon: Clock3,
      tone: "bg-amber-500/15 text-amber-600 dark:text-amber-400",
    },
    {
      label: "পরিশোধিত",
      value: String(paid.length),
      sub: formatBDT(paid.reduce((s, p) => s + p.amount, 0)),
      icon: CheckCircle2,
      tone: "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400",
    },
  ];

  const query = (patch: Record<string, string>) => {
    const params = new URLSearchParams();
    const next = { method: methodFilter ?? "", status: statusFilter ?? "", page: String(safePage), ...patch };
    if (next.method) params.set("method", next.method);
    if (next.status) params.set("status", next.status);
    if (next.page && next.page !== "1") params.set("page", next.page);
    const qs = params.toString();
    return qs ? `/admin/payments?${qs}` : "/admin/payments";
  };

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-extrabold">পেমেন্ট</h1>
        <p className="mt-1 text-sm text-muted">
          সব মেথডের পেমেন্ট (COD / bKash / PayStation) এক জায়গায় — bKash TrxID মিলিয়ে Approve করুন
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

      <div className="flex flex-wrap gap-2">
        <Link href={query({ method: "", status: statusFilter ?? "", page: "1" })} className="chip" data-active={!methodFilter}>সব মেথড</Link>
        {(Object.keys(METHOD_LABEL) as PaymentMethod[]).map((m) => (
          <Link key={m} href={query({ method: m, page: "1" })} className="chip" data-active={methodFilter === m}>{METHOD_LABEL[m]}</Link>
        ))}
        <span className="mx-1 self-center text-muted">·</span>
        <Link href={query({ status: "", page: "1" })} className="chip" data-active={!statusFilter}>সব স্ট্যাটাস</Link>
        {(Object.keys(STATUS_LABEL) as PaymentStatus[]).map((s) => (
          <Link key={s} href={query({ status: s, page: "1" })} className="chip" data-active={statusFilter === s}>{STATUS_LABEL[s]}</Link>
        ))}
      </div>

      {rows.length === 0 ? (
        <div className="card grid place-items-center gap-2 py-16 text-center">
          <AnimIcon name="money" className="h-10 w-10" aria-hidden />
          <p className="font-bold">এখনো কোনো পেমেন্ট নেই</p>
          <p className="text-sm text-muted">COD সংগ্রহ, bKash বা PayStation পেমেন্ট এলে এখানে দেখা যাবে</p>
        </div>
      ) : (
        <div className="card overflow-x-auto">
          <table className="w-full min-w-[860px] text-left text-sm">
            <thead>
              <tr className="border-b border-line text-xs uppercase tracking-wide text-muted">
                <th scope="col" className="px-4 py-3 font-bold">অর্ডার</th>
                <th scope="col" className="px-4 py-3 font-bold">কাস্টমার</th>
                <th scope="col" className="px-4 py-3 font-bold">মেথড</th>
                <th scope="col" className="px-4 py-3 font-bold">TrxID</th>
                <th scope="col" className="px-4 py-3 font-bold">পরিমাণ</th>
                <th scope="col" className="px-4 py-3 font-bold">স্ট্যাটাস</th>
                <th scope="col" className="px-4 py-3 font-bold">তারিখ</th>
                <th scope="col" className="px-4 py-3 text-right font-bold">অ্যাকশন</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {visible.map((p) => {
                const o = orderById.get(p.order_id);
                return (
                  <tr key={p.id} className="align-top transition-colors hover:bg-fg/[0.03]">
                    <td className="px-4 py-3">
                      {o ? (
                        <Link href={`/admin/orders/${o.id}`} className="font-bold hover:text-brand-strong hover:underline">{o.order_no}</Link>
                      ) : (
                        <span className="text-muted">—</span>
                      )}
                      <p className="mt-0.5 text-[11px] text-muted">{formatDateTime(p.created_at)}</p>
                    </td>
                    <td className="px-4 py-3">
                      {o ? (
                        <>
                          <p className="font-semibold">{o.customer_name}</p>
                          <a href={waLink(o.phone, `হ্যালো ${o.customer_name}, আপনার অর্ডার ${o.order_no} নিয়ে…`)} target="_blank" rel="noopener noreferrer" className="text-[11px] text-muted hover:text-brand-strong hover:underline">
                            {o.phone}
                          </a>
                        </>
                      ) : <span className="text-muted">—</span>}
                    </td>
                    <td className="px-4 py-3">{METHOD_LABEL[p.method] ?? p.method}</td>
                    <td className="px-4 py-3">
                      {p.trx_id ? <span className="font-mono text-xs font-bold">{p.trx_id}</span> : <span className="text-xs text-muted">—</span>}
                    </td>
                    <td className="px-4 py-3 font-extrabold">{formatBDT(p.amount)}</td>
                    <td className="px-4 py-3">
                      <span className={cn("badge", STATUS_STYLE[p.status])}>{STATUS_LABEL[p.status]}</span>
                    </td>
                    <td className="px-4 py-3 text-xs text-muted">{formatDateTime(p.created_at)}</td>
                    <td className="px-4 py-3">
                      <div className="flex justify-end gap-2">
                        {p.method === "bkash" && p.status === "pending_verify" && o ? (
                          <PaymentActions orderId={o.id} />
                        ) : o ? (
                          <Link href={`/admin/orders/${o.id}`} className="btn btn-ghost btn-sm">বিস্তারিত</Link>
                        ) : null}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {rows.length > 0 && <Pagination page={safePage} totalPages={totalPages} total={rows.length} />}

      <p className="text-xs text-muted">
        টিপস: COD অর্ডার সম্পন্ন (সম্পন্ন) করলেই সংগ্রহ পেমেন্টে যোগ হয়। bKash নম্বর সেটিংস পেজ থেকে বদলানো যায়।
      </p>
    </div>
  );
}
