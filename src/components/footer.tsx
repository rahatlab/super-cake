import Link from "next/link";
import { Mail, MapPin, Phone } from "lucide-react";
import type { Settings } from "@/lib/types";
import { waLink } from "@/lib/utils";

export function Footer({ settings }: { settings: Settings }) {
  const year = new Date().getFullYear();

  return (
    <footer className="mt-20 border-t border-line bg-surface">
      <div className="container-page grid gap-10 py-12 md:grid-cols-4">
        <div className="md:col-span-2">
          <div className="flex items-center gap-2">
            <span className="grid h-9 w-9 place-items-center rounded-xl bg-gradient-to-br from-brand to-accent text-lg">
              🎂
            </span>
            <span className="font-display text-xl font-extrabold text-gradient">
              {settings.store_name}
            </span>
          </div>
          <p className="mt-3 max-w-md text-sm leading-relaxed text-muted">
            {settings.tagline} — প্রতিটি উদ্‌যাপনের জন্য তাজা, সুস্বাদু আর হাতে বানানো কেক।{" "}
            {settings.address}-এ ডেলিভারি।
          </p>

          <div className="mt-5 space-y-2 text-sm text-muted">
            <a
              href={waLink(settings.whatsapp_phone, `হ্যালো ${settings.store_name}!`)}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 hover:text-brand-strong"
            >
              <Phone className="h-4 w-4" /> {settings.phone}
            </a>
            <p className="flex items-center gap-2">
              <Mail className="h-4 w-4" /> {settings.email}
            </p>
            <p className="flex items-center gap-2">
              <MapPin className="h-4 w-4" /> {settings.address}
            </p>
          </div>
        </div>

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

        <div>
          <h3 className="mb-3 text-sm font-bold uppercase tracking-wider text-muted">পেমেন্ট</h3>
          <ul className="space-y-2 text-sm text-muted">
            {settings.cod_enabled && <li>💵 Cash on Delivery</li>}
            {settings.bkash_enabled && <li>📱 bKash (Send Money)</li>}
            <li>🚚 ডেলিভারি চার্জ ৳{settings.delivery_charge}</li>
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
          <p>Made with 🎂 in Bangladesh</p>
        </div>
      </div>
    </footer>
  );
}
