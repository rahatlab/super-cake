"use client";

import { useState } from "react";
import {
  CheckCircle2,
  Copy,
  ExternalLink,
  Loader2,
  MessageCircle,
  ShieldCheck,
} from "lucide-react";
import {
  checkOtpStatusAction,
  requestOtpAction,
  verifyOtpTypedAction,
} from "@/lib/actions/auth";

interface OtpInfo {
  code: string;
  waLink: string;
  expiresMinutes: number;
}

/**
 * Free phone verification: the customer sends `VERIFY-XXXXXX` from their own
 * WhatsApp number, so no SMS or paid authentication template is needed.
 *
 * The component is keyed by the phone number by its parent, so changing the
 * number automatically resets the local state.
 */
export function OtpVerify({
  phone,
  purpose,
  verified,
  onVerified,
}: {
  phone: string;
  purpose: "register" | "reset" | "claim";
  verified: boolean;
  onVerified: (value: boolean) => void;
}) {
  const [info, setInfo] = useState<OtpInfo | null>(null);
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState<"send" | "typed" | "check" | null>(null);
  const [message, setMessage] = useState<{ tone: "ok" | "error"; text: string } | null>(null);
  const [copied, setCopied] = useState(false);
  const devMode = process.env.NODE_ENV !== "production";

  const send = async () => {
    setBusy("send");
    setMessage(null);
    setCopied(false);
    try {
      const res = await requestOtpAction(phone, purpose);
      if (!res.ok || !res.code || !res.waLink) {
        setMessage({ tone: "error", text: res.error ?? "কোড তৈরি করা যায়নি" });
        return;
      }
      setInfo({
        code: res.code,
        waLink: res.waLink,
        expiresMinutes: res.expiresMinutes ?? 10,
      });
      setMessage({
        tone: "ok",
        text: `কোড তৈরি হয়েছে — ${res.expiresMinutes ?? 10} মিনিটের মধ্যে WhatsApp এ পাঠান।`,
      });
    } catch {
      setMessage({ tone: "error", text: "কোড তৈরি করা যায়নি। আবার চেষ্টা করুন।" });
    } finally {
      setBusy(null);
    }
  };

  const copy = async () => {
    if (!info) return;
    try {
      await navigator.clipboard.writeText(`VERIFY-${info.code}`);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setMessage({ tone: "error", text: "কপি করা যায়নি — কোডটি হাতে লিখুন।" });
    }
  };

  const verifyTyped = async () => {
    if (!/^\d{6}$/.test(code.trim())) {
      setMessage({ tone: "error", text: "৬ সংখ্যার কোড দিন।" });
      return;
    }
    setBusy("typed");
    try {
      const res = await verifyOtpTypedAction(phone, purpose, code.trim());
      if (!res.ok) {
        setMessage({ tone: "error", text: res.error ?? "কোড মিলছে না" });
        return;
      }
      onVerified(true);
      setMessage({ tone: "ok", text: "ফোন নম্বর যাচাই সম্পন্ন হয়েছে ✅" });
    } finally {
      setBusy(null);
    }
  };

  const checkStatus = async () => {
    setBusy("check");
    try {
      const res = await checkOtpStatusAction(phone, purpose);
      if (res.verified) {
        onVerified(true);
        setMessage({ tone: "ok", text: "ফোন নম্বর যাচাই সম্পন্ন হয়েছে ✅" });
      } else {
        setMessage({
          tone: "error",
          text: res.error
            ? "যাচাই করা যায়নি। আবার চেষ্টা করুন।"
            : "এখনো যাচাই হয়নি — WhatsApp এ কোডটি পাঠিয়েছেন কি?",
        });
      }
    } finally {
      setBusy(null);
    }
  };

  if (verified) {
    return (
      <div className="flex items-center gap-2 rounded-xl border border-success/40 bg-success/10 px-4 py-3 text-sm font-semibold text-success">
        <CheckCircle2 className="h-4 w-4 shrink-0" />
        ফোন নম্বর যাচাই সম্পন্ন হয়েছে
      </div>
    );
  }

  return (
    <div className="space-y-3 rounded-xl border border-line bg-surface p-4">
      <div className="flex items-start gap-2">
        <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-brand" />
        <div className="text-xs text-muted">
          <p className="font-bold text-fg">ফোন নম্বর যাচাই করুন</p>
          <p className="mt-0.5">
            SMS না — WhatsApp এ একটি সংক্ষিপ্ত কোড পাঠিয়ে যাচাই হবে। সম্পূর্ণ ফ্রি।
          </p>
        </div>
      </div>

      {!info ? (
        <button
          type="button"
          onClick={send}
          disabled={busy !== null || phone.replace(/\D/g, "").length < 10}
          className="btn btn-soft btn-sm w-full"
        >
          {busy === "send" ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <MessageCircle className="h-4 w-4" />
          )}
          WhatsApp ভেরিফিকেশন কোড নিন
        </button>
      ) : (
        <div className="space-y-3">
          <div className="rounded-xl border border-dashed border-brand/50 bg-brand/6 px-4 py-3 text-center">
            <p className="text-[11px] font-semibold text-muted">আপনার কোড</p>
            <p className="mt-1 font-mono text-2xl font-extrabold tracking-wider text-brand-strong">
              {info.code}
            </p>
            <div className="mt-2 flex flex-wrap justify-center gap-2">
              <button type="button" onClick={copy} className="btn btn-sm btn-ghost">
                <Copy className="h-3.5 w-3.5" /> {copied ? "কপি হয়েছে" : "কপি করুন"}
              </button>
              <a
                href={info.waLink}
                target="_blank"
                rel="noopener noreferrer"
                className="btn btn-sm btn-primary"
              >
                <ExternalLink className="h-3.5 w-3.5" /> WhatsApp এ পাঠান
              </a>
            </div>
          </div>

          <p className="text-[11px] text-muted">
            WhatsApp খুলে <code className="font-bold">VERIFY-{info.code}</code> পাঠান। তারপর নিচের
            যাচাই বাটনে চাপ দিন।
          </p>

          {devMode && (
            <div className="flex gap-2">
              <input
                className="field font-mono tracking-widest"
                inputMode="numeric"
                maxLength={6}
                placeholder="৬ সংখ্যার কোড"
                value={code}
                onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                aria-label="যাচাই কোড"
              />
              <button
                type="button"
                onClick={verifyTyped}
                disabled={busy !== null}
                className="btn btn-soft shrink-0"
              >
                {busy === "typed" ? <Loader2 className="h-4 w-4 animate-spin" /> : "কোড যাচাই"}
              </button>
            </div>
          )}

          <button
            type="button"
            onClick={checkStatus}
            disabled={busy !== null}
            className="btn btn-ghost btn-sm w-full"
          >
            {busy === "check" ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <CheckCircle2 className="h-4 w-4" />
            )}
            আমি WhatsApp এ পাঠিয়েছি — যাচাই করুন
          </button>
        </div>
      )}

      {message && (
        <p
          role="status"
          className={`text-xs font-semibold ${
            message.tone === "ok" ? "text-success" : "text-danger"
          }`}
        >
          {message.text}
        </p>
      )}
    </div>
  );
}
