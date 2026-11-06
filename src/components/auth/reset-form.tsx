"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { KeyRound, Loader2, Mail, MessageCircle } from "lucide-react";
import { resetPasswordAction, resetPasswordByEmailAction, requestEmailOtpAction, verifyEmailOtpAction, type AuthState } from "@/lib/actions/auth";
import { OtpVerify } from "@/components/auth/otp-verify";

type ResetMethod = "phone" | "email";

export function ResetPasswordForm() {
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [method, setMethod] = useState<ResetMethod>("email");
  const [verified, setVerified] = useState(false);
  const [emailCode, setEmailCode] = useState("");
  const [emailSent, setEmailSent] = useState(false);
  const [sendingEmail, setSendingEmail] = useState(false);
  const [verifyingEmail, setVerifyingEmail] = useState(false);
  const [emailError, setEmailError] = useState("");
  const [emailSuccess, setEmailSuccess] = useState(false);
  const [submitError, setSubmitError] = useState("");
  const [isPending, startTransition] = useTransition();

  const handleSendEmailOtp = async () => {
    if (!email || !email.includes("@")) {
      setEmailError("সঠিক ইমেইল দিন");
      return;
    }
    setSendingEmail(true);
    setEmailError("");
    try {
      const result = await requestEmailOtpAction(email, "reset");
      if (result.ok) {
        setEmailSent(true);
        if (result.code) {
          setEmailCode(result.code);
        }
      } else {
        setEmailError(result.error || "কোড পাঠানো যায়নি");
      }
    } catch (e) {
      setEmailError("কোড পাঠানো যায়নি");
    } finally {
      setSendingEmail(false);
    }
  };

  const handleVerifyEmailOtp = async () => {
    setVerifyingEmail(true);
    setEmailError("");
    try {
      const result = await verifyEmailOtpAction(email, "reset", emailCode);
      if (result.ok) {
        setVerified(true);
        setEmailSuccess(true);
      } else {
        setEmailError(result.error || "যাচাই ব্যর্থ");
      }
    } catch (e) {
      setEmailError("যাচাই ব্যর্থ");
    } finally {
      setVerifyingEmail(false);
    }
  };

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setSubmitError("");

    const formData = new FormData(e.currentTarget);

    startTransition(async () => {
      const action = method === "email" ? resetPasswordByEmailAction : resetPasswordAction;
      const result = await action({} as AuthState, formData);
      if (result.error) {
        setSubmitError(result.error);
      } else if (result.success) {
        // Redirect handled by the action
      }
    });
  };

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
          ফোন অথবা ইমেইল দিয়ে অ্যাকাউন্ট যাচাই করে নতুন পাসওয়ার্ড দিন।
        </p>
      </div>

      {/* Method Toggle */}
      <div className="mb-5 flex rounded-xl border border-line bg-bg p-1">
        <button
          type="button"
          onClick={() => { setMethod("email"); setVerified(false); setEmailSuccess(false); }}
          className={`flex-1 flex items-center justify-center gap-2 rounded-lg py-2.5 text-sm font-semibold transition-all ${
            method === "email" ? "bg-brand text-white" : "text-muted hover:text-fg"
          }`}
        >
          <Mail className="h-4 w-4" /> ইমেইল
        </button>
        <button
          type="button"
          onClick={() => { setMethod("phone"); setVerified(false); setEmailSuccess(false); }}
          className={`flex-1 flex items-center justify-center gap-2 rounded-lg py-2.5 text-sm font-semibold transition-all ${
            method === "phone" ? "bg-brand text-white" : "text-muted hover:text-fg"
          }`}
        >
          <MessageCircle className="h-4 w-4" /> ফোন
        </button>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <AnimatePresence>
          {submitError && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              className="overflow-hidden"
            >
              <p className="rounded-xl border border-danger/40 bg-danger/10 px-4 py-2.5 text-sm text-danger">
                {submitError}
              </p>
            </motion.div>
          )}
        </AnimatePresence>

        {method === "email" ? (
          <>
            <div>
              <label className="label" htmlFor="reset_email">ইমেইল *</label>
              <input
                id="reset_email"
                name="email"
                type="email"
                required
                autoComplete="email"
                className="field"
                placeholder="your@email.com"
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  setVerified(false);
                  setEmailSuccess(false);
                }}
              />
            </div>

            {!emailSent ? (
              <button
                type="button"
                onClick={handleSendEmailOtp}
                disabled={sendingEmail || !email}
                className="btn btn-soft btn-sm w-full"
              >
                {sendingEmail ? <Loader2 className="h-4 w-4 animate-spin" /> : <Mail className="h-4 w-4" />}
                ইমেইলে কোড নিন
              </button>
            ) : (
              <div className="space-y-3">
                <div className="rounded-xl border border-dashed border-brand/50 bg-brand/6 px-4 py-3 text-center">
                  {emailCode ? (
                    <>
                      <p className="text-[11px] font-semibold text-muted">আপনার কোড (Dev Mode)</p>
                      <p className="font-mono text-2xl font-extrabold tracking-wider text-brand-strong">{emailCode}</p>
                    </>
                  ) : (
                    <p className="text-sm text-muted">কোড আপনার ইমেইলে পাঠানো হয়েছে</p>
                  )}
                </div>

                <div className="flex gap-2">
                  <input
                    className="field font-mono tracking-widest"
                    inputMode="numeric"
                    maxLength={6}
                    placeholder="৬ সংখ্যার কোড"
                    value={emailCode}
                    onChange={(e) => setEmailCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                    aria-label="যাচাই কোড"
                  />
                  <button
                    type="button"
                    onClick={handleVerifyEmailOtp}
                    disabled={verifyingEmail || emailCode.length !== 6}
                    className="btn btn-soft shrink-0"
                  >
                    {verifyingEmail ? <Loader2 className="h-4 w-4 animate-spin" /> : "যাচাই"}
                  </button>
                </div>

                <button
                  type="button"
                  onClick={handleSendEmailOtp}
                  disabled={sendingEmail}
                  className="btn btn-ghost btn-sm w-full"
                >
                  আবার কোড পাঠান
                </button>
              </div>
            )}

            {emailError && (
              <p className="text-xs text-danger">{emailError}</p>
            )}

            {emailSuccess && (
              <div className="rounded-xl border border-success/40 bg-success/10 px-4 py-2 text-sm font-semibold text-success">
                ✅ ইমেইল যাচাই সম্পন্ন
              </div>
            )}
          </>
        ) : (
          <>
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
          </>
        )}

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
          disabled={isPending || !verified}
          className="btn btn-primary btn-lg btn-block"
        >
          {isPending ? (
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
            পাসওয়ার্ড বদলাতে আগে উপরের ধাপে {method === "email" ? "ইমেইল" : "ফোন"} যাচাই করুন।
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