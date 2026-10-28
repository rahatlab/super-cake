import type { Metadata } from "next";
import Link from "next/link";
import { randomUUID } from "crypto";
import { getStore } from "@/lib/store";
import { OrderWizard } from "@/components/order/order-wizard";
import { breadcrumbLd, ldJson } from "@/lib/seo";
import { MIN_DELIVERY_LEAD_DAYS } from "@/lib/constants";
import { dhakaDatePlus } from "@/lib/utils";

export const metadata: Metadata = {
  title: "অর্ডার করুন",
  description: "মাত্র ৪ ধাপে কেক অর্ডার করুন — occasion, cake, delivery ও payment। Cash on Delivery ও bKash সাপোর্টেড।",
  alternates: { canonical: "/order" },
  robots: { index: false },
};

export default async function OrderPage() {
  const settings = await getStore().getSettings();

  return (
    <div className="container-page py-8">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: ldJson(
            breadcrumbLd([
              { name: "হোম", item: "/" },
              { name: "অর্ডার", item: "/order" },
            ]),
          ),
        }}
      />

      <header className="mb-7">
        <nav className="mb-3 flex flex-wrap items-center gap-1.5 text-xs text-muted">
          <Link href="/" className="hover:text-brand-strong">হোম</Link>
          <span>/</span>
          <Link href="/cakes" className="hover:text-brand-strong">কেক</Link>
          <span>/</span>
          <span className="font-semibold text-fg">অর্ডার</span>
        </nav>

        <h1 className="text-3xl font-extrabold sm:text-4xl">
          অর্ডার <span className="text-gradient">সম্পন্ন করুন</span>
        </h1>
        <p className="mt-2 max-w-2xl text-sm text-muted">
          ৪ টি সহজ ধাপ — কোনো জটিল ফর্ম নেই। প্রতিটি ধাপে আপনি আগে-পরে যেতে পারবেন।
        </p>
      </header>

      <OrderWizard
        settings={settings}
        idempotencyKey={randomUUID()}
        minDeliveryDate={dhakaDatePlus(MIN_DELIVERY_LEAD_DAYS)}
        defaultDeliveryDate={dhakaDatePlus(MIN_DELIVERY_LEAD_DAYS)}
      />
    </div>
  );
}
