"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { ClipboardList, Search } from "lucide-react";
import { OCCASIONS, ORDER_STATUS_META } from "@/lib/constants";
import { cn, formatBDT, formatDateTime } from "@/lib/utils";
import type { Occasion, Order, OrderStatus, PaymentStatus } from "@/lib/types";

const STATUS_OPTIONS = Object.keys(ORDER_STATUS_META) as OrderStatus[];

const PAYMENT_BADGE: Record<PaymentStatus, string> = {
  unpaid: "bg-line/60 text-muted",
  pending_verify: "bg-amber-500/15 text-amber-600 dark:text-amber-400",
  paid: "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400",
  refunded: "bg-rose-500/15 text-rose-600 dark:text-rose-400",
};

function occasionMeta(value: Occasion) {
  return OCCASIONS.find((o) => o.value === value) ?? { value, label: value, bn: value, emoji: "✨", hint: "" };
}

export function OrdersTable({ orders }: { orders: Order[] }) {
  const [status, setStatus] = useState<"all" | OrderStatus>("all");
  const [occasion, setOccasion] = useState<"all" | Occasion>("all");
  const [query, setQuery] = useState("");

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return orders.filter((o) => {
      if (status !== "all" && o.order_status !== status) return false;
      if (occasion !== "all" && o.occasion !== occasion) return false;
      if (!q) return true;
      return (
        o.order_no.toLowerCase().includes(q) ||
        o.customer_name.toLowerCase().includes(q) ||
        o.phone.toLowerCase().includes(q)
      );
    });
  }, [orders, status, occasion, query]);

  return (
    <div className="space-y-4">
      {/* filters */}
      <div className="card flex flex-col gap-3 p-4 md:flex-row md:items-end">
        <div className="flex-1">
          <label htmlFor="orders-search" className="label">
            সার্চ — অর্ডার নম্বর / নাম / ফোন
          </label>
          <div className="relative">
            <Search
              className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted"
              aria-hidden
            />
            <input
              id="orders-search"
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="যেমন: SC-240101-1234"
              className="field pl-9"
            />
          </div>
        </div>

        <div className="md:w-48">
          <label htmlFor="orders-status" className="label">
            স্ট্যাটাস
          </label>
          <select
            id="orders-status"
            value={status}
            onChange={(e) => setStatus(e.target.value as "all" | OrderStatus)}
            className="field"
          >
            <option value="all">সব স্ট্যাটাস</option>
            {STATUS_OPTIONS.map((s) => (
              <option key={s} value={s}>
                {ORDER_STATUS_META[s].bn} ({ORDER_STATUS_META[s].label})
              </option>
            ))}
          </select>
        </div>

        <div className="md:w-48">
          <label htmlFor="orders-occasion" className="label">
            Occasion
          </label>
          <select
            id="orders-occasion"
            value={occasion}
            onChange={(e) => setOccasion(e.target.value as "all" | Occasion)}
            className="field"
          >
            <option value="all">সব occasion</option>
            {OCCASIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.emoji} {o.bn}
              </option>
            ))}
          </select>
        </div>

        <p className="text-sm font-semibold text-muted md:pb-3">
          {filtered.length} / {orders.length} টি অর্ডার
        </p>
      </div>

      {/* table */}
      {filtered.length === 0 ? (
        <div className="card grid place-items-center gap-2 py-16 text-center">
          <span className="text-4xl" aria-hidden>
            🧾
          </span>
          <p className="font-bold">কোনো অর্ডার পাওয়া যায়নি</p>
          <p className="text-sm text-muted">ফিল্টার পরিবর্তন করে আবার দেখুন, অথবা নতুন অর্ডারের জন্য অপেক্ষা করুন।</p>
        </div>
      ) : (
        <div className="card overflow-x-auto">
          <table className="w-full min-w-[880px] text-left text-sm">
            <thead>
              <tr className="border-b border-line text-xs uppercase tracking-wide text-muted">
                <th scope="col" className="px-4 py-3 font-bold">
                  অর্ডার
                </th>
                <th scope="col" className="px-4 py-3 font-bold">
                  কাস্টমার
                </th>
                <th scope="col" className="px-4 py-3 font-bold">
                  Occasion
                </th>
                <th scope="col" className="px-4 py-3 font-bold">
                  মোট
                </th>
                <th scope="col" className="px-4 py-3 font-bold">
                  পেমেন্ট
                </th>
                <th scope="col" className="px-4 py-3 font-bold">
                  স্ট্যাটাস
                </th>
                <th scope="col" className="px-4 py-3 font-bold">
                  তারিখ
                </th>
                <th scope="col" className="px-4 py-3 text-right font-bold">
                  অ্যাকশন
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {filtered.map((o) => {
                const meta = ORDER_STATUS_META[o.order_status];
                const occ = occasionMeta(o.occasion);
                return (
                  <tr key={o.id} className="transition-colors hover:bg-fg/[0.03]">
                    <td className="px-4 py-3">
                      <Link
                        href={`/admin/orders/${o.id}`}
                        className="font-bold text-brand-strong hover:underline"
                      >
                        {o.order_no}
                      </Link>
                    </td>
                    <td className="px-4 py-3">
                      <p className="font-semibold">{o.customer_name}</p>
                      <a href={`tel:${o.phone}`} className="text-xs text-muted hover:text-fg">
                        {o.phone}
                      </a>
                    </td>
                    <td className="px-4 py-3">
                      <span className="badge bg-brand/10 text-brand-strong">
                        {occ.emoji} {occ.bn}
                      </span>
                    </td>
                    <td className="px-4 py-3 font-bold">{formatBDT(o.total)}</td>
                    <td className="px-4 py-3">
                      <span className="badge uppercase bg-line/50 text-muted">{o.payment_method}</span>{" "}
                      <span className={cn("badge", PAYMENT_BADGE[o.payment_status])}>
                        {o.payment_status.replace("_", " ")}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className={cn("badge", meta.color)}>{meta.bn}</span>
                    </td>
                    <td className="px-4 py-3 text-xs text-muted">{formatDateTime(o.created_at)}</td>
                    <td className="px-4 py-3 text-right">
                      <Link href={`/admin/orders/${o.id}`} className="btn btn-soft btn-sm">
                        Details
                      </Link>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {filtered.length === 0 && orders.length === 0 && (
        <div className="flex items-center justify-center gap-2 text-sm text-muted">
          <ClipboardList className="h-4 w-4" aria-hidden />
          মোট ০ টি অর্ডার
        </div>
      )}
    </div>
  );
}
