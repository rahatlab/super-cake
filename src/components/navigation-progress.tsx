"use client";

import { useEffect, useState } from "react";
import { usePathname, useSearchParams } from "next/navigation";

export function NavigationProgress() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    // Navigation completed
    setLoading(false);
  }, [pathname, searchParams]);

  useEffect(() => {
    // Intercept link clicks to show progress
    const handleClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      const link = target.closest("a");

      if (link && link.href && link.href.startsWith(window.location.origin) && !link.target) {
        setLoading(true);
      }
    };

    document.addEventListener("click", handleClick);
    return () => document.removeEventListener("click", handleClick);
  }, []);

  if (!loading) return null;

  return (
    <div
      className="fixed top-0 left-0 right-0 z-[9999] h-0.5 bg-brand"
      style={{
        animation: "progress 2s ease-in-out infinite",
      }}
    >
      <style jsx>{`
        @keyframes progress {
          0% {
            width: 0%;
            opacity: 1;
          }
          50% {
            width: 70%;
            opacity: 1;
          }
          100% {
            width: 100%;
            opacity: 0;
          }
        }
      `}</style>
    </div>
  );
}
