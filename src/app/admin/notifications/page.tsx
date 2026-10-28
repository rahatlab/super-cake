import type { Metadata } from "next";
import Link from "next/link";
import { Bell } from "lucide-react";
import { getStore } from "@/lib/store";
import { cn, formatDateTime } from "@/lib/utils";
import type { Notification } from "@/lib/types";
import { MarkAllReadButton, MarkReadButton } from "@/components/admin/notification-actions";

export const metadata: Metadata = { title: "Notifications" };

const TYPE_META: Record<
  Notification["type"],
  { label: string; emoji: string; href: string; tone: string }
> = {
  order: { label: "অর্ডার", emoji: "🧾", href: "/admin/orders", tone: "bg-brand/10 text-brand-strong" },
  payment: { label: "পেমেন্ট", emoji: "💸", href: "/admin/payments", tone: "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400" },
  review: { label: "রিভিউ", emoji: "⭐", href: "/admin/reviews", tone: "bg-violet-500/15 text-violet-600 dark:text-violet-400" },
  system: { label: "সিস্টেম", emoji: "🔔", href: "/admin", tone: "bg-line/60 text-muted" },
};

export default async function AdminNotificationsPage() {
  const notifications = await getStore().listNotifications();
  const sorted = [...notifications].sort(
    (a, b) => +new Date(b.created_at) - +new Date(a.created_at),
  );
  const unread = sorted.filter((n) => !n.is_read).length;

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-extrabold">নোটিফিকেশন</h1>
          <p className="mt-1 text-sm text-muted">
            নতুন অর্ডার, পেমেন্ট ও রিভিউর আপডেট — {unread} টি পড়া হয়নি
          </p>
        </div>
        <MarkAllReadButton unread={unread} />
      </div>

      {sorted.length === 0 ? (
        <div className="card grid place-items-center gap-2 py-16 text-center">
          <span className="grid h-12 w-12 place-items-center rounded-2xl bg-brand/10 text-brand-strong">
            <Bell className="h-6 w-6" aria-hidden />
          </span>
          <p className="font-bold">কোনো নোটিফিকেশন নেই</p>
          <p className="text-sm text-muted">নতুন অর্ডার বা রিভিউ এলে এখানে দেখা যাবে</p>
        </div>
      ) : (
        <div className="space-y-3">
          {sorted.map((n) => {
            const meta = TYPE_META[n.type] ?? TYPE_META.system;
            return (
              <article
                key={n.id}
                className={cn(
                  "card flex flex-wrap items-start justify-between gap-3 p-4",
                  !n.is_read && "border-brand/30 bg-brand/[0.035]",
                )}
              >
                <div className="flex min-w-0 items-start gap-3">
                  <span className={cn("grid h-10 w-10 shrink-0 place-items-center rounded-xl text-lg", meta.tone)} aria-hidden>
                    {meta.emoji}
                  </span>
                  <div className="min-w-0">
                    <p className="flex flex-wrap items-center gap-2 font-bold">
                      {n.title}
                      <span className="badge bg-fg/6 text-muted">{meta.label}</span>
                      {!n.is_read && (
                        <span className="badge bg-brand text-brand-fg">নতুন</span>
                      )}
                    </p>
                    <p className="mt-1 text-sm leading-relaxed text-muted">{n.message}</p>
                    <p className="mt-1.5 text-[11px] text-muted">{formatDateTime(n.created_at)}</p>
                  </div>
                </div>

                <div className="flex flex-wrap items-center justify-end gap-2">
                  <Link href={meta.href} className="btn btn-ghost btn-sm">
                    দেখুন
                  </Link>
                  {!n.is_read && <MarkReadButton id={n.id} />}
                </div>
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
}
