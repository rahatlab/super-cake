import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { randomUUID } from "crypto";
import { getStore } from "@/lib/store";
import { breadcrumbLd, ldJson } from "@/lib/seo";
import { MIN_DELIVERY_LEAD_DAYS } from "@/lib/constants";
import { dhakaDatePlus } from "@/lib/utils";
import { CustomOrderForm } from "@/components/order/custom-order-form";

export const metadata: Metadata = {
  title: "Custom Cake Order",
  description:
    "নিজের আইডিয়া অনুযায়ী custom cake অর্ডার করুন — flavour, ওজন, message on cake, design reference ও budget দিন। Super Cake বানিয়ে দিচ্ছে।",
  alternates: { canonical: "/custom-order" },
};

export default async function CustomOrderPage() {
  const store = getStore();
  const [settings, cakes] = await Promise.all([store.getSettings(), store.listCakes()]);
  const customCake = cakes.find((c) => c.is_custom_available) ?? cakes[0] ?? null;
  if (!customCake) notFound();

  return (
    <div className="container-page py-8">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: ldJson(
            breadcrumbLd([
              { name: "হোম", item: "/" },
              { name: "Custom Cake", item: "/custom-order" },
            ]),
          ),
        }}
      />

      <header className="mb-7 max-w-2xl">
        <nav className="mb-3 flex flex-wrap items-center gap-1.5 text-xs text-muted">
          <Link href="/" className="hover:text-brand-strong">হোম</Link>
          <span>/</span>
          <span className="font-semibold text-fg">Custom Cake</span>
        </nav>

        <span className="badge bg-brand/12 text-brand-strong">🎨 Custom Order</span>
        <h1 className="mt-3 text-3xl font-extrabold sm:text-4xl">
          আপনার <span className="text-gradient">ডিজাইনে</span> কেক বানান
        </h1>
        <p className="mt-3 text-sm leading-relaxed text-muted">
          ছবির reference, flavour, ওজন, কেকের উপরের লেখা ও budget — সব কিছু এক ফর্মে। অর্ডার দেওয়ার
          পরে আমাদের chef ২৪ ঘণ্টার মধ্যে WhatsApp এ design confirm করবে।
        </p>
      </header>

      <CustomOrderForm
        settings={settings}
        idempotencyKey={randomUUID()}
        minDeliveryDate={dhakaDatePlus(MIN_DELIVERY_LEAD_DAYS)}
        defaultDeliveryDate={dhakaDatePlus(MIN_DELIVERY_LEAD_DAYS)}
        cake={{
          id: customCake.id,
          name: customCake.name,
          base_price: customCake.base_price,
          image: customCake.image_urls[0] ?? "/cakes/custom-placeholder.svg",
          sizes: (customCake.sizes ?? []).map((s) => ({
            weight: s.weight,
            price: s.price,
            is_available: s.is_available,
          })),
        }}
      />
    </div>
  );
}
