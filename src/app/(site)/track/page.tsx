import type { Metadata } from "next";
import Link from "next/link";
import { getStore } from "@/lib/store";
import { breadcrumbLd, ldJson } from "@/lib/seo";
import { TrackPanel } from "@/components/track/track-panel";

export const metadata: Metadata = {
  title: "অর্ডার ট্র্যাক করুন",
  description:
    "অর্ডার আইডি ও ফোন নম্বর দিয়ে আপনার Super Cake অর্ডারের লাইভ স্ট্যাটাস দেখুন — pending, baking, out for delivery ও delivered।",
  alternates: { canonical: "/track" },
};

export default async function TrackPage({
  searchParams,
}: {
  searchParams: Promise<{ no?: string; phone?: string }>;
}) {
  const sp = await searchParams;
  const settings = await getStore().getSettings();

  return (
    <div className="container-page py-10">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: ldJson(
            breadcrumbLd([
              { name: "হোম", item: "/" },
              { name: "অর্ডার ট্র্যাক", item: "/track" },
            ]),
          ),
        }}
      />

      <header className="mx-auto mb-8 max-w-3xl text-center">
        <span className="badge bg-brand/12 text-brand-strong">📦 Live Tracking</span>
        <h1 className="mt-4 text-3xl font-extrabold sm:text-4xl">
          আপনার অর্ডার <span className="text-gradient">কোথায়</span>?
        </h1>
        <p className="mx-auto mt-3 max-w-xl text-sm text-muted">
          অর্ডার আইডি (যেমন <code className="rounded bg-fg/8 px-1.5 py-0.5 text-xs">SC-261026-1234</code>) এবং
          অর্ডারে ব্যবহৃত ফোন নম্বর দিন — সাথে সাথে স্ট্যাটাস দেখুন।
        </p>
      </header>

      <TrackPanel
        initialNo={sp.no}
        phone={sp.phone}
        storeName={settings.store_name}
        whatsappPhone={settings.whatsapp_phone}
      />

      <p className="mt-10 text-center text-sm text-muted">
        অর্ডার আইডি খুঁজে পাচ্ছেন না?{" "}
        <a
          href={`https://wa.me/${settings.whatsapp_phone.replace(/\D/g, "")}`}
          target="_blank"
          rel="noopener noreferrer"
          className="font-semibold text-brand-strong underline"
        >
          WhatsApp এ জিজ্ঞেস করুন
        </a>{" "}
        অথবা <Link href="/cakes" className="font-semibold text-brand-strong underline">নতুন কেক নিন</Link>
      </p>
    </div>
  );
}
