"use client";

import Link from "next/link";
import { useEffect } from "react";
import { AnimIcon } from "@/components/ui/anim-icon";

/**
 * Last-resort boundary: this replaces the root layout, so it must render its own
 * <html> and <body>. Kept dependency-free (no providers, no router) so it still
 * works when the failure came from the layout tree itself.
 */
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[app] global error", error);
  }, [error]);

  return (
    <html lang="bn">
      <body
        style={{
          margin: 0,
          minHeight: "100vh",
          display: "grid",
          placeItems: "center",
          padding: "2rem",
          fontFamily: "system-ui, sans-serif",
          background: "#fffafc",
          color: "#241a26",
        }}
      >
        <main style={{ maxWidth: 480, textAlign: "center" }}>
          <AnimIcon name="cake" className="h-16 w-16" aria-hidden style={{ margin: 0 }} />
          <h1 style={{ fontSize: 28, margin: "16px 0 8px", fontWeight: 800 }}>
            সাইটটি সাময়িকভাবে বন্ধ আছে
          </h1>
          <p style={{ margin: 0, lineHeight: 1.7, color: "#6b5b6e" }}>
            একটি অপ্রত্যাশিত সমস্যা হয়েছে। একবার আবার চেষ্টা করুন, অথবা কিছুক্ষণ পরে ফিরে আসুন।
          </p>
          {error.digest && (
            <p style={{ marginTop: 12, fontSize: 11, fontFamily: "monospace", color: "#8b7a8e" }}>
              Error ID: {error.digest}
            </p>
          )}
          <div style={{ marginTop: 24, display: "flex", gap: 12, justifyContent: "center", flexWrap: "wrap" }}>
            <button
              type="button"
              onClick={reset}
              style={{
                border: 0,
                borderRadius: 999,
                padding: "12px 22px",
                background: "#e11d48",
                color: "#fff",
                fontWeight: 700,
                cursor: "pointer",
              }}
            >
              আবার চেষ্টা করুন
            </button>
            <Link
              href="/"
              style={{
                borderRadius: 999,
                padding: "12px 22px",
                border: "1px solid #ead4de",
                color: "#241a26",
                fontWeight: 700,
                textDecoration: "none",
              }}
            >
              হোমে ফিরুন
            </Link>
          </div>
        </main>
      </body>
    </html>
  );
}
