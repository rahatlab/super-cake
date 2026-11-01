import Link from "next/link";
import Image from "next/image";
import type { Metadata } from "next";
import { ArrowRight, CakeSlice, Clock, Headphones, ShieldCheck, Truck } from "lucide-react";
import { Suspense } from "react";
import { getStore } from "@/lib/store";
import { OCCASIONS, SITE } from "@/lib/constants";
import { waLink } from "@/lib/utils";
import { ldJson, productLd, breadcrumbLd } from "@/lib/seo";
import { Hero } from "@/components/home/hero";
import { OfferBanner } from "@/components/home/offer-banner";
import { Testimonials } from "@/components/home/testimonials";
import { CakeCard } from "@/components/cake-card";
import { Reveal } from "@/components/reveal";

export const revalidate = 300; // Revalidate every 5 minutes

export const metadata: Metadata = {
  title: `${SITE.name} — ${SITE.tagline}`,
  description: SITE.description,
  alternates: { canonical: "/" },
};

const HOW_IT_WORKS = [
  { step: "১", title: "Occasion বাছুন", desc: "Birthday, Anniversary, Occasion, Gift বা অন্যান্য", icon: CakeSlice },
  { step: "২", title: "Cake + Weight", desc: "পছন্দের cake, ½–৩ পাউন্ড আর message on cake", icon: ShieldCheck },
  { step: "৩", title: "Delivery ও Payment", desc: "তারিখ, ঠিকানা — COD অথবা bKash দিয়ে", icon: Truck },
];

const FEATURES = [
  { icon: Clock, title: "Scheduled Delivery", desc: "আপনার পছন্দের তারিখে ডেলিভারি" },
  { icon: ShieldCheck, title: "Fresh & Hygienic", desc: "প্রতিদিন তাজা ingredient, পরিচ্ছন্ন কিচেন" },
  { icon: Headphones, title: "WhatsApp Support", desc: "সরাসরি কথা বলুন, দ্রুত উত্তর" },
  { icon: Truck, title: "Track Your Order", desc: "অর্ডার আইডি দিয়ে লাইভ স্ট্যাটাস দেখুন" },
];

// Skeleton components for progressive loading
function FeaturedCakesSkeleton() {
  return (
    <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
      {Array.from({ length: 8 }).map((_, i) => (
        <div key={i} className="card overflow-hidden animate-pulse">
          <div className="skeleton aspect-square w-full" />
          <div className="p-4 space-y-3">
            <div className="skeleton h-4 w-3/4" />
            <div className="skeleton h-3 w-1/2" />
            <div className="skeleton h-8 w-full mt-3" />
          </div>
        </div>
      ))}
    </div>
  );
}

function TestimonialsSkeleton() {
  return (
    <div className="container-page py-14">
      <div className="skeleton h-8 w-48 mb-6" />
      <div className="grid gap-5 md:grid-cols-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="card p-6 animate-pulse">
            <div className="skeleton h-20 w-full mb-3" />
            <div className="skeleton h-4 w-full mb-2" />
            <div className="skeleton h-4 w-3/4" />
          </div>
        ))}
      </div>
    </div>
  );
}

// Separate async components for progressive loading
async function FeaturedCakes() {
  const store = getStore();
  const [cakes, ratings] = await Promise.all([
    store.listCakes(),
    store.getCakeRatings(),
  ]);

  const featured = cakes.filter((c) => c.is_featured).slice(0, 8);
  const shown = (featured.length ? featured : cakes).slice(0, 8);

  const ratingMap = new Map(ratings.map((r) => [r.cake_slug, r]));

  return (
    <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
      {shown.map((cake, i) => {
        const stat = ratingMap.get(cake.slug);
        return (
          <Reveal key={cake.id} delay={i * 0.05}>
            <CakeCard
              cake={cake}
              rating={stat?.average_rating}
              reviewCount={stat?.review_count ?? 0}
            />
          </Reveal>
        );
      })}
    </div>
  );
}

async function TestimonialsSection() {
  const store = getStore();
  const reviews = await store.listReviews({ approvedOnly: true });
  return <Testimonials reviews={reviews.slice(0, 6)} />;
}

async function BlogPreview() {
  const store = getStore();
  const posts = await store.listPosts({ publishedOnly: true });

  if (posts.length === 0) return null;

  return (
    <section className="container-page py-14">
      <Reveal className="mb-7 flex flex-wrap items-end justify-between gap-4">
        <div>
          <span className="badge bg-brand/12 text-brand-strong">Blog</span>
          <h2 className="mt-3 text-3xl font-extrabold">মিষ্টি খবর ও টিপস</h2>
        </div>
        <Link href="/blog" className="btn btn-ghost btn-sm group">
          সব পোস্ট <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
        </Link>
      </Reveal>

      <div className="grid gap-5 md:grid-cols-3">
        {posts.slice(0, 3).map((p, i) => (
          <Reveal key={p.id} delay={i * 0.08}>
            <Link href={`/blog/${p.slug}`} className="card group block h-full overflow-hidden">
              <div className="relative aspect-[16/9] overflow-hidden bg-brand/8">
                {p.cover_image && (
                  <Image
                    src={p.cover_image}
                    alt={p.title}
                    fill
                    sizes="(max-width: 768px) 100vw, 33vw"
                    className="object-cover transition-transform duration-500 group-hover:scale-105"
                  />
                )}
              </div>
              <div className="p-5">
                <h3 className="line-clamp-2 text-[15px] font-bold transition-colors group-hover:text-brand-strong">
                  {p.title}
                </h3>
                <p className="mt-2 line-clamp-2 text-[13px] text-muted">{p.excerpt}</p>
              </div>
            </Link>
          </Reveal>
        ))}
      </div>
    </section>
  );
}

export default async function HomePage() {
  const store = getStore();
  // Only fetch critical data for initial render
  const [settings, banners] = await Promise.all([
    store.getSettings(),
    store.listBanners({ activeOnly: true }),
  ]);

  // Calculate reviews stats for hero
  const reviews = await store.listReviews({ approvedOnly: true });
  const avgAll = reviews.length
    ? Math.round((reviews.reduce((s, r) => s + r.rating, 0) / reviews.length) * 10) / 10
    : 0;

  const wa = waLink(settings.whatsapp_phone, `হ্যালো ${settings.store_name}! আমি একটা কেক অর্ডার করতে চাই।`);

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: ldJson(breadcrumbLd([{ name: "হোম" }])),
        }}
      />

      {/* Critical content - loads immediately */}
      <OfferBanner banner={banners[0] ?? null} />
      <Hero whatsapp={wa} rating={avgAll} reviewCount={reviews.length} />

      {/* occasions */}
      <section className="container-page py-6">
        <Reveal>
          <div className="flex flex-wrap items-center justify-center gap-2.5">
            <span className="mr-1 text-xs font-bold uppercase tracking-wider text-muted">অনুসন্ধান:</span>
            {OCCASIONS.map((o) => (
              <Link key={o.value} href={`/cakes?occasion=${o.value}`} className="chip">
                <span aria-hidden>{o.emoji}</span> {o.label}
                <span className="font-normal text-muted">· {o.bn}</span>
              </Link>
            ))}
          </div>
        </Reveal>
      </section>

      {/* featured cakes - Progressive loading */}
      <section className="container-page py-12">
        <Reveal className="mb-7 flex flex-wrap items-end justify-between gap-4">
          <div>
            <span className="badge bg-brand/12 text-brand-strong">Best Sellers</span>
            <h2 className="mt-3 text-3xl font-extrabold sm:text-4xl">
              সবচেয়ে <span className="text-gradient">জনপ্রিয়</span> কেক
            </h2>
            <p className="mt-2 max-w-lg text-sm text-muted">
              প্রতিটি cake অর্ডারের পরে বানানো হয় — ওজন বেছে নিন ½ থেকে ৩ পাউন্ড পর্যন্ত।
            </p>
          </div>
          <Link href="/cakes" className="btn btn-ghost btn-sm group">
            সব কেক দেখুন <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
          </Link>
        </Reveal>

        <Suspense fallback={<FeaturedCakesSkeleton />}>
          <FeaturedCakes />
        </Suspense>
      </section>

      {/* how it works */}
      <section className="border-y border-line bg-surface py-14">
        <div className="container-page">
          <Reveal className="mx-auto max-w-2xl text-center">
            <span className="badge bg-brand/12 text-brand-strong">Simple Ordering</span>
            <h2 className="mt-4 text-3xl font-extrabold sm:text-4xl">
              মাত্র <span className="text-gradient">৩ ধাপে</span> অর্ডার
            </h2>
            <p className="mt-3 text-sm text-muted">
              কোনো জটিল ফর্ম নেই — কয়েক সেকেন্ডেই আপনার অর্ডার কনফার্ম
            </p>
          </Reveal>

          <div className="mt-10 grid gap-5 md:grid-cols-3">
            {HOW_IT_WORKS.map((h, i) => (
              <Reveal key={h.step} delay={i * 0.1}>
                <div className="card relative h-full p-6">
                  <span className="absolute right-5 top-4 font-display text-5xl font-extrabold text-brand/10">
                    {h.step}
                  </span>
                  <span className="grid h-11 w-11 place-items-center rounded-xl bg-brand/12 text-brand-strong">
                    <h.icon className="h-5 w-5" />
                  </span>
                  <h3 className="mt-4 text-lg font-bold">{h.title}</h3>
                  <p className="mt-1.5 text-sm leading-relaxed text-muted">{h.desc}</p>
                </div>
              </Reveal>
            ))}
          </div>

          <Reveal className="mt-8 text-center">
            <Link href="/order" className="btn btn-primary btn-lg">
              অর্ডার শুরু করুন <ArrowRight className="h-4 w-4" />
            </Link>
          </Reveal>
        </div>
      </section>

      {/* features */}
      <section className="container-page py-14">
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {FEATURES.map((f, i) => (
            <Reveal key={f.title} delay={i * 0.06}>
              <div className="card h-full p-5 transition-transform hover:-translate-y-1">
                <span className="grid h-10 w-10 place-items-center rounded-xl bg-accent/15 text-accent">
                  <f.icon className="h-5 w-5" />
                </span>
                <h3 className="mt-3 text-[15px] font-bold">{f.title}</h3>
                <p className="mt-1 text-[13px] leading-relaxed text-muted">{f.desc}</p>
              </div>
            </Reveal>
          ))}
        </div>
      </section>

      {/* custom cake CTA */}
      <section className="container-page pb-6">
        <Reveal>
          <div className="card relative overflow-hidden !border-brand/25 bg-gradient-to-br from-brand/12 via-transparent to-accent/12 p-7 sm:p-10">
            <div className="relative grid items-center gap-6 md:grid-cols-[1.4fr_1fr]">
              <div>
                <span className="badge bg-brand text-brand-fg">🎨 Custom Order</span>
                <h2 className="mt-4 text-2xl font-extrabold sm:text-3xl">
                  নিজের আইডিয়া দিন — <span className="text-gradient">আমরা বানিয়ে দিচ্ছি</span>
                </h2>
                <p className="mt-3 max-w-xl text-sm leading-relaxed text-muted">
                  ছবি রেফারেন্স, রঙ, flavor, message on cake, budget — সব কিছু এক জায়গায় দিন। আমাদের chef
                  আপনার design মেনে কেক বানাবে।
                </p>
                <div className="mt-6 flex flex-wrap gap-3">
                  <Link href="/custom-order" className="btn btn-primary">
                    Custom Cake অর্ডার করুন
                  </Link>
                  <a href={wa} target="_blank" rel="noopener noreferrer" className="btn btn-ghost">
                    💬 Design আলোচনা করুন
                  </a>
                </div>
              </div>

              <div className="relative mx-auto aspect-[4/3] w-full max-w-xs">
                <Image
                  src="/cakes/kids-cartoon-1.svg"
                  alt="Custom cartoon themed cake"
                  fill
                  sizes="320px"
                  className="rounded-2xl object-cover shadow-lift"
                />
              </div>
            </div>
          </div>
        </Reveal>
      </section>

      {/* Testimonials - Progressive loading */}
      <Suspense fallback={<TestimonialsSkeleton />}>
        <TestimonialsSection />
      </Suspense>

      {/* Blog preview - Progressive loading (lowest priority) */}
      <Suspense fallback={null}>
        <BlogPreview />
      </Suspense>

      {/* SEO structured data */}
      {reviews.length > 0 && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: ldJson({
              "@context": "https://schema.org",
              "@type": "AggregateRating",
              itemReviewed: { "@type": "LocalBusiness", name: settings.store_name },
              ratingValue: avgAll,
              reviewCount: reviews.length,
              bestRating: 5,
              worstRating: 1,
            }),
          }}
        />
      )}
    </>
  );
}
