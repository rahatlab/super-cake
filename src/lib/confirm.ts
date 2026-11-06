"use client";

import Swal from "sweetalert2";

/**
 * SweetAlert2 confirmation dialog for the admin dashboard.
 *
 * Replaces the raw `window.confirm()` boxes (which couldn't be styled and
 * looked out of place next to the rest of the UI). Resolves `true` only when
 * the user presses the confirm button.
 *
 * The default `sweetalert2` entry (`dist/sweetalert2.all.js`) bundles its own
 * stylesheet, so no CSS import is needed here.
 */
export async function confirmDialog({
  title,
  text,
  confirmText = "ঠিক আছে",
  cancelText = "বাতিল",
  icon = "warning",
  danger = true,
}: {
  title: string;
  text?: string;
  confirmText?: string;
  cancelText?: string;
  icon?: "warning" | "question" | "info";
  /** Red confirm button for destructive actions, brand pink otherwise. */
  danger?: boolean;
}): Promise<boolean> {
  const dark =
    typeof document !== "undefined" &&
    document.documentElement.classList.contains("dark");

  const res = await Swal.fire({
    title,
    text,
    icon,
    showCancelButton: true,
    confirmButtonText: confirmText,
    cancelButtonText: cancelText,
    confirmButtonColor: danger ? "#e11d48" : "hsl(344 90% 62%)",
    cancelButtonColor: dark ? "#3f3f46" : "#9ca3af",
    background: dark ? "#1e1e1e" : "#ffffff",
    color: dark ? "#f5f5f5" : "#111827",
    reverseButtons: true,
    customClass: {
      popup: "rounded-2xl border border-white/10 shadow-2xl",
      title: "text-base font-extrabold",
      htmlContainer: "text-sm opacity-80",
      confirmButton: "rounded-lg px-4 py-2 text-sm font-bold",
      cancelButton: "rounded-lg px-4 py-2 text-sm font-bold",
    },
  });

  return Boolean(res.isConfirmed);
}
