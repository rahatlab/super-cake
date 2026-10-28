"use client";

import Link from "next/link";
import { useActionState, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { KeyRound, Loader2 } from "lucide-react";
import { resetPasswordAction, type AuthState } from "@/lib/actions/auth";
import { OtpVerify } from "@/components/auth/otp-verify";

const initialState: AuthState = {};

export function ResetPasswordForm() {
  const [state, formAction, pending] = useActionState(resetPasswordAction, initialState);
  const [phone, setPhone] = useState("");
  const [verified, setVerified] = useState(false);

  return (
    <motion.div
      initial={{ opacity: 0, y: 18 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
      className="card p-6 sm:p-8"
    >
      <div className="mb-6 text-center">
        <span className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-gradient-to-br from-brand to-accent text-2xl">
          🔑
        </span>
        <h1 className="mt-4 text-2xl font-extrabold">পাসওয়ার্ড রিসেট</h1>
        <p className="mt-1.5 text-sm text-muted">
          আপনার অ্যাকাউন্টের ফোন নম্বর যাচাই করে নতুন পাসওয়ার্ড দিন।
        </p>
      </div>

      <form action={formAction} className="space-y-4">
        <AnimatePresence>
          {state.error && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              className="overflow-hidden"
            >
              <p className="rounded-xl border border-danger/40 bg-danger/10 px-4 py-2.5 text-sm text-danger">
                {state.error}
              </p>
            </motion.div>
          )}
        </AnimatePresence>

        <div>
          <label className="label" htmlFor="reset_phone">ফোন নম্বর *</label>
          <input
            id="reset_phone"
            name="phone"
            required
            inputMode="tel"
            autoComplete="tel"
            className="field"
            placeholder="01XXXXXXXXX"
            value={phone}
            onChange={(e) => {
              setPhone(e.target.value);
              setVerified(false);
            }}
          />
        </div>

        <OtpVerify
          key={phone}
          phone={phone}
          purpose="reset"
          verified={verified}
          onVerified={setVerified}
        />

        <div>
          <label className="label" htmlFor="new_password">নতুন পাসওয়ার্ড *</label>
          <input
            id="new_password"
            name="new_password"
            type="password"
            required
            minLength={8}
            maxLength={128}
            autoComplete="new-password"
            className="field"
            placeholder="কমপক্ষে ৮ অক্ষর"
          />
        </div>

        <div>
          <label className="label" htmlFor="confirm_password">নতুন পাসওয়ার্ড আবার *</label>
          <input
            id="confirm_password"
            name="confirm_password"
            type="password"
            required
            minLength={8}
            maxLength={128}
            autoComplete="new-password"
            className="field"
            placeholder="আবার লিখুন"
          />
        </div>

        <button
          type="submit"
          disabled={pending || !verified}
          className="btn btn-primary btn-lg btn-block"
        >
          {pending ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" /> সেভ হচ্ছে…
            </>
          ) : (
            <>
              <KeyRound className="h-4 w-4" /> নতুন পাসওয়ার্ড সেভ করুন
            </>
          )}
        </button>

        {!verified && (
          <p className="text-center text-[11px] text-muted">
            পাসওয়ার্ড বদলাতে আগে উপরের ধাপে ফোন নম্বর যাচাই করুন।
          </p>
        )}
      </form>

      <p className="mt-5 text-center text-sm text-muted">
        মনে পড়েছে?{" "}
        <Link href="/login" className="font-semibold text-brand-strong underline">
          লগইন করুন
        </Link>
      </p>
    </motion.div>
  );
}
