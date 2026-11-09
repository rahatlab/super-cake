import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getCachedSettings } from "@/lib/store/cache";
import { getAccessibleOrder } from "@/lib/invoice-access";
import { formatBDT, formatDateTime } from "@/lib/utils";
import { ORDER_STATUS_META, PAYMENT_METHOD_LABEL } from "@/lib/constants";

export const metadata: Metadata = { title: "Invoice", robots: { index: false } };

export default async function InvoicePage({
  params,
  searchParams,
}: {
  params: Promise<{ orderNo: string }>;
  searchParams: Promise<{ token?: string; phone?: string }>;
}) {
  const { orderNo } = await params;
  const { token, phone } = await searchParams;
  const accessible = await getAccessibleOrder({ orderNo, token, phone });
  if (!accessible) {
    return (
      <div className="container-page py-16">
        <div className="card mx-auto max-w-lg p-8 text-center">
          <h1 className="text-2xl font-extrabold">Invoice দেখা যাবে না</h1>
          <p className="mt-2 text-sm text-muted">
            অর্ডার নম্বর <strong className="font-mono text-fg">{orderNo}</strong> — invoice দেখতে
            WhatsApp-এ পাঠানো লিংক ব্যবহার করুন, অথবা অর্ডার নম্বর ও ফোন নম্বর দিয়ে ট্র্যাক করুন।
          </p>
          <div className="mt-5 flex flex-wrap justify-center gap-2">
            <Link href={`/track?no=${encodeURIComponent(orderNo)}`} className="btn btn-primary">ট্র্যাক করুন</Link>
            <Link href="/" className="btn btn-ghost">হোম</Link>
          </div>
        </div>
      </div>
    );
  }

  const order = accessible;
  const settings = await getCachedSettings();
  const meta = ORDER_STATUS_META[order.order_status];

  return (
    <div className="container-page py-10">
      <div className="mx-auto max-w-3xl">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3 print:hidden">
          <Link href="/" className="text-sm font-semibold text-muted hover:text-fg">← {settings.store_name}</Link>
          <div className="flex gap-2">
            <a
              href={`/api/invoice/${encodeURIComponent(order.order_no)}/pdf${token ? `?token=${encodeURIComponent(token)}` : phone ? `?phone=${encodeURIComponent(phone)}` : ""}`}
              className="btn btn-primary"
            >
              Download PDF
            </a>
          </div>
        </div>

        <div className="card p-6 sm:p-8" id="invoice">
          <header className="flex flex-wrap items-start justify-between gap-4 border-b border-line pb-5">
            <div>
              <h1 className="font-display text-2xl font-extrabold">{settings.store_name}</h1>
              <p className="mt-1 text-sm text-muted">{settings.tagline}</p>
              <p className="mt-1 text-xs text-muted">{settings.address} · {settings.phone} · {settings.email}</p>
            </div>
            <div className="text-right">
              <p className="text-xs font-bold uppercase tracking-wide text-muted">Invoice</p>
              <p className="font-mono text-lg font-extrabold">{order.order_no}</p>
              <p className="text-xs text-muted">{formatDateTime(order.created_at)}</p>
            </div>
          </header>

          <div className="grid gap-4 py-5 text-sm sm:grid-cols-2">
            <div>
              <p className="text-xs font-bold uppercase tracking-wide text-muted">কাস্টমার</p>
              <p className="mt-1 font-semibold">{order.customer_name}</p>
              <p className="text-muted">{order.phone}</p>
              {order.email && <p className="text-muted">{order.email}</p>}
            </div>
            <div>
              <p className="text-xs font-bold uppercase tracking-wide text-muted">ডেলিভারি</p>
              <p className="mt-1 font-semibold">{order.delivery_date}{order.delivery_slot ? ` · ${order.delivery_slot}` : ""}</p>
              <p className="text-muted">{order.address}</p>
            </div>
          </div>

          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-y border-line text-xs uppercase tracking-wide text-muted">
                <th className="py-2 font-bold">আইটেম</th>
                <th className="py-2 font-bold">ওজন</th>
                <th className="py-2 font-bold">Qty</th>
                <th className="py-2 font-bold">একক</th>
                <th className="py-2 text-right font-bold">মোট</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {order.items.map((it, i) => (
                <tr key={i}>
                  <td className="py-2.5 font-semibold">{it.name}</td>
                  <td className="py-2.5 text-muted">{it.weight ? `${it.weight} lb` : "—"}</td>
                  <td className="py-2.5">×{it.quantity}</td>
                  <td className="py-2.5">{formatBDT(it.unit_price)}</td>
                  <td className="py-2.5 text-right font-bold">{formatBDT(it.unit_price * it.quantity)}</td>
                </tr>
              ))}
            </tbody>
          </table>

          <div className="mt-5 space-y-2 border-t border-line pt-4 text-sm">
            <div className="flex justify-between"><span className="text-muted">Subtotal</span><span className="font-semibold">{formatBDT(order.subtotal)}</span></div>
            {order.discount_amount > 0 && <div className="flex justify-between"><span className="text-muted">Promo {order.promo_code ?? ""}</span><span className="font-semibold text-success">− {formatBDT(order.discount_amount)}</span></div>}
            {order.referral_discount > 0 && <div className="flex justify-between"><span className="text-muted">Referral</span><span className="font-semibold text-success">− {formatBDT(order.referral_discount)}</span></div>}
            <div className="flex justify-between"><span className="text-muted">ডেলিভারি চার্জ</span><span className="font-semibold">{order.delivery_charge === 0 ? "ফ্রি" : formatBDT(order.delivery_charge)}</span></div>
            <div className="flex items-center justify-between border-t border-line pt-3">
              <span className="font-extrabold">সর্বমোট</span>
              <span className="font-display text-xl font-extrabold text-brand-strong">{formatBDT(order.total)}</span>
            </div>
            <div className="flex flex-wrap justify-between gap-2 pt-2 text-xs text-muted">
              <span>পেমেন্ট: <strong className="text-fg">{PAYMENT_METHOD_LABEL[order.payment_method] ?? order.payment_method}</strong> · {order.payment_status}{order.bkash_trx_id ? ` · TrxID ${order.bkash_trx_id}` : ""}</span>
              <span className={`badge ${meta.color}`}>{meta.label} · {meta.bn}</span>
            </div>
          </div>

          <footer className="mt-6 border-t border-line pt-4 text-center text-xs text-muted">
            ধন্যবাদ! {settings.store_name} — {settings.phone}
          </footer>
        </div>
      </div>
    </div>
  );
}
