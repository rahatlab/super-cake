"use client";

import Link from "next/link";
import Image from "next/image";
import { motion } from "framer-motion";
import { Plus } from "lucide-react";
import type { Cake } from "@/lib/types";
import { formatBDT, weightLabel } from "@/lib/utils";
import { useCart } from "@/components/cart/cart-context";
import { Stars } from "@/components/star-rating";

export function CakeCard({
  cake,
  rating,
  reviewCount = 0,
}: {
  cake: Cake;
  rating?: number;
  reviewCount?: number;
}) {
  const { add } = useCart();

  const available = cake.sizes?.filter((s) => s.is_available) ?? [];
  const first = available[0];
  const cheapest = available.length ? Math.min(...available.map((s) => s.price)) : cake.base_price;
  const soldOut = cake.stock <= 0;

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

  return (
    <motion.article
      whileHover={{ y: -6 }}
      transition={{ type: "spring", stiffness: 260, damping: 20 }}
      className="card group relative flex h-full flex-col overflow-hidden transition-shadow hover:shadow-lift"
    >
      <Link href={`/cakes/${cake.slug}`} className="relative block aspect-[4/3] overflow-hidden bg-brand/5">
        {cake.image_urls[0] && (
          <Image
            src={cake.image_urls[0]}
            alt={cake.name}
            fill
            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
            className="object-cover transition-transform duration-500 group-hover:scale-[1.07]"
            unoptimized
          />
        )}

        <div className="absolute left-3 top-3 flex flex-col items-start gap-1.5">
          {cake.is_featured && <span className="badge bg-brand text-brand-fg shadow-soft">⭐ Featured</span>}
          {soldOut && <span className="badge bg-danger text-white">Sold Out</span>}
          {!soldOut && cake.stock <= 3 && (
            <span className="badge bg-warning text-black">শুধু {cake.stock} বাকি</span>
          )}
        </div>

        {!soldOut && (
          <motion.span
            aria-hidden
            className="absolute bottom-3 right-3 grid h-11 w-11 place-items-center rounded-full bg-brand text-brand-fg opacity-0 shadow-lift transition-opacity duration-300 group-hover:opacity-100"
          >
            <Plus className="h-5 w-5" />
          </motion.span>
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
            className="btn btn-soft btn-sm"
            aria-label={`${cake.name} কার্টে দিন`}
          >
            <Plus className="h-3.5 w-3.5" /> যোগ
          </button>
        </div>
      </div>
    </motion.article>
  );
}
