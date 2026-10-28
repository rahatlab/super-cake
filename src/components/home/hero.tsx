"use client";

import Link from "next/link";
import Image from "next/image";
import { motion, useReducedMotion } from "framer-motion";
import { ArrowRight, MessageCircle, Sparkles } from "lucide-react";

const HEADLINE = ["প্রতিটি", "উদ্‌যাপনে", "মিষ্টি", "হোক"];

const SPRINKLES = Array.from({ length: 18 }, (_, i) => ({
  id: i,
  left: (i * 5.6 + 3) % 100,
  delay: (i % 7) * 0.9,
  duration: 7 + ((i * 3) % 6),
  size: 6 + ((i * 5) % 8),
  color: ["#ff8fab", "#ffd166", "#8ee3ef", "#c9a7ff", "#a7f3d0"][i % 5],
}));

export function Hero({
  whatsapp,
  rating = 0,
  reviewCount = 0,
}: {
  whatsapp: string;
  rating?: number;
  reviewCount?: number;
}) {
  const reduce = useReducedMotion();

  return (
    <section className="relative overflow-hidden">
      {/* animated sprinkles */}
      {!reduce && (
        <div aria-hidden className="pointer-events-none absolute inset-0">
          {SPRINKLES.map((s) => (
            <motion.span
              key={s.id}
              className="absolute top-0 rounded-full"
              style={{ left: `${s.left}%`, width: s.size, height: s.size, background: s.color }}
              initial={{ y: -40, opacity: 0, rotate: 0 }}
              animate={{ y: "105vh", opacity: [0, 1, 1, 0], rotate: 360 }}
              transition={{ duration: s.duration, delay: s.delay, repeat: Infinity, ease: "linear" }}
            />
          ))}
        </div>
      )}

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
          <motion.div
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="mb-5 inline-flex items-center gap-2 rounded-full border border-brand/30 bg-brand/10 px-3.5 py-1.5 text-[13px] font-semibold text-brand-strong"
          >
            <Sparkles className="h-3.5 w-3.5" /> হাতে বানানো · তাজা · অর্ডার করার সহজ উপায়
          </motion.div>

          <h1 className="font-display text-4xl font-extrabold leading-[1.12] sm:text-5xl lg:text-6xl">
            {HEADLINE.map((word, i) => (
              <motion.span
                key={word}
                className="mr-3 inline-block"
                initial={{ opacity: 0, y: 26, rotate: -4 }}
                animate={{ opacity: 1, y: 0, rotate: 0 }}
                transition={{ delay: 0.12 * i, type: "spring", stiffness: 130, damping: 15 }}
              >
                {i === HEADLINE.length - 1 ? <span className="text-gradient">{word}</span> : word}
              </motion.span>
            ))}
          </h1>

          <motion.p
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.55 }}
            className="mt-5 max-w-xl text-[15px] leading-relaxed text-muted sm:text-base"
          >
            Birthday, Anniversary, Occasion কিংবা Gift — ৩ ধাপে অর্ডার করুন। Cash on Delivery অথবা
            bKash, সাথে আপনার পছন্দের flavour আর message on cake।
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.68 }}
            className="mt-7 flex flex-wrap items-center gap-3"
          >
            <Link href="/cakes" className="btn btn-primary btn-lg group">
              এখনই অর্ডার করুন
              <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
            </Link>
            <Link href="/custom-order" className="btn btn-ghost btn-lg">
              🎨 Custom Cake বানান
            </Link>
            <a
              href={whatsapp}
              target="_blank"
              rel="noopener noreferrer"
              className="btn btn-soft btn-lg"
            >
              <MessageCircle className="h-4 w-4" /> WhatsApp
            </a>
          </motion.div>

          {/* stats */}
          <motion.dl
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.9 }}
            className="mt-9 grid max-w-lg grid-cols-3 gap-4 border-t border-line pt-6"
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
          </motion.dl>
        </div>

        {/* visual */}
        <motion.div
          initial={{ opacity: 0, scale: 0.86, rotate: -6 }}
          animate={{ opacity: 1, scale: 1, rotate: 0 }}
          transition={{ type: "spring", stiffness: 90, damping: 16, delay: 0.2 }}
          className="relative mx-auto w-full max-w-md"
        >
          <motion.div
            animate={reduce ? {} : { y: [0, -16, 0], rotate: [0, 2, 0] }}
            transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
            className="relative aspect-square"
          >
            <div className="absolute inset-0 rounded-[2.5rem] bg-gradient-to-br from-brand/35 via-accent/25 to-brand/10 blur-2xl" />
            <div className="card absolute inset-0 overflow-hidden !rounded-[2.5rem]">
              <Image
                src="/cakes/chocolate-truffle-1.svg"
                alt="Super Cake signature chocolate truffle cake"
                fill
                priority
                sizes="(max-width: 1024px) 90vw, 440px"
                className="object-cover"
                unoptimized
              />
            </div>

            {/* floating badges */}
            <motion.div
              animate={reduce ? {} : { y: [0, -10, 0] }}
              transition={{ duration: 4, repeat: Infinity, ease: "easeInOut", delay: 0.4 }}
              className="card absolute -left-4 top-6 flex items-center gap-2 px-3 py-2 sm:-left-8"
            >
              <span className="text-lg">🎂</span>
              <div className="leading-tight">
                <p className="text-[11px] font-bold">Custom Design</p>
                <p className="text-[10px] text-muted">আপনার আইডিয়া</p>
              </div>
            </motion.div>

            <motion.div
              animate={reduce ? {} : { y: [0, 12, 0] }}
              transition={{ duration: 5, repeat: Infinity, ease: "easeInOut", delay: 1 }}
              className="card absolute -right-3 bottom-10 flex items-center gap-2 px-3 py-2 sm:-right-6"
            >
              <span className="text-lg">🚚</span>
              <div className="leading-tight">
                <p className="text-[11px] font-bold">Scheduled</p>
                <p className="text-[10px] text-muted">আপনার তারিখে ডেলিভারি</p>
              </div>
            </motion.div>

            <motion.div
              animate={reduce ? {} : { scale: [1, 1.06, 1] }}
              transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
              className="absolute bottom-4 left-1/2 -translate-x-1/2 rounded-full bg-surface px-4 py-2 text-xs font-bold shadow-lift"
            >
              {reviewCount > 0
                ? `⭐ ${rating.toFixed(1)}/৫ · ${reviewCount} টি রিভিউ`
                : "🎂 Freshly Baked · Made to Order"}
            </motion.div>
          </motion.div>
        </motion.div>
      </div>
    </section>
  );
}
