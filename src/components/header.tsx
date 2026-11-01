"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { LayoutDashboard, LogIn, Menu, ShoppingBag, X } from "lucide-react";
import { ThemeToggle } from "./theme-toggle";
import { useCart } from "@/components/cart/cart-context";

const NAV = [
  { href: "/", label: "হোম" },
  { href: "/cakes", label: "কেক সমূহ" },
  { href: "/custom-order", label: "Custom Cake" },
  { href: "/track", label: "অর্ডার ট্র্যাক" },
  { href: "/blog", label: "ব্লগ" },
];

export function Header({ user }: { user: { name: string; role: string } | null }) {
  const pathname = usePathname();
  const { count, setOpen } = useCart();
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 12);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const isAdmin = user?.role === "admin";

  return (
    <header
      className={`sticky top-0 z-40 transition-all duration-300 ${
        scrolled ? "glass border-b border-line shadow-soft" : "border-b border-transparent"
      }`}
    >
      <div className="container-page flex h-16 items-center justify-between gap-4">
        {/* logo */}
        <Link href="/" className="group flex items-center gap-2" aria-label="Super Cake home">
          <motion.span
            whileHover={{ rotate: [0, -12, 12, 0], scale: 1.1 }}
            transition={{ duration: 0.5 }}
            className="grid h-9 w-9 place-items-center rounded-xl bg-gradient-to-br from-brand to-accent text-lg shadow-soft"
          >
            🎂
          </motion.span>
          <span className="font-display text-xl font-extrabold tracking-tight">
            Super<span className="text-gradient">Cake</span>
          </span>
        </Link>

        {/* desktop nav */}
        <nav className="hidden items-center gap-1 lg:flex">
          {NAV.map((n) => {
            const active = n.href === "/" ? pathname === "/" : pathname.startsWith(n.href);
            return (
              <Link
                key={n.href}
                href={n.href}
                prefetch={true}
                className={`relative rounded-full px-3.5 py-2 text-sm font-semibold transition-colors ${
                  active ? "text-brand-strong" : "text-muted hover:text-fg"
                }`}
              >
                {n.label}
                {active && (
                  <motion.span
                    layoutId="nav-pill"
                    className="absolute inset-0 -z-10 rounded-full bg-brand/12"
                    transition={{ type: "spring", stiffness: 420, damping: 34 }}
                  />
                )}
              </Link>
            );
          })}
        </nav>

        {/* actions */}
        <div className="flex items-center gap-2">
          <ThemeToggle />

          <button
            onClick={() => setOpen(true)}
            aria-label={`কার্ট, ${count} টি আইটেম`}
            className="relative grid h-10 w-10 place-items-center rounded-full border border-line bg-surface transition-colors hover:border-brand/50"
          >
            <ShoppingBag className="h-[18px] w-[18px]" />
            <AnimatePresence>
              {count > 0 && (
                <motion.span
                  key={count}
                  initial={{ scale: 0, y: -6 }}
                  animate={{ scale: 1, y: 0 }}
                  exit={{ scale: 0 }}
                  transition={{ type: "spring", stiffness: 520, damping: 20 }}
                  className="absolute -right-1 -top-1 grid h-5 min-w-5 place-items-center rounded-full bg-brand px-1 text-[10px] font-extrabold text-brand-fg"
                >
                  {count}
                </motion.span>
              )}
            </AnimatePresence>
          </button>

          {user ? (
            <Link
              href={isAdmin ? "/admin" : "/account"}
              className="btn btn-soft btn-sm hidden sm:inline-flex"
            >
              <LayoutDashboard className="h-4 w-4" />
              {isAdmin ? "Dashboard" : user.name.split(" ")[0]}
            </Link>
          ) : (
            <Link href="/login" className="btn btn-ghost btn-sm hidden sm:inline-flex">
              <LogIn className="h-4 w-4" />
              লগইন
            </Link>
          )}

          <button
            onClick={() => setMenuOpen((v) => !v)}
            aria-label="Menu"
            aria-expanded={menuOpen}
            className="grid h-10 w-10 place-items-center rounded-full border border-line bg-surface lg:hidden"
          >
            {menuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </div>

      {/* mobile menu */}
      <AnimatePresence>
        {menuOpen && (
          <motion.nav
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
            className="overflow-hidden border-t border-line bg-surface lg:hidden"
          >
            <div className="container-page flex flex-col gap-1 py-3">
              {NAV.map((n, i) => (
                <motion.div
                  key={n.href}
                  initial={{ x: -12, opacity: 0 }}
                  animate={{ x: 0, opacity: 1 }}
                  transition={{ delay: i * 0.05 }}
                >
                  <Link
                    href={n.href}
                    prefetch={true}
                    onClick={() => setMenuOpen(false)}
                    className={`block rounded-xl px-3 py-2.5 text-sm font-semibold ${
                      pathname === n.href ? "bg-brand/12 text-brand-strong" : "text-muted hover:bg-fg/5"
                    }`}
                  >
                    {n.label}
                  </Link>
                </motion.div>
              ))}
              <Link
                href={user ? (isAdmin ? "/admin" : "/account") : "/login"}
                onClick={() => setMenuOpen(false)}
                className="btn btn-primary btn-sm mt-2"
              >
                {user ? (isAdmin ? "Dashboard খুলুন" : "আমার অ্যাকাউন্ট") : "লগইন / রেজিস্টার"}
              </Link>
            </div>
          </motion.nav>
        )}
      </AnimatePresence>
    </header>
  );
}
