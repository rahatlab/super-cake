"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { motion, AnimatePresence } from "framer-motion";
import { Add01Icon, Star, ChevronLeft, ChevronRight, Cancel01, Expand } from "@animateicons/react/huge";
import type { Cake } from "@/lib/types";
import { formatBDT, weightLabel } from "@/lib/utils";
import { useCart } from "@/components/cart/cart-context";
import { Stars } from "@/components/star-rating";
import { useAnimIcon } from "@/components/ui/use-anim-icon";

export function CakeCard({
  cake,
  rating,
  reviewCount = 0,
  priority = false,
}: {
  cake: Cake;
  rating?: number;
  reviewCount?: number;
  /** Above-the-fold cards only (first row of a listing) — preloads the LCP image. */
  priority?: boolean;
}) {
  const { add } = useCart();
  // AnimateIcons refs — icons only animate when driven from the card/button hover.
  const hoverAddIcon = useAnimIcon();
  const quickAddIcon = useAnimIcon();
  const featuredIcon = useAnimIcon();
  const expandIcon = useAnimIcon();
  const lightboxPrevIcon = useAnimIcon();
  const lightboxNextIcon = useAnimIcon();
  const lightboxCloseIcon = useAnimIcon();

  const available = cake.sizes?.filter((s) => s.is_available) ?? [];
  const first = available[0];
  const cheapest = available.length ? Math.min(...available.map((s) => s.price)) : cake.base_price;
  const soldOut = cake.stock <= 0;

  // Lightbox state
  const [isLightboxOpen, setIsLightboxOpen] = useState(false);
  const [lightboxIndex, setLightboxIndex] = useState(0);

  const images = cake.image_urls.length ? cake.image_urls : ["/cakes/custom-placeholder.svg"];

  const quickAdd = () => {
    if (soldOut) return;
    add({
      cake_id: cake.id,
      name: cake.name,
      slug: cake.slug,
      image: cake.image_urls[0],
      weight: first?.weight,
      unit_price: first?.price ?? cake.base_price,
      quantity: 1,
    });
  };

  const go = (dir: number) => setLightboxIndex((i) => (i + dir + images.length) % images.length);

  useEffect(() => {
    if (!isLightboxOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isLightboxOpen) return;
      if (e.key === "Escape") setIsLightboxOpen(false);
      if (e.key === "ArrowRight") go(1);
      if (e.key === "ArrowLeft") go(-1);
    };

    window.addEventListener("keydown", handleKeyDown);
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = "";
    };
  }, [isLightboxOpen, go]);

  const openLightbox = (index = 0) => {
    setLightboxIndex(index);
    setIsLightboxOpen(true);
  };

  return (
    <>
      <div className="card group relative flex h-full flex-col overflow-hidden transition-shadow">
        <Link
          href={`/cakes/${cake.slug}`}
          className="relative block aspect-square overflow-hidden bg-brand/5"
          onClick={(e) => {
            if (!soldOut && cake.image_urls.length > 1) {
              e.preventDefault();
              openLightbox(0);
            }
          }}
        >
          {cake.image_urls[0] && (
            <Image
              src={cake.image_urls[0]}
              alt={cake.name}
              fill
              sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
              className="object-cover transition-transform duration-500 group-hover:scale-[1.07]"
              priority={priority}
            />
          )}

          <div className="absolute left-3 top-3 flex flex-col items-start gap-1.5">
            {cake.is_featured && (
              <span
                className="badge bg-brand text-brand-fg shadow-soft"
                onMouseEnter={() => featuredIcon.current?.startAnimation()}
                onMouseLeave={() => featuredIcon.current?.stopAnimation()}
              >
                <Star ref={featuredIcon} size={14} aria-hidden /> Featured
              </span>
            )}
            {soldOut && <span className="badge bg-danger text-white">Sold Out</span>}
            {!soldOut && cake.stock <= 3 && (
              <span className="badge bg-warning text-black">শুধু {cake.stock} বাকি</span>
            )}
          </div>

          {!soldOut && (
            <motion.span
              aria-hidden
              onMouseEnter={() => hoverAddIcon.current?.startAnimation()}
              onMouseLeave={() => hoverAddIcon.current?.stopAnimation()}
              className="absolute bottom-3 right-3 grid h-11 w-11 place-items-center rounded-full bg-brand text-brand-fg opacity-0 shadow-lift transition-opacity duration-300 group-hover:opacity-100"
            >
              <Add01Icon ref={hoverAddIcon} className="h-5 w-5" />
            </motion.span>
          )}

          {images.length > 1 && !soldOut && (
            <button
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                openLightbox(0);
              }}
              aria-label="বড় করে দেখুন"
              className="absolute right-3 top-3 grid h-10 w-10 place-items-center rounded-full bg-surface/95 opacity-0 shadow-lift transition-all duration-300 group-hover:opacity-100 focus-visible:opacity-100 hover:scale-110"
              onMouseEnter={() => expandIcon.current?.startAnimation()}
              onMouseLeave={() => expandIcon.current?.stopAnimation()}
            >
              <Expand ref={expandIcon} className="h-4 w-4 transition-transform group-hover:rotate-12" />
            </button>
          )}
        </Link>

        <div className="flex flex-1 flex-col gap-2 p-4">
          <div className="flex items-start justify-between gap-2">
            <Link href={`/cakes/${cake.slug}`} className="min-w-0">
              <h3 className="truncate text-[15px] font-bold leading-snug transition-colors group-hover:text-brand-strong">
                {cake.name}
              </h3>
            </Link>
            <span className="badge shrink-0 bg-fg/6 text-muted">{cake.category}</span>
          </div>

          <p className="line-clamp-2 text-[13px] leading-relaxed text-muted">{cake.description}</p>

          {rating ? (
            <div className="flex items-center gap-1.5">
              <Stars value={rating} size={13} />
              <span className="text-xs text-muted">
                {rating.toFixed(1)} · {reviewCount} রিভিউ
              </span>
            </div>
          ) : null}

          <div className="mt-auto flex items-end justify-between gap-2 border-t border-line pt-3">
            <div>
              <p className="text-lg font-extrabold leading-none text-brand-strong">{formatBDT(cheapest)}</p>
              <p className="mt-1 text-[11px] text-muted">
                {available.length > 1
                  ? `${weightLabel(available[0].weight)} – ${weightLabel(available[available.length - 1].weight)}`
                  : "১ পাউন্ড"}
              </p>
            </div>

            <button
              type="button"
              onClick={quickAdd}
              disabled={soldOut}
              onMouseEnter={() => quickAddIcon.current?.startAnimation()}
              onMouseLeave={() => quickAddIcon.current?.stopAnimation()}
              className="btn btn-soft btn-sm"
              aria-label={`${cake.name} কার্টে দিন`}
            >
              <Add01Icon ref={quickAddIcon} className="h-3.5 w-3.5" /> যোগ
            </button>
          </div>
        </div>
      </div>

      {/* Lightbox Modal */}
      <AnimatePresence>
        {isLightboxOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 grid place-items-center bg-black/90 p-4"
            onClick={() => setIsLightboxOpen(false)}
            role="dialog"
            aria-modal="true"
            aria-label={`${cake.name} - ছবি ${lightboxIndex + 1} / ${images.length}`}
          >
            <motion.button
              initial={{ scale: 0.7, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.7, opacity: 0 }}
              aria-label="বন্ধ করুন"
              className="absolute right-4 top-4 grid h-11 w-11 place-items-center rounded-full bg-white/10 text-white"
              onClick={(e) => {
                e.stopPropagation();
                setIsLightboxOpen(false);
              }}
              onMouseEnter={() => lightboxCloseIcon.current?.startAnimation()}
              onMouseLeave={() => lightboxCloseIcon.current?.stopAnimation()}
            >
              <Cancel01 ref={lightboxCloseIcon} className="h-5 w-5" />
            </motion.button>

            <motion.div
              initial={{ scale: 0.85, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.85, opacity: 0 }}
              transition={{ type: "spring", stiffness: 200, damping: 24 }}
              className="relative aspect-square w-full max-w-3xl"
              onClick={(e) => e.stopPropagation()}
            >
              <AnimatePresence mode="wait">
                <motion.div
                  key={lightboxIndex}
                  initial={{ opacity: 0, scale: 1.04 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.98 }}
                  transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
                  className="absolute inset-0"
                >
                  <Image
                    src={images[lightboxIndex]}
                    alt={`${cake.name} — ছবি ${lightboxIndex + 1}`}
                    fill
                    sizes="100vw"
                    className="rounded-2xl object-contain"
                  />
                </motion.div>
              </AnimatePresence>
            </motion.div>

            {images.length > 1 && (
              <>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    go(-1);
                  }}
                  className="absolute left-4 top-1/2 -translate-y-1/2 grid h-12 w-12 place-items-center rounded-full bg-white/10 text-white backdrop-blur hover:bg-white/20 transition-colors"
                  onMouseEnter={() => lightboxPrevIcon.current?.startAnimation()}
                  onMouseLeave={() => lightboxPrevIcon.current?.stopAnimation()}
                  aria-label="আগের ছবি"
                >
                  <ChevronLeft ref={lightboxPrevIcon} className="h-6 w-6" />
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    go(1);
                  }}
                  className="absolute right-4 top-1/2 -translate-y-1/2 grid h-12 w-12 place-items-center rounded-full bg-white/10 text-white backdrop-blur hover:bg-white/20 transition-colors"
                  onMouseEnter={() => lightboxNextIcon.current?.startAnimation()}
                  onMouseLeave={() => lightboxNextIcon.current?.stopAnimation()}
                  aria-label="পরের ছবি"
                >
                  <ChevronRight ref={lightboxNextIcon} className="h-6 w-6" />
                </button>

                {/* Thumbnail strip */}
                <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2">
                  {images.map((src, i) => (
                    <button
                      key={src + i}
                      onClick={(e) => {
                        e.stopPropagation();
                        setLightboxIndex(i);
                      }}
                      aria-label={`ছবি ${i + 1}`}
                      aria-current={i === lightboxIndex}
                      className={`relative h-12 w-12 shrink-0 overflow-hidden rounded-lg border-2 transition-all ${
                        i === lightboxIndex ? "border-brand opacity-100 shadow-lift" : "border-transparent opacity-60 hover:opacity-100 hover:shadow-soft"
                      }`}
                    >
                      <Image
                        src={src}
                        alt={`${cake.name} — ছবি ${i + 1}`}
                        fill
                        sizes="48px"
                        loading={i === lightboxIndex ? "eager" : "lazy"}
                        className="object-cover transition-all duration-300 hover:scale-[1.05] hover:brightness-105"
                      />
                      {i === lightboxIndex && (
                        <div className="absolute inset-0 rounded-lg bg-brand/20 animate-pulse" />
                      )}
                    </button>
                  ))}
                </div>
              </>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}