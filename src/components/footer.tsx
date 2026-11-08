"use client";

import Link from "next/link";
import {
  Location01,
  Mail01,
  Phone,
  Facebook,
  Instagram,
  MoneyBag01,
  DeliveryTruck01,
} from "@animateicons/react/huge";
import type { Settings } from "@/lib/types";
import { waLink } from "@/lib/utils";
import { useAnimIcon } from "@/components/ui/use-anim-icon";
import { AnimIcon } from "@/components/ui/anim-icon";

export function Footer({ settings }: { settings: Settings }) {
  const year = new Date().getFullYear();
  const phoneIcon = useAnimIcon();
  const mailIcon = useAnimIcon();
  const locationIcon = useAnimIcon();
  const fbIcon = useAnimIcon();
  const igIcon = useAnimIcon();
  const codIcon = useAnimIcon();
  const bkashIcon = useAnimIcon();
  const deliveryIcon = useAnimIcon();

  return (
    <footer className="mt-20 border-t border-line bg-surface">
      <div className="container-page grid gap-10 py-12 md:grid-cols-4">
        {/* Contact */}
        <div className="md:col-span-2">
          <div className="flex items-center gap-2">
            <span className="grid h-9 w-9 place-items-center rounded-xl bg-gradient-to-br from-brand to-accent text-lg">
              <AnimIcon name="cake" className="h-5 w-5" />
            </span>
            <span className="font-display text-xl font-extrabold text-gradient">
              {settings.store_name}
            </span>
          </div>
          <p className="mt-3 max-w-md text-sm leading-relaxed text-muted">
            {settings.tagline} — প্রতিটি উদ্‌যাপনের জন্য তাজা, সুস্বাদু আর হাতে বানানো কেক।{" "}
            {settings.address}-এ ডেলিভারি।
          </p>

          <div className="mt-5 flex flex-col gap-2 text-sm text-muted">
            {/* Phone */}
            <a
              href={waLink(settings.whatsapp_phone, `হ্যালো ${settings.store_name}!`)}
              target="_blank"
              rel="noopener noreferrer"
              className="flex w-fit items-center gap-2 hover:text-brand-strong"
              onMouseEnter={() => phoneIcon.current?.startAnimation()}
              onMouseLeave={() => phoneIcon.current?.stopAnimation()}
            >
              <Phone ref={phoneIcon} className="h-4 w-4 shrink-0" /> {settings.phone}
            </a>
            {/* Email */}
            <a
              href={`mailto:${settings.email}`}
              className="flex w-fit items-center gap-2 hover:text-brand-strong"
              onMouseEnter={() => mailIcon.current?.startAnimation()}
              onMouseLeave={() => mailIcon.current?.stopAnimation()}
            >
              <Mail01 ref={mailIcon} className="h-4 w-4 shrink-0" /> {settings.email}
            </a>
            {/* Address */}
            <span
              className="flex w-fit items-center gap-2"
              onMouseEnter={() => locationIcon.current?.startAnimation()}
              onMouseLeave={() => locationIcon.current?.stopAnimation()}
            >
              <Location01 ref={locationIcon} className="h-4 w-4 shrink-0" /> {settings.address}
            </span>
            {/* Facebook */}
            {settings.facebook && (
              <a
                href={settings.facebook}
                target="_blank"
                rel="noopener noreferrer"
                className="flex w-fit items-center gap-2 hover:text-brand-strong"
                onMouseEnter={() => fbIcon.current?.startAnimation()}
                onMouseLeave={() => fbIcon.current?.stopAnimation()}
              >
                <Facebook ref={fbIcon} className="h-4 w-4 shrink-0" /> Facebook Page
              </a>
            )}
            {/* Instagram */}
            {settings.instagram && (
              <a
                href={settings.instagram}
                target="_blank"
                rel="noopener noreferrer"
                className="flex w-fit items-center gap-2 hover:text-brand-strong"
                onMouseEnter={() => igIcon.current?.startAnimation()}
                onMouseLeave={() => igIcon.current?.stopAnimation()}
              >
                <Instagram ref={igIcon} className="h-4 w-4 shrink-0" /> Instagram
              </a>
            )}
          </div>
        </div>

        {/* Quick links */}
        <div>
          <h3 className="mb-3 text-sm font-bold uppercase tracking-wider text-muted">দ্রুত লিংক</h3>
          <ul className="space-y-2 text-sm">
            {[
              { href: "/cakes", label: "কেক সমূহ" },
              { href: "/custom-order", label: "Custom Cake অর্ডার" },
              { href: "/track", label: "অর্ডার ট্র্যাক করুন" },
              { href: "/blog", label: "ব্লগ" },
              { href: "/login", label: "লগইন" },
              { href: "/privacy", label: "Privacy Policy" },
              { href: "/terms", label: "Terms of Service" },
              { href: "/data-deletion", label: "Data Deletion" },
            ].map((l) => (
              <li key={l.href}>
                <Link href={l.href} className="text-muted transition-colors hover:text-brand-strong">
                  {l.label}
                </Link>
              </li>
            ))}
          </ul>
        </div>

        {/* Payment */}
        <div>
          <h3 className="mb-3 text-sm font-bold uppercase tracking-wider text-muted">পেমেন্ট</h3>
          <ul className="flex flex-col gap-2 text-sm text-muted">
            {settings.cod_enabled && (
              <li
                className="flex w-fit items-center gap-2 transition-colors hover:text-brand-strong"
                onMouseEnter={() => codIcon.current?.startAnimation()}
                onMouseLeave={() => codIcon.current?.stopAnimation()}
              >
                <MoneyBag01 ref={codIcon} className="h-4 w-4 shrink-0" />
                Cash on Delivery
              </li>
            )}
            {settings.bkash_enabled && (
              <li
                className="flex w-fit items-center gap-2 transition-colors hover:text-brand-strong"
                onMouseEnter={() => bkashIcon.current?.startAnimation()}
                onMouseLeave={() => bkashIcon.current?.stopAnimation()}
              >
                <Phone ref={bkashIcon} className="h-4 w-4 shrink-0" /> bKash (Send Money)
              </li>
            )}
            <li
              className="flex w-fit items-center gap-2 transition-colors hover:text-brand-strong"
              onMouseEnter={() => deliveryIcon.current?.startAnimation()}
              onMouseLeave={() => deliveryIcon.current?.stopAnimation()}
            >
              <DeliveryTruck01 ref={deliveryIcon} className="h-4 w-4 shrink-0" /> ডেলিভারি চার্জ ৳{settings.delivery_charge}
            </li>
            {settings.free_delivery_enabled && settings.free_delivery_min > 0 && (
              <li className="pt-1 text-xs">
                ৳{settings.free_delivery_min}+ অর্ডারে ফ্রি ডেলিভারি
              </li>
            )}
          </ul>
        </div>
      </div>

      <div className="border-t border-line">
        <div className="container-page flex flex-col items-center justify-between gap-2 py-5 text-xs text-muted sm:flex-row">
          <p>
            © {year} {settings.store_name}. সর্বস্বত্ব সংরক্ষিত।
          </p>
          <p>Made with <AnimIcon name="cake" className="h-4 w-4 shrink-0" /> in Bangladesh</p>
        </div>
      </div>
    </footer>
  );
}
