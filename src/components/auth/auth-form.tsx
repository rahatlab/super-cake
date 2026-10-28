"use client";

import Link from "next/link";
import { useActionState, useState, type ChangeEvent } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Eye, EyeOff, Loader2, LogIn, UserPlus } from "lucide-react";
import { loginAction, registerAction, type AuthState } from "@/lib/actions/auth";
import { OtpVerify } from "@/components/auth/otp-verify";

const initialState: AuthState = {};

export function AuthForm({
  mode,
  next,
  showDemoHint = false,
}: {
  mode: "login" | "register";
  next?: string;
  showDemoHint?: boolean;
}) {
  const action = mode === "login" ? loginAction : registerAction;
  const [state, formAction, pending] = useActionState(action, initialState);
  const [show, setShow] = useState(false);
  const [phone, setPhone] = useState("");
  const [phoneVerified, setPhoneVerified] = useState(false);

  const isLogin = mode === "login";
  const phoneReady = phone.replace(/\D/g, "").length >= 10;

  return (
    <div className="relative">
      {/* decorative blob */}
      <div
        aria-hidden
        className="pointer-events-none absolute -left-20 -top-24 h-56 w-56 rounded-full blur-3xl"
        style={{ background: "radial-gradient(circle, hsl(var(--brand) / 0.30), transparent 70%)" }}
      />

      <motion.div
        initial={{ opacity: 0, y: 18 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
        className="card relative p-6 sm:p-8"
      >
        <div className="mb-6 text-center">
          <motion.span
            initial={{ scale: 0.6, rotate: -12 }}
            animate={{ scale: 1, rotate: 0 }}
            transition={{ type: "spring", stiffness: 240, damping: 13 }}
            className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-gradient-to-br from-brand to-accent text-2xl"
          >
            {isLogin ? "🔐" : "🎂"}
          </motion.span>
          <h1 className="mt-4 text-2xl font-extrabold">
            {isLogin ? "আবার স্বাগতম!" : "নতুন অ্যাকাউন্ট খুলুন"}
          </h1>
          <p className="mt-1.5 text-sm text-muted">
            {isLogin
              ? "আপনার অর্ডার ও রিভিউ দেখতে লগইন করুন"
              : "ফোন যাচাই করে কয়েক সেকেন্ডেই সম্পন্ন"}
          </p>
        </div>

        <form action={formAction} className="space-y-4">
          {next && <input type="hidden" name="next" value={next} />}

          <AnimatePresence>
            {state.error && (
              <motion.div
                initial={{ opacity: 0, y: -8, height: 0 }}
                animate={{ opacity: 1, y: 0, height: "auto" }}
                exit={{ opacity: 0, y: -8, height: 0 }}
                className="overflow-hidden"
              >
                <p className="rounded-xl border border-danger/40 bg-danger/10 px-4 py-2.5 text-sm text-danger">
                  {state.error}
                </p>
              </motion.div>
            )}
          </AnimatePresence>

          {!isLogin && (
            <div>
              <label className="label" htmlFor="name">পূর্ণ নাম *</label>
              <input
                id="name"
                name="name"
                required
                minLength={2}
                className="field"
                placeholder="যেমন: Rafiq Hasan"
              />
            </div>
          )}

          <div>
            <label className="label" htmlFor="identifier">
              {isLogin ? "ইমেইল বা ফোন নম্বর *" : "ফোন নম্বর *"}
            </label>
            <input
              id="identifier"
              name={isLogin ? "identifier" : "phone"}
              required
              className="field"
              inputMode={isLogin ? "email" : "tel"}
              autoComplete={isLogin ? "username" : "tel"}
              placeholder={isLogin ? "you@email.com বা 01XXXXXXXXX" : "01XXXXXXXXX"}
              {...(!isLogin
                ? {
                    value: phone,
                    onChange: (e: ChangeEvent<HTMLInputElement>) => {
                      setPhone(e.target.value);
                      setPhoneVerified(false);
                    },
                    pattern: "[0-9+\\s\\-]{10,20}",
                  }
                : {})}
            />
          </div>

          {!isLogin && (
            <OtpVerify
              key={phone}
              phone={phone}
              purpose="register"
              verified={phoneVerified}
              onVerified={setPhoneVerified}
            />
          )}

          {!isLogin && (
            <div>
              <label className="label" htmlFor="reg_email">ইমেইল (ঐচ্ছিক)</label>
              <input id="reg_email" name="email" type="email" className="field" placeholder="you@email.com" />
            </div>
          )}

          <div>
            <div className="mb-1.5 flex items-center justify-between">
              <label className="label !mb-0" htmlFor="password">পাসওয়ার্ড *</label>
              <span className="text-[11px] text-muted">কমপক্ষে ৮ অক্ষর</span>
            </div>
            <div className="relative">
              <input
                id="password"
                name="password"
                type={show ? "text" : "password"}
                required
                minLength={8}
                maxLength={128}
                autoComplete={isLogin ? "current-password" : "new-password"}
                className="field !pr-11"
                placeholder="••••••••"
              />
              <button
                type="button"
                onClick={() => setShow((v) => !v)}
                aria-label={show ? "পাসওয়ার্ড লুকান" : "পাসওয়ার্ড দেখুন"}
                className="absolute right-2 top-1/2 grid h-8 w-8 -translate-y-1/2 place-items-center rounded-full text-muted hover:text-fg"
              >
                {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
            {isLogin && (
              <p className="mt-1.5 text-right text-xs">
                <Link href="/forgot-password" className="font-semibold text-brand-strong underline">
                  পাসওয়ার্ড ভুলে গেছেন?
                </Link>
              </p>
            )}
          </div>

          <button
            type="submit"
            disabled={pending || (!isLogin && !phoneVerified)}
            className="btn btn-primary btn-lg btn-block"
          >
            {pending ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" /> এক মুহূর্ত…
              </>
            ) : isLogin ? (
              <>
                <LogIn className="h-4 w-4" /> লগইন করুন
              </>
            ) : (
              <>
                <UserPlus className="h-4 w-4" /> রেজিস্টার করুন
              </>
            )}
          </button>

          {!isLogin && !phoneVerified && phoneReady && (
            <p className="text-center text-[11px] text-muted">
              রেজিস্টার করতে আগে উপরের ধাপে ফোন নম্বর যাচাই করুন।
            </p>
          )}
        </form>

        <p className="mt-5 text-center text-sm text-muted">
          {isLogin ? "নতুন এখানে?" : "আগে থেকেই অ্যাকাউন্ট আছে?"}{" "}
          <Link
            href={isLogin ? `/register${next ? `?next=${encodeURIComponent(next)}` : ""}` : "/login"}
            className="font-semibold text-brand-strong underline"
          >
            {isLogin ? "রেজিস্টার করুন" : "লগইন করুন"}
          </Link>
        </p>

        {isLogin && showDemoHint && (
          <div className="mt-5 rounded-xl border border-dashed border-brand/40 bg-brand/6 px-4 py-3 text-center text-[11px] text-muted">
            <p className="font-bold text-fg">Demo admin</p>
            <p className="mt-0.5">
              ইমেইল <code className="font-bold">admin@supercake.com</code> · পাসওয়ার্ড{" "}
              <code className="font-bold">admin1234</code>
            </p>
            <p className="mt-1">প্রথমবার লগইনের পরে settings থেকে পাসওয়ার্ড বদলে নিন।</p>
          </div>
        )}
      </motion.div>
    </div>
  );
}
