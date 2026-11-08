"use client";

import Link from "next/link";
import { useEffect } from "react";
import { Home, RotateCcw } from "lucide-react";
import { AnimIcon } from "@/components/ui/anim-icon";

/**
 * Route-level error boundary. Catches render/data errors in any route below the
 * root layout so users see a branded recovery screen instead of a blank page.
 */
export default function AppError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Surfaces in the browser console and in Vercel's function logs.
    console.error("[app] unhandled error", error);
  }, [error]);

  return (
    <div className="container-page flex min-h-[65vh] flex-col items-center justify-center py-16 text-center">
      <AnimIcon name="cake" className="h-16 w-16" aria-hidden />
      <p className="mt-6 font-display text-5xl font-extrabold text-gradient">ওহো!</p>
      <h1 className="mt-3 text-2xl font-extrabold sm:text-3xl">কিছু একটা ভুল হয়ে গেছে</h1>
      <p className="mt-3 max-w-md text-sm leading-relaxed text-muted">
        পেজটি লোড করতে সমস্যা হয়েছে। একবার আবার চেষ্টা করুন — সমস্যা থেকে গেলে আমাদের WhatsApp এ
        জানান, আমরা দ্রুত ঠিক করে দেব।
      </p>

      {error.digest && (
        <p className="mt-3 font-mono text-[11px] text-muted">Error ID: {error.digest}</p>
      )}

      <div className="mt-7 flex flex-wrap justify-center gap-3">
        <button type="button" onClick={reset} className="btn btn-primary btn-lg">
          <RotateCcw className="h-4 w-4" aria-hidden /> আবার চেষ্টা করুন
        </button>
        <Link href="/" className="btn btn-ghost btn-lg">
          <Home className="h-4 w-4" aria-hidden /> হোমে ফিরুন
        </Link>
        <Link href="/cakes" className="btn btn-soft btn-lg">
          <AnimIcon name="cake" className="h-4 w-4 shrink-0" /> কেক দেখুন
        </Link>
      </div>
    </div>
  );
}
