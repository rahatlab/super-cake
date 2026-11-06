"use client";

import { useEffect, useActionState } from "react";
import { CakeSlice, Loader2, PartyPopper } from "lucide-react";
import { toast } from "react-toastify";
import { saveMilestonesAction, type AuthState } from "@/lib/actions/auth";

const initial: AuthState = {};

/**
 * Birthday / anniversary capture. The daily cron reads these dates and sends
 * an auto-wish (with a promo code) on the matching day — so the payoff for the
 * customer is spelled out right under the inputs.
 */
export function MilestoneForm({
  birthdate,
  anniversaryDate,
}: {
  birthdate?: string | null;
  anniversaryDate?: string | null;
}) {
  const [state, formAction, pending] = useActionState(saveMilestonesAction, initial);

  // The server validates against the Dhaka date (that is the day the cron
  // matches on), so the input cap must be the same day — a plain UTC date
  // would block "today" for the first six hours of each Dhaka morning.
  const today = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Dhaka" }).format(new Date());

  useEffect(() => {
    if (state.success) toast.success("জন্মদিন ও বার্ষিকী তারিখ সেভ হয়েছে 🎉");
    else if (state.error) toast.error(state.error);
  }, [state]);

  return (
    <section className="card p-5" aria-label="জন্মদিন ও বার্ষিকী">
      <div className="flex items-center gap-2.5">
        <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-brand/10 text-brand-strong">
          <CakeSlice className="h-4 w-4" aria-hidden />
        </span>
        <div>
          <h2 className="text-base font-extrabold">জন্মদিন ও বার্ষিকী</h2>
          <p className="text-[11px] text-muted">
            তারিখ দিলে বিশেষ দিনে অটো শুভেচ্ছা ও ডিসকাউন্ট কোড WhatsApp-এ পাবেন
          </p>
        </div>
      </div>

      <form action={formAction} className="mt-4 grid gap-3 sm:grid-cols-3">
        <div>
          <label htmlFor="birthdate" className="label">
            জন্মতারিখ
          </label>
          <input
            id="birthdate"
            name="birthdate"
            type="date"
            defaultValue={birthdate ?? ""}
            max={today}
            className="field"
          />
        </div>
        <div>
          <label htmlFor="anniversary_date" className="label">
            বিয়ের বার্ষিকী
          </label>
          <input
            id="anniversary_date"
            name="anniversary_date"
            type="date"
            defaultValue={anniversaryDate ?? ""}
            max={today}
            className="field"
          />
        </div>
        <div className="flex items-end">
          <button type="submit" disabled={pending} className="btn btn-soft btn-sm w-full">
            {pending ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden />
            ) : (
              <PartyPopper className="h-3.5 w-3.5" aria-hidden />
            )}
            সেভ করুন
          </button>
        </div>
      </form>
    </section>
  );
}
