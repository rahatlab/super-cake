"use client";

import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { ChevronLeft, ChevronRight, Quote } from "lucide-react";
import type { Review } from "@/lib/types";
import { Stars } from "@/components/star-rating";

interface Item {
  name: string;
  comment: string;
  rating: number;
  date?: string;
}

export function Testimonials({ reviews }: { reviews: Review[] }) {
  const items: Item[] = reviews.map((r) => ({
    name: r.customer_name,
    comment: r.comment,
    rating: r.rating,
    date: r.created_at,
  }));

  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);

  useEffect(() => {
    if (paused || items.length <= 1) return;
    const t = setInterval(() => setIndex((i) => (i + 1) % items.length), 5200);
    return () => clearInterval(t);
  }, [paused, items.length]);

  if (!items.length) return null;
  const active = items[index];

  const go = (dir: number) => setIndex((i) => (i + dir + items.length) % items.length);

  return (
    <section
      className="container-page py-14"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
    >
      <div className="mx-auto max-w-3xl text-center">
        <span className="badge bg-brand/12 text-brand-strong">Customer Review</span>
        <h2 className="mt-4 text-3xl font-extrabold sm:text-4xl">
          তাদের কথা, আমাদের <span className="text-gradient">প্রেরণা</span>
        </h2>
        <p className="mt-3 text-sm text-muted">
          ডেলিভারি শেষ হলে customer রা যা বলেছেন — সরাসরি তাদের মুখ থেকে
        </p>
      </div>

      <div className="relative mx-auto mt-9 max-w-3xl">
        <div className="card relative overflow-hidden px-6 py-9 sm:px-10">
          <Quote className="absolute right-6 top-5 h-12 w-12 text-brand/12" />

          <AnimatePresence mode="wait">
            <motion.figure
              key={index}
              initial={{ opacity: 0, x: 30, filter: "blur(6px)" }}
              animate={{ opacity: 1, x: 0, filter: "blur(0px)" }}
              exit={{ opacity: 0, x: -30, filter: "blur(6px)" }}
              transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
              className="relative"
            >
              <Stars value={active.rating} size={18} />
              <blockquote className="mt-4 text-[15px] leading-relaxed sm:text-base">“{active.comment}”</blockquote>
              <figcaption className="mt-5 flex items-center gap-3">
                <span className="grid h-10 w-10 place-items-center rounded-full bg-gradient-to-br from-brand to-accent text-sm font-extrabold text-white">
                  {active.name.slice(0, 1)}
                </span>
                <div>
                  <p className="text-sm font-bold">{active.name}</p>
                  <p className="text-xs text-muted">যাচাইকৃত অর্ডার</p>
                </div>
              </figcaption>
            </motion.figure>
          </AnimatePresence>
        </div>

        <div className="mt-5 flex items-center justify-center gap-3">
          <button onClick={() => go(-1)} aria-label="Previous review" className="btn btn-ghost btn-sm !px-3">
            <ChevronLeft className="h-4 w-4" />
          </button>

          <div className="flex gap-1.5">
            {items.map((_, i) => (
              <button
                key={i}
                onClick={() => setIndex(i)}
                aria-label={`Review ${i + 1}`}
                className="h-2 rounded-full transition-all"
                style={{
                  width: i === index ? 24 : 8,
                  background: i === index ? "hsl(var(--brand))" : "hsl(var(--border))",
                }}
              />
            ))}
          </div>

          <button onClick={() => go(1)} aria-label="Next review" className="btn btn-ghost btn-sm !px-3">
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      </div>
    </section>
  );
}
