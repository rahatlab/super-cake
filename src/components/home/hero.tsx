"use client";

import Link from "next/link";
import Image from "next/image";
import { ArrowRight02, Message01, Sparkles } from "@animateicons/react/huge";
import { useAnimIcon } from "@/components/ui/use-anim-icon";

const HEADLINE = ["প্রতিটি", "উদ্‌যাপনে", "মিষ্টি", "হোক"];

const SPRINKLES = Array.from({ length: 18 }, (_, i) => ({
  id: i,
  left: (i * 5.6 + 3) % 100,
  delay: (i % 7) * 0.9,
  duration: 7 + ((i * 3) % 6),
  size: 6 + ((i * 5) % 8),
  color: ["#ff8fab", "#ffd166", "#8ee3ef", "#c9a7ff", "#a7f3d0"][i % 5],
}));

/**
 * Above-the-fold hero — CSS only.
 *
 * It used to be a client component driven by framer-motion (18 animated
 * sprinkles + spring transitions). That made the LCP element wait for hydration
 * and shipped ~140 kB of animation runtime for decoration. The same look is now
 * plain CSS keyframes (`animate-sprinkle` / `animate-float` /
 * `animate-rise-up`) and the component renders on the server.
 */
export function Hero({
  whatsapp,
  rating = 0,
  reviewCount = 0,
}: {
  whatsapp: string;
  rating?: number;
  reviewCount?: number;
}) {
  // AnimateIcons refs for hero action icons
  const orderIcon = useAnimIcon();
  const whatsappIcon = useAnimIcon();
  return (
    <section className="relative overflow-hidden">
      {/* animated sprinkles */}
      <div aria-hidden className="pointer-events-none absolute inset-0 hidden sm:block">
        {SPRINKLES.map((s) => (
          <span
            key={s.id}
            className="animate-sprinkle absolute top-0 rounded-full opacity-0"
            style={{
              left: `${s.left}%`,
              width: s.size,
              height: s.size,
              background: s.color,
              animationDelay: `${s.delay}s`,
              animationDuration: `${s.duration}s`,
            }}
          />
        ))}
      </div>

      {/* glow */}
      <div
        aria-hidden
        className="pointer-events-none absolute -left-32 -top-40 h-[26rem] w-[26rem] rounded-full blur-3xl"
        style={{ background: "radial-gradient(circle, hsl(var(--brand) / 0.30), transparent 70%)" }}
      />
      <div
        aria-hidden
        className="pointer-events-none absolute -right-24 top-24 h-[22rem] w-[22rem] rounded-full blur-3xl"
        style={{ background: "radial-gradient(circle, hsl(var(--accent) / 0.28), transparent 70%)" }}
      />

      <div className="container-page relative grid items-center gap-10 py-14 md:py-20 lg:grid-cols-[1.05fr_0.95fr]">
        {/* copy */}
        <div>
          <div className="mb-5 inline-flex animate-rise-up items-center gap-2 rounded-full border border-brand/30 bg-brand/10 px-3.5 py-1.5 text-[13px] font-semibold text-brand-strong">
            <Sparkles className="h-3.5 w-3.5" /> হাতে বানানো · তাজা · অর্ডার করার সহজ উপায়
          </div>

          <h1 className="font-display text-4xl font-extrabold leading-[1.12] sm:text-5xl lg:text-6xl">
            {HEADLINE.map((word, i) => (
              <span
                key={word}
                className="mr-3 inline-block animate-rise-up"
                style={{ animationDelay: `${0.12 * i}s` }}
              >
                {i === HEADLINE.length - 1 ? <span className="text-gradient">{word}</span> : word}
              </span>
            ))}
          </h1>

          <p
            className="mt-5 max-w-xl animate-rise-up text-[15px] leading-relaxed text-muted sm:text-base"
            style={{ animationDelay: "0.55s" }}
          >
            Birthday, Anniversary, Occasion কিংবা Gift — ৩ ধাপে অর্ডার করুন। Cash on Delivery অথবা
            bKash, সাথে আপনার পছন্দের flavour আর message on cake।
          </p>

          <div
            className="mt-7 flex animate-rise-up flex-wrap items-center gap-3"
            style={{ animationDelay: "0.68s" }}
          >
            <Link href="/cakes" className="btn btn-primary btn-lg group" onMouseEnter={() => orderIcon.current?.startAnimation()} onMouseLeave={() => orderIcon.current?.stopAnimation()}>
              এখনই অর্ডার করুন
              <ArrowRight02 ref={orderIcon} className="h-4 w-4 transition-transform group-hover:translate-x-1" />
            </Link>
            <Link href="/custom-order" className="btn btn-ghost btn-lg">
              🎨 Custom Cake বানান
            </Link>
            <a
              href={whatsapp}
              target="_blank"
              rel="noopener noreferrer"
              className="btn btn-soft btn-lg"
              onMouseEnter={() => whatsappIcon.current?.startAnimation()}
              onMouseLeave={() => whatsappIcon.current?.stopAnimation()}
            >
              <Message01 ref={whatsappIcon} className="h-4 w-4" /> WhatsApp
            </a>
          </div>

          {/* stats */}
          <dl
            className="mt-9 grid max-w-lg animate-rise-up grid-cols-3 gap-4 border-t border-line pt-6"
            style={{ animationDelay: "0.9s" }}
          >
            {[
              { k: "৩ ধাপ", v: "সহজ অর্ডার" },
              { k: "২ দিন", v: "আগে অর্ডার করুন" },
              { k: "WhatsApp", v: "সরাসরি সাপোর্ট" },
            ].map((s) => (
              <div key={s.v}>
                <dt className="font-display text-xl font-extrabold text-brand-strong sm:text-2xl">{s.k}</dt>
                <dd className="mt-0.5 text-[11px] text-muted sm:text-xs">{s.v}</dd>
              </div>
            ))}
          </dl>
        </div>

        {/* visual */}
        <div
          className="relative mx-auto w-full max-w-md animate-rise-up"
          style={{ animationDelay: "0.2s" }}
        >
          <div className="relative aspect-square">
            <div className="absolute inset-0 rounded-[2.5rem] bg-gradient-to-br from-brand/35 via-accent/25 to-brand/10 blur-2xl" />
            <div className="card absolute inset-0 overflow-hidden !rounded-[2.5rem]">
              <Image
                src="/cakes/chocolate-truffle-1.svg"
                alt="Super Cake signature chocolate truffle cake"
                fill
                priority
                sizes="(max-width: 1024px) 90vw, 440px"
                className="object-cover"
              />
            </div>

            {/* floating badges */}
            <div
              className="card absolute -left-4 top-6 flex animate-float items-center gap-2 px-3 py-2 sm:-left-8"
              style={{ animationDelay: "0.4s" }}
            >
              <span className="text-lg">🎂</span>
              <div className="leading-tight">
                <p className="text-[11px] font-bold">Custom Design</p>
                <p className="text-[10px] text-muted">আপনার আইডিয়া</p>
              </div>
            </div>

            <div
              className="card absolute -right-3 bottom-10 flex animate-float items-center gap-2 px-3 py-2 sm:-right-6"
              style={{ animationDelay: "1s", animationDuration: "5s" }}
            >
              <span className="text-lg">🚚</span>
              <div className="leading-tight">
                <p className="text-[11px] font-bold">Scheduled</p>
                <p className="text-[10px] text-muted">আপনার তারিখে ডেলিভারি</p>
              </div>
            </div>

            <div
              className="absolute bottom-4 left-1/2 -translate-x-1/2 animate-float rounded-full bg-surface px-4 py-2 text-xs font-bold shadow-lift"
              style={{ animationDuration: "7s" }}
            >
              {reviewCount > 0
                ? `⭐ ${rating.toFixed(1)}/৫ · ${reviewCount} টি রিভিউ`
                : "🎂 Freshly Baked · Made to Order"}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
