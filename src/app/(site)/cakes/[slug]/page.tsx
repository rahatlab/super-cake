import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { MapPin, ShieldCheck, Truck } from "lucide-react";
import { getStore } from "@/lib/store";
import { OCCASIONS, SITE } from "@/lib/constants";
import { ldJson, productLd, breadcrumbLd } from "@/lib/seo";
import { CakeGallery } from "@/components/cake-gallery";
import { CakePurchase } from "@/components/cake-purchase";
import { CakeCard } from "@/components/cake-card";
import { Stars } from "@/components/star-rating";
import { formatBDT, formatDateTime, waLink } from "@/lib/utils";

interface Ctx {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: Ctx): Promise<Metadata> {
  const { slug } = await params;
  const cake = await getStore().getCakeBySlug(slug);
  if (!cake) return { title: "কেক পাওয়া যায়নি" };

  const desc = `${cake.name} — ${cake.description} ${formatBDT(cake.base_price)} থেকে শুরু, ½–৩ পাউন্ড। ${SITE.name} থেকে অর্ডার করুন।`;

  return {
    title: `${cake.name} Price in Dhaka`,
    description: desc,
    alternates: { canonical: `/cakes/${cake.slug}` },
    openGraph: {
      title: cake.name,
      description: desc,
      images: cake.image_urls[0] ? [{ url: cake.image_urls[0] }] : undefined,
      type: "website",
      url: `/cakes/${cake.slug}`,
    },
    twitter: { card: "summary_large_image", title: cake.name, description: desc },
  };
}

export default async function CakeDetailPage({ params }: Ctx) {
  const { slug } = await params;
  const store = getStore();

  const cake = await store.getCakeBySlug(slug);
  if (!cake || !cake.is_active) notFound();

  const [allCakes, reviews, settings] = await Promise.all([
    store.listCakes(),
    store.listReviews({ approvedOnly: true }),
    store.getSettings(),
  ]);

  const cakeReviews = reviews.filter((r) => r.cake_slug === cake.slug);
  const avg = cakeReviews.length
    ? cakeReviews.reduce((s, r) => s + r.rating, 0) / cakeReviews.length
    : 0;

  const related = allCakes
    .filter((c) => c.id !== cake.id && c.is_active)
    .map((c) => ({
      cake: c,
      overlap: c.occasions.filter((o) => cake.occasions.includes(o)).length,
      sameCategory: c.category === cake.category ? 1 : 0,
    }))
    .sort((a, b) => b.overlap - a.overlap || b.sameCategory - a.sameCategory)
    .slice(0, 4)
    .map((x) => x.cake);

  const wa = waLink(
    settings.whatsapp_phone,
    `হ্যালো ${settings.store_name}! আমি "${cake.name}" সম্পর্কে জানতে চাই।`,
  );

  return (
    <div className="container-page py-8">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: ldJson(productLd(cake, reviews, settings)) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: ldJson(
            breadcrumbLd([
              { name: "হোম", item: "/" },
              { name: "কেক সমূহ", item: "/cakes" },
              { name: cake.name },
            ]),
          ),
        }}
      />

      <nav className="mb-5 flex flex-wrap items-center gap-1.5 text-xs text-muted">
        <Link href="/" className="hover:text-brand-strong">হোম</Link>
        <span>/</span>
        <Link href="/cakes" className="hover:text-brand-strong">কেক সমূহ</Link>
        <span>/</span>
        <span className="font-semibold text-fg">{cake.name}</span>
      </nav>

      <div className="grid gap-8 lg:grid-cols-2">
        <div className="lg:sticky lg:top-24 lg:self-start">
          <CakeGallery images={cake.image_urls} name={cake.name} />
        </div>

        <div>
          <div className="flex flex-wrap items-center gap-2">
            {cake.is_featured && <span className="badge bg-brand text-brand-fg">⭐ Featured</span>}
            <span className="badge bg-fg/6 text-muted">{cake.category}</span>
            {cake.stock <= 0 ? (
              <span className="badge bg-danger text-white">Sold Out</span>
            ) : cake.stock <= 3 ? (
              <span className="badge bg-warning text-black">শুধু {cake.stock} বাকি</span>
            ) : (
              <span className="badge bg-success/15 text-success">✓ স্টকে আছে</span>
            )}
          </div>

          <h1 className="mt-3 text-3xl font-extrabold leading-tight sm:text-4xl">{cake.name}</h1>

          <p className="mt-1 text-sm text-muted">
            {cake.flavor} · {cake.category}
          </p>

          {cakeReviews.length > 0 && (
            <div className="mt-3 flex items-center gap-2">
              <Stars value={avg} size={16} />
              <span className="text-sm font-semibold">{avg.toFixed(1)}</span>
              <a href="#reviews" className="text-sm text-muted underline decoration-dotted hover:text-brand-strong">
                {cakeReviews.length} টি রিভিউ
              </a>
            </div>
          )}

          <p className="prose-bn mt-4 text-[15px] leading-relaxed text-muted">{cake.description}</p>

          {cake.occasions.length > 0 && (
            <div className="mt-4 flex flex-wrap gap-2">
              {cake.occasions.map((o) => {
                const meta = OCCASIONS.find((x) => x.value === o);
                if (!meta) return null;
                return (
                  <Link key={o} href={`/cakes?occasion=${o}`} className="chip !text-[13px]">
                    <span aria-hidden>{meta.emoji}</span> {meta.label}
                  </Link>
                );
              })}
            </div>
          )}

          <div className="mt-6">
            <CakePurchase
              cake={cake}
              whatsappPhone={settings.whatsapp_phone}
              storeName={settings.store_name}
              deliveryCharge={settings.delivery_charge}
              freeDeliveryEnabled={settings.free_delivery_enabled}
              freeDeliveryMin={settings.free_delivery_min}
            />
          </div>

          <div className="mt-6 grid grid-cols-3 gap-2 text-center">
            {[
              { icon: Truck, t: "Fast Delivery", s: "ঢাকায় দ্রুত" },
              { icon: ShieldCheck, t: "Fresh Made", s: "অর্ডারের পরে" },
              { icon: MapPin, t: "Track Order", s: "লাইভ স্ট্যাটাস" },
            ].map((f) => (
              <div key={f.t} className="rounded-xl border border-line bg-surface p-3">
                <f.icon className="mx-auto h-4 w-4 text-brand" />
                <p className="mt-1.5 text-[11px] font-bold">{f.t}</p>
                <p className="text-[10px] text-muted">{f.s}</p>
              </div>
            ))}
          </div>

          <a href={wa} className="btn btn-soft btn-block mt-4">
            💬 প্রশ্ন করুন WhatsApp এ
          </a>
        </div>
      </div>

      {/* reviews */}
      <section id="reviews" className="mt-16 scroll-mt-24">
        <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 className="text-2xl font-extrabold">Customer Review</h2>
            <p className="mt-1 text-sm text-muted">
              ডেলিভারি সম্পন্ন হওয়ার পর customer রা যা বলেছেন
            </p>
          </div>
          {cakeReviews.length > 0 && (
            <div className="rounded-2xl border border-line bg-surface px-5 py-3 text-center">
              <p className="font-display text-3xl font-extrabold text-brand-strong">{avg.toFixed(1)}</p>
              <Stars value={avg} size={14} />
              <p className="mt-1 text-[11px] text-muted">{cakeReviews.length} রিভিউ</p>
            </div>
          )}
        </div>

        {cakeReviews.length === 0 ? (
          <div className="card px-6 py-10 text-center">
            <span className="text-4xl">🌟</span>
            <p className="mt-2 font-semibold">এখনো কোনো রিভিউ পাওয়া যায়নি</p>
            <p className="mt-1 text-sm text-muted">প্রথম customer হয়ে এই cake টি অর্ডার করুন!</p>
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2">
            {cakeReviews.map((r) => (
              <article key={r.id} className="card p-5">
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2.5">
                    <span className="grid h-9 w-9 place-items-center rounded-full bg-gradient-to-br from-brand to-accent text-sm font-extrabold text-white">
                      {r.customer_name.slice(0, 1)}
                    </span>
                    <div>
                      <p className="text-sm font-bold">{r.customer_name}</p>
                      <p className="text-[11px] text-muted">{formatDateTime(r.created_at)}</p>
                    </div>
                  </div>
                  <Stars value={r.rating} size={14} />
                </div>
                <p className="mt-3 text-sm leading-relaxed text-muted">{r.comment}</p>
              </article>
            ))}
          </div>
        )}
      </section>

      {/* related */}
      {related.length > 0 && (
        <section className="mt-16">
          <h2 className="mb-6 text-2xl font-extrabold">
            এই কেকের সাথে <span className="text-gradient">দেখুন</span>
          </h2>
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {related.map((c) => (
              <CakeCard key={c.id} cake={c} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
