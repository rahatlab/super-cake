"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  Bell,
  CakeSlice,
  ClipboardList,
  FileText,
  LayoutDashboard,
  Megaphone,
  Menu,
  Percent,
  Settings as SettingsIcon,
  Star,
  Wallet,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";

const LINKS = [
  { href: "/admin", label: "Overview", bn: "সারসংক্ষেপ", icon: LayoutDashboard },
  { href: "/admin/orders", label: "Orders", bn: "অর্ডার", icon: ClipboardList },
  { href: "/admin/cakes", label: "Cakes", bn: "কেক", icon: CakeSlice },
  { href: "/admin/payments", label: "Payments", bn: "পেমেন্ট", icon: Wallet },
  { href: "/admin/promos", label: "Promos", bn: "প্রোমো", icon: Percent },
  { href: "/admin/reviews", label: "Reviews", bn: "রিভিউ", icon: Star },
  { href: "/admin/blog", label: "Blog", bn: "ব্লগ", icon: FileText },
  { href: "/admin/banners", label: "Banner", bn: "ব্যানার", icon: Megaphone },
  { href: "/admin/notifications", label: "Notifications", bn: "নোটিফিকেশন", icon: Bell },
  { href: "/admin/settings", label: "Settings", bn: "সেটিংস", icon: SettingsIcon },
];

function isActive(pathname: string, href: string) {
  if (href === "/admin") return pathname === "/admin";
  return pathname === href || pathname.startsWith(href + "/");
}

function NavList({ pathname, onNavigate }: { pathname: string; onNavigate?: () => void }) {
  return (
    <nav className="flex flex-col gap-1" aria-label="Admin navigation">
      {LINKS.map((link) => {
        const active = isActive(pathname, link.href);
        const Icon = link.icon;
        return (
          <Link
            key={link.href}
            href={link.href}
            onClick={onNavigate}
            aria-current={active ? "page" : undefined}
            className={cn(
              "relative flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm transition-colors",
              active
                ? "bg-brand/12 font-bold text-brand-strong"
                : "font-semibold text-muted hover:bg-fg/5 hover:text-fg",
            )}
          >
            {active && (
              <motion.span
                layoutId="admin-nav-accent"
                aria-hidden
                className="absolute inset-y-1.5 left-0 w-1 rounded-full bg-brand"
                transition={{ type: "spring", stiffness: 420, damping: 32 }}
              />
            )}
            <Icon className="h-[18px] w-[18px] shrink-0" aria-hidden />
            <span className="flex-1">{link.label}</span>
            <span className="text-xs font-medium text-muted/80">{link.bn}</span>
          </Link>
        );
      })}
    </nav>
  );
}

function SidebarBody({ unread, onNavigate }: { unread: number; onNavigate?: () => void }) {
  const pathname = usePathname();
  return (
    <div className="flex h-full flex-col gap-4 p-4">
      <div className="flex items-center justify-between gap-2 px-1">
        <Link href="/admin" className="flex items-center gap-2" onClick={onNavigate}>
          <span className="grid h-9 w-9 place-items-center rounded-xl bg-gradient-to-br from-brand to-accent text-lg shadow-soft">
            🎂
          </span>
          <span className="font-display text-lg font-extrabold tracking-tight">
            Super<span className="text-gradient">Cake</span>
            <span className="ml-1.5 rounded-full bg-brand/12 px-2 py-0.5 text-[10px] font-extrabold uppercase tracking-wider text-brand-strong">
              admin
            </span>
          </span>
        </Link>
      </div>

      <Link
        href="/admin/notifications"
        onClick={onNavigate}
        className="flex items-center gap-2 rounded-xl border border-line bg-bg px-3 py-2 text-sm transition-colors hover:border-brand/40 hover:bg-brand/5"
      >
        <Bell className="h-4 w-4 text-brand-strong" aria-hidden />
        <span className="font-semibold text-muted">নতুন নোটিফিকেশন</span>
        <span
          className={cn(
            "ml-auto grid h-6 min-w-6 place-items-center rounded-full px-1 text-xs font-extrabold",
            unread > 0 ? "bg-brand text-brand-fg" : "bg-line/60 text-muted",
          )}
          aria-label={`${unread} টি পড়া হয়নি`}
        >
          {unread}
        </span>
      </Link>

      <div className="flex-1 overflow-y-auto">
        <NavList pathname={pathname} onNavigate={onNavigate} />
      </div>

      <p className="px-1 text-xs text-muted">© Super Cake — Admin Panel</p>
    </div>
  );
}

/**
 * Admin navigation. Static sidebar on lg+ screens, framer-motion slide-in
 * drawer (with hamburger trigger) on smaller screens.
 */
export function AdminSidebar({ unread }: { unread: number }) {
  const [open, setOpen] = useState(false);

  // Lock background scrolling while the mobile drawer is open.
  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  return (
    <>
      {/* mobile trigger */}
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label="অ্যাডমিন মেনু খুলুন"
        aria-expanded={open}
        className="fixed left-3 top-3 z-50 grid h-10 w-10 place-items-center rounded-xl border border-line bg-surface shadow-soft lg:hidden"
      >
        <Menu className="h-5 w-5" aria-hidden />
        {unread > 0 && (
          <span className="absolute -right-1.5 -top-1.5 grid h-5 min-w-5 place-items-center rounded-full bg-brand px-1 text-[10px] font-extrabold text-brand-fg">
            {unread}
          </span>
        )}
      </button>

      {/* desktop sidebar */}
      <aside className="fixed inset-y-0 left-0 z-40 hidden w-64 border-r border-line bg-surface lg:block">
        <SidebarBody unread={unread} />
      </aside>

      {/* mobile drawer */}
      <AnimatePresence>
        {open && (
          <>
            <motion.div
              key="backdrop"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              onClick={() => setOpen(false)}
              className="fixed inset-0 z-40 bg-black/50 lg:hidden"
              aria-hidden
            />
            <motion.aside
              key="drawer"
              initial={{ x: "-100%" }}
              animate={{ x: 0 }}
              exit={{ x: "-100%" }}
              transition={{ type: "spring", stiffness: 380, damping: 38 }}
              className="fixed inset-y-0 left-0 z-50 w-72 max-w-[85vw] border-r border-line bg-surface lg:hidden"
              aria-label="Admin menu"
            >
              <button
                type="button"
                onClick={() => setOpen(false)}
                aria-label="মেনু বন্ধ করুন"
                className="absolute right-3 top-3 grid h-9 w-9 place-items-center rounded-full border border-line bg-bg text-muted transition-colors hover:text-fg"
              >
                <X className="h-4 w-4" aria-hidden />
              </button>
              <SidebarBody unread={unread} onNavigate={() => setOpen(false)} />
            </motion.aside>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
