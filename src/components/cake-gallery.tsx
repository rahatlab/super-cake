"use client";

import Image from "next/image";
import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { ChevronLeft, ChevronRight, Expand, X } from "lucide-react";

export function CakeGallery({ images, name }: { images: string[]; name: string }) {
  const list = images.length ? images : ["/cakes/custom-placeholder.svg"];
  const [index, setIndex] = useState(0);
  const [zoom, setZoom] = useState(false);

  const go = (dir: number) => setIndex((i) => (i + dir + list.length) % list.length);

  useEffect(() => {
    if (!zoom) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setZoom(false);
      if (e.key === "ArrowRight") go(1);
      if (e.key === "ArrowLeft") go(-1);
    };
    window.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [zoom, list.length]);

  return (
    <div className="space-y-3">
      <div className="card group relative aspect-square overflow-hidden !rounded-3xl">
        <AnimatePresence mode="wait">
          <motion.div
            key={index}
            initial={{ opacity: 0, scale: 1.04 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.98 }}
            transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
            className="absolute inset-0"
          >
            <Image
              src={list[index]}
              alt={`${name} — image ${index + 1}`}
              fill
              priority
              sizes="(max-width: 1024px) 100vw, 50vw"
              className="object-cover transition-transform duration-500 group-hover:scale-[1.15]"
              unoptimized
            />
          </motion.div>
        </AnimatePresence>

        <button
          onClick={() => setZoom(true)}
          aria-label="বড় করে দেখুন"
          className="absolute right-3 top-3 grid h-10 w-10 place-items-center rounded-full bg-surface/90 opacity-0 shadow-soft transition-opacity group-hover:opacity-100 focus-visible:opacity-100"
        >
          <Expand className="h-4 w-4" />
        </button>

        {list.length > 1 && (
          <>
            <button
              onClick={() => go(-1)}
              aria-label="আগের ছবি"
              className="absolute left-3 top-1/2 grid h-10 w-10 -translate-y-1/2 place-items-center rounded-full bg-surface/90 opacity-0 shadow-soft transition-opacity group-hover:opacity-100 focus-visible:opacity-100"
            >
              <ChevronLeft className="h-5 w-5" />
            </button>
            <button
              onClick={() => go(1)}
              aria-label="পরের ছবি"
              className="absolute right-3 top-1/2 grid h-10 w-10 -translate-y-1/2 place-items-center rounded-full bg-surface/90 opacity-0 shadow-soft transition-opacity group-hover:opacity-100 focus-visible:opacity-100"
            >
              <ChevronRight className="h-5 w-5" />
            </button>
          </>
        )}
      </div>

      {list.length > 1 && (
        <div className="no-scrollbar flex gap-2 overflow-x-auto">
          {list.map((src, i) => (
            <button
              key={src + i}
              onClick={() => setIndex(i)}
              aria-label={`ছবি ${i + 1}`}
              className={`relative h-16 w-16 shrink-0 overflow-hidden rounded-xl border-2 transition-all ${
                i === index ? "border-brand opacity-100" : "border-transparent opacity-60 hover:opacity-100"
              }`}
            >
              <Image src={src} alt="" fill sizes="64px" className="object-cover" unoptimized />
            </button>
          ))}
        </div>
      )}

      {/* lightbox */}
      <AnimatePresence>
        {zoom && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 grid place-items-center bg-black/90 p-4"
            onClick={() => setZoom(false)}
          >
            <motion.button
              initial={{ scale: 0.7, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.7, opacity: 0 }}
              aria-label="বন্ধ করুন"
              className="absolute right-4 top-4 grid h-11 w-11 place-items-center rounded-full bg-white/10 text-white"
            >
              <X className="h-5 w-5" />
            </motion.button>

            <motion.div
              initial={{ scale: 0.85, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.85, opacity: 0 }}
              transition={{ type: "spring", stiffness: 200, damping: 24 }}
              className="relative aspect-square w-full max-w-3xl"
              onClick={(e) => e.stopPropagation()}
            >
              <Image
                src={list[index]}
                alt={name}
                fill
                sizes="100vw"
                className="rounded-2xl object-contain"
                unoptimized
              />
            </motion.div>

            {list.length > 1 && (
              <div className="absolute bottom-6 left-1/2 flex -translate-x-1/2 gap-3">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    go(-1);
                  }}
                  className="btn btn-sm bg-white/10 text-white backdrop-blur"
                >
                  <ChevronLeft className="h-4 w-4" />
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    go(1);
                  }}
                  className="btn btn-sm bg-white/10 text-white backdrop-blur"
                >
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
