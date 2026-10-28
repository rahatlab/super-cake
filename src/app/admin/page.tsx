import type { Metadata } from "next";
import Link from "next/link";
import {
  ArrowRight,
  BadgeDollarSign,
  CakeSlice,
  ClipboardList,
  Clock3,
  Star,
} from "lucide-react";
import { getStore } from "@/lib/store";
import { ORDER_STATUS_META } from "@/lib/constants";
import { formatBDT, formatDateTime } from "@/lib/utils";
import { PieStat, BarStat } from "@/components/admin/charts";

export const metadata: Metadata = { title: "Overview" };

const OCCASION_LABEL: Record<string, string> = {
  birthday: "জন্মদিন",
  anniversary: "বার্ষিকী",
  occasion: "অনুষ্ঠান",
  gift: "উপহার",
  others: "অন্যান্য",
};

export default async function AdminOverviewPage() {
  const store = getStore();
  const [stats, orders] = await Promise.all([store.getDashboardStats(), store.listOrders()]);
  const recent = orders.slice(0, 6);

  const cards = [
    {
      label: "মোট অর্ডার",
      value: String(stats.total_orders),
      sub: `${stats.delivered_orders} ডেলিভারি সম্পন্ন`,
      icon: ClipboardList,
      tone: "bg-brand/12 text-brand-strong",
    },
    {
      label: "পেন্ডিং অর্ডার",
      value: String(stats.pending_orders),
      sub: "কনফার্ম / বেকিং চলছে",
      icon: Clock3,
      tone: "bg-amber-500/15 text-amber-600 dark:text-amber-400",
    },
    {
      label: "মোট আয়",
      value: formatBDT(stats.revenue),
      sub: "বাতিল বাদে realized আয়",
      icon: BadgeDollarSign,
      tone: "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400",
    },
    {
      label: "গড় রেটিং",
      value: stats.avg_rating ? `${stats.avg_rating} / 5` : "—",
      sub: `${stats.total_reviews} টি রিভিউ`,
      icon: Star,
      tone: "bg-violet-500/15 text-violet-600 dark:text-violet-400",
    },
  ];

  const occasionData = stats.orders_by_occasion.map((d) => ({
    name: OCCASION_LABEL[d.name] ?? d.name,
    value: d.value,
  }));

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-extrabold">সারসংক্ষেপ</h1>
          <p className="mt-1 text-sm text-muted">
            দোকানের বর্তমান অবস্থা — অর্ডার, রিভিউনিউ ও পণ্যের এক নজরে
          </p>
        </div>
        <Link href="/admin/orders" className="btn btn-soft btn-sm">
          সব অর্ডার <ArrowRight className="h-3.5 w-3.5" aria-hidden />
        </Link>
      </div>

      {/* stat cards */}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
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

      {/* charts */}
      <div className="grid gap-4 lg:grid-cols-2 xl:grid-cols-3">
        <PieStat title="অর্ডার — Occasion অনুযায়ী" data={occasionData} />
        <PieStat title="পেমেন্ট মেথড" data={stats.orders_by_payment} />
        <PieStat title="Promo কোড ব্যবহার" data={stats.promo_usage} />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <BarStat title="শেষ ৭ দিনের রিভিউনিউ" data={stats.revenue_by_day} />

        {/* recent orders */}
        <section className="card overflow-hidden">
          <header className="flex items-center justify-between gap-3 border-b border-line px-5 py-4">
            <h2 className="text-sm font-bold uppercase tracking-wide text-muted">নতুন অর্ডার</h2>
            <Link href="/admin/orders" className="text-xs font-bold text-brand-strong hover:underline">
              সব দেখুন
            </Link>
          </header>

          {recent.length === 0 ? (
            <div className="grid place-items-center gap-2 py-14 text-center">
              <span className="text-3xl" aria-hidden>
                🧾
              </span>
              <p className="text-sm font-semibold text-muted">এখনো কোনো অর্ডার নেই</p>
            </div>
          ) : (
            <ul className="divide-y divide-line">
              {recent.map((o) => {
                const meta = ORDER_STATUS_META[o.order_status];
                return (
                  <li key={o.id}>
                    <Link
                      href={`/admin/orders/${o.id}`}
                      className="flex items-center gap-3 px-5 py-3 transition-colors hover:bg-fg/[0.03]"
                    >
                      <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-brand/10 text-brand-strong">
                        <CakeSlice className="h-4 w-4" aria-hidden />
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-bold">{o.order_no}</p>
                        <p className="truncate text-xs text-muted">
                          {o.customer_name} · {formatDateTime(o.created_at)}
                        </p>
                      </div>
                      <span className={`badge ${meta.color} hidden sm:inline-flex`}>{meta.bn}</span>
                      <span className="shrink-0 text-sm font-extrabold">{formatBDT(o.total)}</span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          )}
        </section>
      </div>

      {stats.total_products === 0 && (
        <div className="card flex flex-wrap items-center justify-between gap-3 border-brand/30 bg-brand/5 p-5">
          <div>
            <p className="font-bold">কোনো কেক এখনো যোগ করা হয়নি</p>
            <p className="mt-1 text-sm text-muted">প্রথম কেক যোগ করলেই সাইটে দেখা যাবে।</p>
          </div>
          <Link href="/admin/cakes/new" className="btn btn-primary btn-sm">
            + নতুন কেক
          </Link>
        </div>
      )}
    </div>
  );
}
