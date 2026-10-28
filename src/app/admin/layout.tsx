import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { ExternalLink, LogOut } from "lucide-react";
import { requireAdmin } from "@/lib/auth";
import { getStore } from "@/lib/store";
import { logoutAction } from "@/lib/actions/auth";
import { AdminSidebar } from "@/components/admin/sidebar";

export const metadata: Metadata = {
  title: { default: "Admin | Super Cake", template: "%s | Admin" },
  robots: { index: false, follow: false },
};

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const admin = await requireAdmin();
  if (!admin) redirect("/login?next=/admin");

  const notifications = await getStore().listNotifications();
  const unread = notifications.filter((n) => !n.is_read).length;

  return (
    <div className="min-h-screen bg-bg">
      <AdminSidebar unread={unread} />

      <div className="lg:pl-64">
        {/* top bar */}
        <header className="sticky top-0 z-30 border-b border-line bg-surface/85 backdrop-blur">
          <div className="flex h-16 items-center justify-between gap-3 px-4 pl-16 lg:pl-6">
            <div className="min-w-0">
              <p className="truncate text-sm font-extrabold">Admin Dashboard</p>
              <p className="truncate text-xs text-muted">
                স্বাগতম, {admin.name} — সব কিছু এক জায়গায়
              </p>
            </div>

            <div className="flex items-center gap-2">
              <Link
                href="/"
                target="_blank"
                className="btn btn-ghost btn-sm hidden sm:inline-flex"
                aria-label="সাইট নতুন ট্যাবে দেখুন"
              >
                <ExternalLink className="h-3.5 w-3.5" aria-hidden />
                সাইট দেখুন
              </Link>
              <form action={logoutAction}>
                <button type="submit" className="btn btn-soft btn-sm" aria-label="লগআউট করুন">
                  <LogOut className="h-3.5 w-3.5" aria-hidden />
                  লগআউট
                </button>
              </form>
            </div>
          </div>
        </header>

        <main className="mx-auto w-full max-w-[88rem] px-4 py-6 sm:px-6">{children}</main>
      </div>
    </div>
  );
}
