"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Gift, Megaphone } from "lucide-react";
import type { Banner } from "@/lib/types";

function useCountdown(iso?: string | null) {
  const [now, setNow] = useState<number | null>(null);
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- the clock can only start in the browser
    setNow(Date.now());
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);

  return useMemo(() => {
    if (!iso || now === null) return null;
    const diff = new Date(iso).getTime() - now;
    if (diff <= 0) return null;
    return {
      days: Math.floor(diff / 86400000),
      hours: Math.floor((diff / 3600000) % 24),
      minutes: Math.floor((diff / 60000) % 60),
      seconds: Math.floor((diff / 1000) % 60),
    };
  }, [iso, now]);
}

const pad = (n: number) => String(n).padStart(2, "0");

export function OfferBanner({ banner }: { banner: Banner | null }) {
  const countdown = useCountdown(banner?.ends_at);
  if (!banner || !banner.is_active) return null;

  return (
    <AnimatePresence>
      <motion.section
        initial={{ opacity: 0, y: -10, height: 0 }}
        animate={{ opacity: 1, y: 0, height: "auto" }}
        transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
        className="container-page"
      >
        <div className="relative mt-4 overflow-hidden rounded-2xl border border-brand/30 bg-gradient-to-r from-brand/15 via-accent/12 to-brand/15 px-5 py-4">
          {/* animated shine */}
          <motion.div
            aria-hidden
            className="pointer-events-none absolute inset-y-0 -left-1/3 w-1/3 bg-gradient-to-r from-transparent via-white/35 to-transparent"
            animate={{ x: ["0%", "420%"] }}
            transition={{ duration: 3.2, repeat: Infinity, repeatDelay: 2.5, ease: "easeInOut" }}
          />

          <div className="relative flex flex-col items-center justify-between gap-3 sm:flex-row">
            <div className="flex items-start gap-3">
              <motion.span
                animate={{ rotate: [0, -10, 10, 0] }}
                transition={{ duration: 2.4, repeat: Infinity, repeatDelay: 3 }}
                className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-brand text-brand-fg"
              >
                <Megaphone className="h-5 w-5" />
              </motion.span>
              <div>
                <p className="text-sm font-extrabold sm:text-base">{banner.title}</p>
                {banner.subtitle && <p className="mt-0.5 text-xs text-muted sm:text-[13px]">{banner.subtitle}</p>}
              </div>
            </div>

            <div className="flex items-center gap-3">
              {countdown && (
                <div className="flex items-center gap-1.5" aria-label="Offer ends in">
                  {[
                    { v: countdown.days, l: "D" },
                    { v: countdown.hours, l: "H" },
                    { v: countdown.minutes, l: "M" },
                    { v: countdown.seconds, l: "S" },
                  ].map((u, i) => (
                    <motion.div
                      key={u.l}
                      animate={i === 3 ? { scale: [1, 1.1, 1] } : {}}
                      transition={{ duration: 1, repeat: Infinity }}
                      className="min-w-[2.4rem] rounded-lg bg-surface px-1.5 py-1 text-center shadow-soft"
                    >
                      <p className="text-sm font-extrabold leading-none tabular-nums">{pad(u.v)}</p>
                      <p className="text-[9px] font-semibold text-muted">{u.l}</p>
                    </motion.div>
                  ))}
                </div>
              )}

              {banner.cta_text && (
                <Link href={banner.cta_link || "/cakes"} className="btn btn-primary btn-sm">
                  <Gift className="h-3.5 w-3.5" />
                  {banner.cta_text}
                </Link>
              )}
            </div>
          </div>
        </div>
      </motion.section>
    </AnimatePresence>
  );
}
