"use client";

import { useEffect, useState } from "react";
import { ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

/**
 * Global confirmation toasts (react-toastify).
 *
 * Lives in its own client component so the root layout stays a server
 * component — `toast()` calls from any client component (forms, row actions,
 * sync buttons) render into this single container.
 *
 * v11 also injects its stylesheet at runtime; importing the CSS explicitly
 * keeps the styles available during the very first paint.
 */
export function ToastProvider() {
  const [theme, setTheme] = useState<"light" | "dark">("light");

  useEffect(() => {
    // Detect theme from document class
    const updateTheme = () => {
      const isDark = document.documentElement.classList.contains("dark");
      setTheme(isDark ? "dark" : "light");
    };

    updateTheme();

    // Watch for theme changes
    const observer = new MutationObserver(updateTheme);
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["class"],
    });

    return () => observer.disconnect();
  }, []);

  return (
    <ToastContainer
      position="top-right"
      autoClose={3500}
      newestOnTop
      closeOnClick
      pauseOnHover
      pauseOnFocusLoss
      draggable
      limit={3}
      theme={theme}
      hideProgressBar={false}
      style={
        {
          zIndex: 9999,
          // Slightly wider + rounder than the library defaults.
          "--toastify-toast-width": "340px",
          "--toastify-toast-bd-radius": "12px",
        } as React.CSSProperties
      }
      // v11: a className *function* must re-include `defaultClassName` — when it
      // doesn't, the toast loses the base `.Toastify__toast` rules (width,
      // padding, radius, theme background) and renders as a bare text-sized
      // box floating over the page. A raw string is cx'ed onto the defaults.
      toastClassName={
        theme === "dark"
          ? "bg-[#1e1e1e] text-white border border-white/10 shadow-xl text-sm font-medium"
          : "bg-white text-gray-900 border border-gray-200 shadow-xl text-sm font-medium"
      }
    />
  );
}
