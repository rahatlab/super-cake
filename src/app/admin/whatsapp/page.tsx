import type { Metadata } from "next";
import Link from "next/link";
import { MessageCircle } from "lucide-react";
import { WHATSAPP } from "@/lib/constants";
import { CatalogSyncButton } from "@/components/admin/catalog-sync-button";
import { waDbConfigured } from "@/lib/whatsapp/db";
import { listWhatsAppLogs, summarizeWhatsAppLogs, type WhatsAppLogStatus } from "@/lib/whatsapp/log";
import { cn, formatDateTime } from "@/lib/utils";

export const metadata: Metadata = { title: "WhatsApp" };
import { AnimIcon } from "@/components/ui/anim-icon";

export const dynamic = "force-dynamic";

const STATUS_STYLE: Record<WhatsAppLogStatus, string> = {
  sent: "bg-blue-500/15 text-blue-600 dark:text-blue-400",
  delivered: "bg-cyan-500/15 text-cyan-600 dark:text-cyan-400",
  read: "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400",
  failed: "bg-rose-500/15 text-rose-600 dark:text-rose-400",
  skipped: "bg-line/60 text-muted",
};

const STATUS_LABEL: Record<WhatsAppLogStatus, string> = {
  sent: "পাঠানো হয়েছে",
  delivered: "পৌঁছেছে",
  read: "পড়া হয়েছে",
  failed: "ব্যর্থ",
  skipped: "বাদ",
};

const TYPE_LABEL: Record<string, string> = {
  new_order_admin: "নতুন অর্ডার (অ্যাডমিন)",
  order_confirmation: "অর্ডার কনফার্মেশন",
  order_status_update: "স্ট্যাটাস আপডেট",
  order_review_request: "রিভিউ রিকোয়েস্ট",
  abandoned_cart: "কার্ট রিমাইন্ডার",
  otp_verification: "ফোন যাচাই (OTP)",
  auto_reply: "অটো রিপ্লাই",
  birthday_wish: "জন্মদিনের শুভেচ্ছা",
  anniversary_wish: "বার্ষিকীর শুভেচ্ছা",
  catalog_order: "ক্যাটালগ অর্ডার",
};

const FILTERS: { value: WhatsAppLogStatus | ""; label: string }[] = [
  { value: "", label: "সব" },
  { value: "sent", label: "পাঠানো" },
  { value: "delivered", label: "পৌঁছেছে" },
  { value: "read", label: "পড়া" },
  { value: "failed", label: "ব্যর্থ" },
];

function asStatus(value: string | string[] | undefined): WhatsAppLogStatus | undefined {
  const raw = Array.isArray(value) ? value[0] : value;
  return raw && raw in STATUS_LABEL ? (raw as WhatsAppLogStatus) : undefined;
}

export default async function AdminWhatsAppPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  const status = asStatus((await searchParams).status);
  const configured = waDbConfigured();
  const catalogConfigured = Boolean(WHATSAPP.token && WHATSAPP.catalogId);

  const [logs, counts] = await Promise.all([
    listWhatsAppLogs({ limit: 200, status }),
    summarizeWhatsAppLogs(),
  ]);

  const cards = [
    { label: "পাঠানো", value: counts.sent ?? 0, tone: "bg-blue-500/15 text-blue-600 dark:text-blue-400" },
    { label: "পৌঁছেছে", value: counts.delivered ?? 0, tone: "bg-cyan-500/15 text-cyan-600 dark:text-cyan-400" },
    { label: "পড়া হয়েছে", value: counts.read ?? 0, tone: "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400" },
    { label: "ব্যর্থ", value: counts.failed ?? 0, tone: "bg-rose-500/15 text-rose-600 dark:text-rose-400" },
  ];

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold">WhatsApp মেসেজ লগ</h1>
          <p className="mt-1 text-sm text-muted">
            কোন মেসেজ পাঠানো হয়েছে, কোনটি কাস্টমার পেয়েছে ও পড়েছে — সব এখানে
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <span
            className={`badge ${
              catalogConfigured
                ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400"
                : "bg-amber-500/15 text-amber-600 dark:text-amber-400"
            }`}
          >
            {catalogConfigured ? "ক্যাটালগ সংযুক্ত" : "WHATSAPP_CATALOG_ID নেই"}
          </span>
          <CatalogSyncButton configured={catalogConfigured} />
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {cards.map((c) => (
          <section key={c.label} className="card p-5">
            <p className="text-xs font-bold uppercase tracking-wide text-muted">{c.label}</p>
            <p className="mt-2 font-display text-2xl font-extrabold">{c.value}</p>
            <span className={`mt-2 inline-block h-1.5 w-10 rounded-full ${c.tone}`} aria-hidden />
          </section>
        ))}
      </div>

      <div className="flex flex-wrap gap-2">
        {FILTERS.map((f) => {
          const active = (f.value || undefined) === status;
          return (
            <Link
              key={f.value || "all"}
              href={f.value ? `/admin/whatsapp?status=${f.value}` : "/admin/whatsapp"}
              className={cn(
                "chip",
                active && "border-brand bg-brand/10 text-brand-strong",
              )}
              aria-current={active ? "page" : undefined}
            >
              {f.label}
            </Link>
          );
        })}
      </div>

      {!configured ? (
        <div className="card grid place-items-center gap-2 py-16 text-center">
          <AnimIcon name="whatsapp" className="h-10 w-10" aria-hidden />
          <p className="font-bold">Supabase সংযোগ নেই</p>
          <p className="max-w-md text-sm text-muted">
            মেসেজ লগ সংরক্ষণ করতে <code className="font-mono">NEXT_PUBLIC_SUPABASE_URL</code> ও{" "}
            <code className="font-mono">SUPABASE_SERVICE_ROLE_KEY</code> সেট করুন, তারপর{" "}
            <code className="font-mono">whatsapp-delivery-status.sql</code> চালান।
          </p>
        </div>
      ) : logs.length === 0 ? (
        <div className="card grid place-items-center gap-2 py-16 text-center">
          <span className="grid h-12 w-12 place-items-center rounded-2xl bg-brand/10 text-brand-strong">
            <MessageCircle className="h-6 w-6" aria-hidden />
          </span>
          <p className="font-bold">কোনো মেসেজ নেই</p>
          <p className="text-sm text-muted">
            {status ? "এই ফিল্টারে কিছু পাওয়া যায়নি" : "অর্ডার হলে বা কাস্টমার মেসেজ করলে এখানে দেখা যাবে"}
          </p>
        </div>
      ) : (
        <div className="card overflow-x-auto">
          <table className="w-full min-w-[820px] text-left text-sm">
            <thead>
              <tr className="border-b border-line text-xs uppercase tracking-wide text-muted">
                <th scope="col" className="px-4 py-3 font-bold">সময়</th>
                <th scope="col" className="px-4 py-3 font-bold">ধরন</th>
                <th scope="col" className="px-4 py-3 font-bold">প্রাপক</th>
                <th scope="col" className="px-4 py-3 font-bold">টেমপ্লেট</th>
                <th scope="col" className="px-4 py-3 font-bold">স্ট্যাটাস</th>
                <th scope="col" className="px-4 py-3 font-bold">বিস্তারিত</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {logs.map((row) => (
                <tr key={row.id} className="align-top transition-colors hover:bg-fg/[0.03]">
                  <td className="whitespace-nowrap px-4 py-3 text-xs text-muted">
                    {formatDateTime(row.created_at)}
                  </td>
                  <td className="px-4 py-3 font-semibold">
                    {TYPE_LABEL[row.type] ?? row.type}
                    {row.order_id && (
                      <Link
                        href={`/admin/orders/${row.order_id}`}
                        className="mt-0.5 block text-[11px] font-normal text-muted hover:text-brand-strong hover:underline"
                      >
                        অর্ডার দেখুন →
                      </Link>
                    )}
                  </td>
                  <td className="px-4 py-3 font-mono text-xs">{row.to_phone}</td>
                  <td className="px-4 py-3 text-xs text-muted">
                    {row.template_name ?? "—"}
                  </td>
                  <td className="px-4 py-3">
                    <span className={cn("badge", STATUS_STYLE[row.status] ?? STATUS_STYLE.skipped)}>
                      {STATUS_LABEL[row.status] ?? row.status}
                    </span>
                  </td>
                  <td className="max-w-[260px] px-4 py-3 text-[11px] text-muted">
                    {row.detail ? (
                      <span className="break-words">{row.detail.slice(0, 220)}</span>
                    ) : (
                      "—"
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <p className="text-xs text-muted">
        টিপস: <strong className="text-fg">ব্যর্থ</strong> হলে সাধারণত কাস্টমার ২৪ ঘণ্টার চ্যাট উইন্ডো বন্ধ
        থাকে বা টেমপ্লেট অনুমোদিত নয়। <code className="font-mono">npm run wa:health</code> দিয়ে যাচাই করুন।
      </p>
    </div>
  );
}
