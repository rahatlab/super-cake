"use client";

import { useTransition } from "react";
import { Loading01, Refresh01, ShoppingBag01 } from "@animateicons/react/huge";
import { toast } from "react-toastify";
import { syncCatalogAction } from "@/lib/actions/admin";
import { useAnimIcon } from "@/components/ui/use-anim-icon";

/**
 * Manual "sync cakes → Meta catalog" trigger. The result summary becomes a
 * toast (react-toastify), so the admin sees exactly how many products landed.
 */
export function CatalogSyncButton({ configured }: { configured: boolean }) {
  const [pending, startTransition] = useTransition();
  // AnimateIcons refs for catalog sync icon
  const syncIcon = useAnimIcon();

  function sync() {
    if (pending) return;
    startTransition(async () => {
      try {
        const res = await syncCatalogAction();
        if (!res.configured) {
          toast.error(res.detail ?? "WHATSAPP_TOKEN ও WHATSAPP_CATALOG_ID সেট করা নেই");
          return;
        }
        if (res.failed > 0) {
          toast.error(
            `${res.failed} টি কেক যায়নি${res.detail ? ` — ${res.detail.slice(0, 160)}` : ""}`,
          );
          return;
        }
        toast.success(
          res.pushed > 0
            ? `ক্যাটালগ আপডেট হয়েছে — ${res.pushed} টি কেক পাঠানো হয়েছে 🎂`
            : "আপডেট করার মতো কোনো কেক পাওয়া যায়নি",
        );
      } catch (e) {
        toast.error((e as Error).message);
      }
    });
  }

  return (
    <button
      type="button"
      onClick={sync}
      disabled={pending}
      className="btn btn-soft btn-sm"
      aria-label="ক্যাটালগে কেক আপডেট করুন"
    >
      {pending ? (
        <Loading01 ref={syncIcon} className="h-3.5 w-3.5 animate-spin" aria-hidden />
      ) : (
        <Refresh01 ref={syncIcon} className="h-3.5 w-3.5" aria-hidden />
      )}
      {pending ? "আপডেট হচ্ছে…" : "ক্যাটালগে আপডেট"}
      {!configured && <ShoppingBag01 className="h-3.5 w-3.5 opacity-60" aria-hidden />}
    </button>
  );
}
