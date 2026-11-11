import { Loader2 } from "lucide-react";

/**
 * Full-screen verify overlay — same look as the PayStation hand-off overlay
 * (OrderLoadingOverlay) but plain server HTML: framer-motion renders
 * opacity-0 during SSR, which made the first paint look like a blank page.
 */
export default function PaymentCallbackLoading() {
  return (
    <div
      className="fixed inset-0 z-[100] grid place-items-center bg-black/70 backdrop-blur-sm"
      role="status"
      aria-live="polite"
    >
      <div className="flex flex-col items-center gap-4 px-6 text-center">
        <span className="grid h-16 w-16 place-items-center rounded-full bg-brand/15">
          <Loader2 className="h-8 w-8 animate-spin text-brand" aria-hidden />
        </span>
        <p className="text-lg font-extrabold text-white">পেমেন্ট যাচাই হচ্ছে…</p>
        <p className="max-w-xs text-sm text-white/70">
          অনুগ্রহ করে অপেক্ষা করুন — পেজ বন্ধ করবেন না।
        </p>
      </div>
    </div>
  );
}
