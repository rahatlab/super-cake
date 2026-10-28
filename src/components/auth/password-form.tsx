"use client";

import { useActionState, useState } from "react";
import { KeyRound, Loader2 } from "lucide-react";
import { changePasswordAction, type AuthState } from "@/lib/actions/auth";

const initial: AuthState = {};

/** Change the signed-in user's password (works for customers and admins). */
export function PasswordForm() {
  const [formKey, setFormKey] = useState(0);
  const [state, formAction, pending] = useActionState(
    async (prev: AuthState, fd: FormData) => {
      const result = await changePasswordAction(prev, fd);
      if (result.success) setFormKey((k) => k + 1);
      return result;
    },
    initial,
  );

  return (
    <section className="card p-5" aria-label="পাসওয়ার্ড বদলান">
      <div className="flex items-center gap-2.5">
        <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-brand/10 text-brand-strong">
          <KeyRound className="h-4 w-4" aria-hidden />
        </span>
        <div>
          <h2 className="text-base font-extrabold">পাসওয়ার্ড বদলান</h2>
          <p className="text-[11px] text-muted">নিরাপত্তার জন্য মাঝে মাঝে পাসওয়ার্ড বদলান</p>
        </div>
      </div>

      {state.error && (
        <p role="alert" className="mt-4 rounded-xl bg-danger/10 px-3 py-2 text-sm font-semibold text-danger">
          ⚠️ {state.error}
        </p>
      )}
      {state.success && (
        <p role="status" className="mt-4 rounded-xl bg-success/10 px-3 py-2 text-sm font-semibold text-success">
          ✅ পাসওয়ার্ড বদলানো হয়েছে
        </p>
      )}

      <form key={formKey} action={formAction} className="mt-4 grid gap-3 sm:grid-cols-3">
        <div>
          <label htmlFor="cur-pass" className="label">
            বর্তমান পাসওয়ার্ড
          </label>
          <input
            id="cur-pass"
            name="current_password"
            type="password"
            autoComplete="current-password"
            required
            minLength={6}
            className="field"
          />
        </div>
        <div>
          <label htmlFor="new-pass" className="label">
            নতুন পাসওয়ার্ড
          </label>
          <input
            id="new-pass"
            name="new_password"
            type="password"
            autoComplete="new-password"
            required
            minLength={6}
            className="field"
          />
        </div>
        <div>
          <label htmlFor="confirm-pass" className="label">
            নতুন পাসওয়ার্ড আবার
          </label>
          <input
            id="confirm-pass"
            name="confirm_password"
            type="password"
            autoComplete="new-password"
            required
            minLength={6}
            className="field"
          />
        </div>
        <div className="sm:col-span-3">
          <button type="submit" disabled={pending} className="btn btn-soft btn-sm">
            {pending ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden />
            ) : (
              <KeyRound className="h-3.5 w-3.5" aria-hidden />
            )}
            পাসওয়ার্ড আপডেট করুন
          </button>
        </div>
      </form>
    </section>
  );
}
