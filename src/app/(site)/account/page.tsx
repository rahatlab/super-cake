import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { LogOut, MapPin, Package, Star } from "lucide-react";
import { getCurrentUser, createReviewAccessToken } from "@/lib/auth";
import { logoutAction } from "@/lib/actions/auth";
import { PasswordForm } from "@/components/auth/password-form";
import { getStore } from "@/lib/store";
import { ORDER_STATUS_META } from "@/lib/constants";
import { formatBDT, formatDateTime } from "@/lib/utils";

export const metadata: Metadata = {
  title: "আমার অ্যাকাউন্ট",
  robots: { index: false },
};

export default async function AccountPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login?next=/account");

  const store = getStore();
  // Any guest orders placed with the verified account phone belong to this user.
  await store.claimGuestOrders(user.id, user.phone);

  const [orders, settings] = await Promise.all([
    store.listOrdersByUser(user.id),
    store.getSettings(),
  ]);

  const mine = orders.slice(0, 20);
  const totalSpent = orders
    .filter((o) => o.order_status !== "cancelled")
    .reduce((s, o) => s + o.total, 0);

  return (
    <div className="container-page py-10">
      <header className="mb-7 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <span className="grid h-14 w-14 place-items-center rounded-2xl bg-gradient-to-br from-brand to-accent text-xl font-extrabold text-white">
            {user.name.slice(0, 1)}
          </span>
          <div>
            <h1 className="text-2xl font-extrabold">{user.name}</h1>
            <p className="text-sm text-muted">
              {user.phone}
              {user.email ? ` · ${user.email}` : ""}
            </p>
          </div>
        </div>

        <div className="flex gap-2">
          <Link href="/cakes" className="btn btn-soft btn-sm">
            <Package className="h-4 w-4" /> নতুন অর্ডার
          </Link>
          <form action={logoutAction}>
            <button type="submit" className="btn btn-ghost btn-sm">
              <LogOut className="h-4 w-4" /> লগআউট
            </button>
          </form>
        </div>
      </header>

      {/* summary */}
      <div className="mb-7 grid gap-4 sm:grid-cols-3">
        {[
          { label: "মোট অর্ডার", value: String(orders.length), icon: Package },
          { label: "মোট খরচ", value: formatBDT(totalSpent), icon: Star },
          { label: "লয়্যালটি", value: user.role === "admin" ? "Admin" : "Member", icon: Star },
        ].map((s) => (
          <div key={s.label} className="card flex items-center gap-3 p-4">
            <span className="grid h-10 w-10 place-items-center rounded-xl bg-brand/12 text-brand-strong">
              <s.icon className="h-5 w-5" />
            </span>
            <div>
              <p className="text-xs text-muted">{s.label}</p>
              <p className="font-display text-xl font-extrabold">{s.value}</p>
            </div>
          </div>
        ))}
      </div>

      {/* password */}
      <div className="mb-7">
        <PasswordForm />
      </div>

      {/* orders */}
      <h2 className="mb-4 text-xl font-extrabold">আমার অর্ডার</h2>

      {mine.length === 0 ? (
        <div className="card px-6 py-14 text-center">
          <span className="text-5xl">🧺</span>
          <p className="mt-3 font-bold">এখনো কোনো অর্ডার করেননি</p>
          <p className="mt-1 text-sm text-muted">প্রথম অর্ডারে ১০% ছাড় — কোড WELCOME10 ব্যবহার করুন!</p>
          <Link href="/cakes" className="btn btn-primary mt-5">
            কেক দেখুন
          </Link>
        </div>
      ) : (
        <div className="space-y-3">
          {mine.map((o) => {
            const meta = ORDER_STATUS_META[o.order_status];
            const reviewable = ["delivered", "completed"].includes(o.order_status);
            return (
              <div key={o.id} className="card flex flex-wrap items-center gap-4 p-4">
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="font-bold">{o.order_no}</p>
                    <span className={`badge ${meta.color}`}>{meta.label}</span>
                  </div>
                  <p className="mt-1 truncate text-xs text-muted">
                    {o.items.map((i) => i.name).join(", ")}
                  </p>
                  <p className="text-[11px] text-muted">{formatDateTime(o.created_at)}</p>
                </div>

                <p className="font-display text-lg font-extrabold text-brand-strong">
                  {formatBDT(o.total)}
                </p>

                <div className="flex gap-2">
                  <Link href={`/track?no=${o.order_no}`} className="btn btn-ghost btn-sm">
                    <MapPin className="h-3.5 w-3.5" /> ট্র্যাক
                  </Link>
                  {reviewable && (
                    <Link
                      href={`/review/${o.id}?token=${encodeURIComponent(createReviewAccessToken(o.id))}`}
                      className="btn btn-soft btn-sm"
                    >
                      <Star className="h-3.5 w-3.5" /> রিভিউ
                    </Link>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      <p className="mt-6 text-center text-xs text-muted">
        সমস্যা হলে{" "}
        <a
          href={`https://wa.me/${settings.whatsapp_phone.replace(/\D/g, "")}`}
          target="_blank"
          rel="noopener noreferrer"
          className="font-semibold text-brand-strong underline"
        >
          WhatsApp এ জানান
        </a>
      </p>
    </div>
  );
}
