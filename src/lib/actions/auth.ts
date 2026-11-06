"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { getStore } from "@/lib/store";
import { clearSessionCookie, getCurrentUser, setSessionCookie } from "@/lib/auth";
import { verifyPassword, hashPassword } from "@/lib/password";
import { rateLimit, clientIp } from "@/lib/rate-limit";
import {
  changePasswordSchema,
  loginSchema,
  milestoneSchema,
  otpRequestSchema,
  registerSchema,
  resetPasswordSchema,
} from "@/lib/validators";
import {
  consumePhoneVerification,
  isPhoneVerified,
  issuePhoneVerification,
  otpExpiryMinutes,
  verifyPhoneCodeTyped,
} from "@/lib/otp";
import {
  generateEmailOtp,
  hashEmailOtp,
  sendPasswordResetEmail,
  sendVerificationEmail,
} from "@/lib/email";
import { phoneKey, waLink } from "@/lib/utils";
import type { VerificationPurpose, EmailVerificationPurpose } from "@/lib/types";

export interface AuthState {
  error?: string;
  field?: string;
  success?: boolean;
}

export interface OtpRequestResult {
  ok: boolean;
  error?: string;
  /** The code the customer must send from their own WhatsApp number. */
  code?: string;
  waLink?: string;
  expiresMinutes?: number;
}

function safeNext(raw: string | null | undefined): string {
  if (!raw) return "/account";
  if (!raw.startsWith("/") || raw.startsWith("//")) return "/account";
  return raw;
}

function parsePurpose(raw: string): VerificationPurpose | null {
  return raw === "register" || raw === "reset" || raw === "claim" ? raw : null;
}

/* ----------------------------- OTP ----------------------------- */

/**
 * Issues a short-lived verification code. The customer proves ownership by
 * sending `VERIFY-123456` to the business WhatsApp number from their own
 * phone; the webhook then marks the record verified. This keeps verification
 * free (no SMS, no paid authentication template).
 */
export async function requestOtpAction(
  rawPhone: string,
  rawPurpose: string,
): Promise<OtpRequestResult> {
  const ip = clientIp(await headers());
  if (!rateLimit(`otp-ip:${ip}`, 10, 60_000).ok) {
    return { ok: false, error: "অনেকবার চেষ্টা হয়েছে। এক মিনিট পরে আবার চেষ্টা করুন।" };
  }

  const parsed = otpRequestSchema.safeParse({
    phone: String(rawPhone ?? "").trim(),
    purpose: rawPurpose,
  });
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0].message };
  }

  const { phone, purpose } = parsed.data;
  if (!rateLimit(`otp-phone:${phoneKey(phone)}`, 3, 10 * 60_000).ok) {
    return {
      ok: false,
      error: "এই নম্বরে খুব বেশি কোড চাওয়া হয়েছে। ১০ মিনিট পরে আবার চেষ্টা করুন।",
    };
  }

  const store = getStore();
  const existing = await store.findUserByPhone(phone);

  if (purpose === "register" && existing) {
    return { ok: false, error: "এই ফোন নম্বরে অ্যাকাউন্ট আছে — লগইন করুন।" };
  }
  if (purpose !== "register" && !existing) {
    return { ok: false, error: "এই ফোন নম্বরে কোনো অ্যাকাউন্ট পাওয়া যায়নি।" };
  }

  const { code } = await issuePhoneVerification(phone, purpose);
  const settings = await store.getSettings();
  const message = `VERIFY-${code}`;

  return {
    ok: true,
    code,
    waLink: waLink(settings.whatsapp_phone, message),
    expiresMinutes: otpExpiryMinutes(),
  };
}

/** Polled by the UI after the customer sends the code via WhatsApp. */
export async function checkOtpStatusAction(
  rawPhone: string,
  rawPurpose: string,
): Promise<{ verified: boolean; error?: string }> {
  const ip = clientIp(await headers());
  if (!rateLimit(`otp-check:${ip}`, 60, 60_000).ok) {
    return { verified: false, error: "একটু পরে আবার চেষ্টা করুন।" };
  }

  const purpose = parsePurpose(rawPurpose);
  if (!purpose) return { verified: false, error: "invalid" };

  const parsed = otpRequestSchema.safeParse({ phone: rawPhone, purpose });
  if (!parsed.success) return { verified: false, error: parsed.error.issues[0].message };

  return { verified: await isPhoneVerified(parsed.data.phone, purpose) };
}

/**
 * Development-only shortcut so the app can be tested without a WhatsApp
 * webhook. In production this always returns an error and the customer must
 * verify through the webhook.
 */
export async function verifyOtpTypedAction(
  rawPhone: string,
  rawPurpose: string,
  rawCode: string,
): Promise<{ ok: boolean; error?: string }> {
  const ip = clientIp(await headers());
  if (!rateLimit(`otp-typed:${ip}`, 15, 60_000).ok) {
    return { ok: false, error: "অনেকবার চেষ্টা হয়েছে।" };
  }

  const purpose = parsePurpose(rawPurpose);
  if (!purpose) return { ok: false, error: "invalid" };

  const parsed = otpRequestSchema.safeParse({ phone: rawPhone, purpose });
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0].message };

  return verifyPhoneCodeTyped(parsed.data.phone, purpose, String(rawCode ?? "").trim());
}

/* ----------------------------- email OTP ----------------------------- */

const EMAIL_OTP_TTL_MS = 10 * 60_000;
const EMAIL_MAX_ATTEMPTS = 5;

function devEmailAutoVerify(): boolean {
  return process.env.NODE_ENV !== "production" || process.env.OTP_DEV_AUTO_VERIFY === "true";
}

/**
 * Send a password-reset OTP to the user's email via Resend.
 * Returns the code in development so it can be tested without a real inbox.
 */
export async function requestEmailOtpAction(
  rawEmail: string,
  rawPurpose: string,
): Promise<OtpRequestResult> {
  const ip = clientIp(await headers());
  if (!rateLimit(`email-otp-ip:${ip}`, 10, 60_000).ok) {
    return { ok: false, error: "অনেকবার চেষ্টা হয়েছে। এক মিনিট পরে আবার চেষ্টা করুন।" };
  }

  const email = String(rawEmail ?? "").trim().toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return { ok: false, error: "সঠিক ইমেইল দিন।" };
  }

  const purpose: EmailVerificationPurpose =
    rawPurpose === "register" ? "register" : rawPurpose === "verify" ? "verify" : "reset";

  if (!rateLimit(`email-otp:${email}`, 3, 10 * 60_000).ok) {
    return {
      ok: false,
      error: "এই ইমেইলে খুব বেশি কোড চাওয়া হয়েছে। ১০ মিনিট পরে আবার চেষ্টা করুন।",
    };
  }

  const store = getStore();
  const user = await store.findUserByEmail(email);

  if (purpose === "reset" && !user) {
    // Do not reveal whether the email exists — same message either way in
    // production. Development gets the real reason so a typo'd address is
    // not mistaken for a broken mailer.
    console.warn("[auth] password-reset requested for an email with no account:", email);
    if (process.env.NODE_ENV !== "production") {
      return { ok: false, error: "এই ইমেইলে কোনো অ্যাকাউন্ট নেই। ফোন দিয়েও রিসেট করা যাবে।" };
    }
    return { ok: true, expiresMinutes: 10 };
  }

  const code = generateEmailOtp();
  await store.saveEmailVerification({
    email,
    purpose,
    code_hash: hashEmailOtp(code),
    expires_at: new Date(Date.now() + EMAIL_OTP_TTL_MS).toISOString(),
    verified_at: devEmailAutoVerify() ? new Date().toISOString() : null,
  });

  const sent =
    purpose === "register"
      ? await sendVerificationEmail(email, code, user?.name ?? "there")
      : await sendPasswordResetEmail(email, code, user?.name ?? "there");

  if (!sent.ok) {
    console.warn("[auth] email OTP send failed:", sent.error, "→", email);
    if (process.env.NODE_ENV !== "production") {
      if (sent.error === "not_configured") {
        return { ok: false, error: "ইমেইল সার্ভিস সেটআপ করা নেই — RESEND_API_KEY দিন।" };
      }
      if (sent.error === "invalid_from") {
        return {
          ok: false,
          error: 'RESEND_FROM_EMAIL ভুল ফরম্যাটে আছে — "নাম <ইমেইল@example.com>" হতে হবে।',
        };
      }
    }
    return { ok: false, error: "ইমেইল পাঠানো যায়নি। আবার চেষ্টা করুন।" };
  }

  return {
    ok: true,
    // Only expose the code outside production.
    code: devEmailAutoVerify() ? code : undefined,
    expiresMinutes: 10,
  };
}

/** Verify the code typed into the UI. */
export async function verifyEmailOtpAction(
  rawEmail: string,
  rawPurpose: string,
  rawCode: string,
): Promise<{ ok: boolean; error?: string }> {
  const ip = clientIp(await headers());
  if (!rateLimit(`email-otp-verify:${ip}`, 15, 60_000).ok) {
    return { ok: false, error: "অনেকবার চেষ্টা হয়েছে।" };
  }

  const email = String(rawEmail ?? "").trim().toLowerCase();
  const purpose: EmailVerificationPurpose =
    rawPurpose === "register" ? "register" : rawPurpose === "verify" ? "verify" : "reset";
  const code = String(rawCode ?? "").trim();

  if (!/^\d{6}$/.test(code)) return { ok: false, error: "৬ সংখ্যার কোড দিন।" };

  const store = getStore();
  const record = await store.getLatestEmailVerification(email, purpose);
  if (!record) return { ok: false, error: "আগে কোড পাঠান।" };
  if (record.consumed_at) return { ok: false, error: "এই কোড আগেই ব্যবহার হয়েছে।" };
  if (new Date(record.expires_at).getTime() < Date.now()) {
    return { ok: false, error: "কোডের মেয়াদ শেষ — আবার পাঠান।" };
  }
  if (record.attempts >= EMAIL_MAX_ATTEMPTS) {
    return { ok: false, error: "অনেকবার ভুল কোড দেওয়া হয়েছে। নতুন কোড নিন।" };
  }

  if (record.code_hash !== hashEmailOtp(code)) {
    await store.updateEmailVerification(record.id, { attempts: record.attempts + 1 });
    return { ok: false, error: "কোড মিলছে না।" };
  }

  await store.updateEmailVerification(record.id, { verified_at: new Date().toISOString() });
  return { ok: true };
}

/** True when a verified, unexpired, unconsumed email OTP exists. */
async function isEmailVerified(
  email: string,
  purpose: EmailVerificationPurpose,
): Promise<boolean> {
  const record = await getStore().getLatestEmailVerification(email, purpose);
  if (!record) return false;
  if (record.consumed_at || !record.verified_at) return false;
  return new Date(record.expires_at).getTime() >= Date.now();
}

/**
 * Reset a password using a verified email OTP.
 * Used by the admin "forgot password" flow.
 */
export async function resetPasswordByEmailAction(
  _prev: AuthState,
  formData: FormData,
): Promise<AuthState> {
  const ip = clientIp(await headers());
  if (!rateLimit(`email-reset:${ip}`, 5, 60_000).ok) {
    return { error: "অনেকবার চেষ্টা হয়েছে। এক মিনিট পরে আবার করুন।" };
  }

  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const newPassword = String(formData.get("new_password") ?? "");
  const confirmPassword = String(formData.get("confirm_password") ?? "");

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return { error: "সঠিক ইমেইল দিন।", field: "email" };
  }
  if (newPassword.length < 8) {
    return { error: "পাসওয়ার্ড অন্তত ৮ অক্ষর হতে হবে।", field: "new_password" };
  }
  if (newPassword !== confirmPassword) {
    return { error: "দুইবার একই পাসওয়ার্ড লিখুন।", field: "confirm_password" };
  }

  if (!(await isEmailVerified(email, "reset"))) {
    return { error: "ইমেইল যাচাই করা হয়নি। আগে কোড পাঠিয়ে যাচাই করুন।", field: "email" };
  }

  const store = getStore();
  const user = await store.findUserByEmail(email);
  if (!user) return { error: "এই ইমেইলে অ্যাকাউন্ট পাওয়া যায়নি।", field: "email" };

  try {
    await store.updatePassword(user.id, hashPassword(newPassword));
  } catch (e) {
    return { error: (e as Error).message };
  }

  const record = await store.getLatestEmailVerification(email, "reset");
  if (record && !record.consumed_at) {
    await store.updateEmailVerification(record.id, { consumed_at: new Date().toISOString() });
  }

  await setSessionCookie(user.id);
  redirect(user.role === "admin" ? "/admin" : "/account");
}

/* ----------------------------- login / register ----------------------------- */

export async function loginAction(_prev: AuthState, formData: FormData): Promise<AuthState> {
  const ip = clientIp(await headers());
  const limited = rateLimit(`login:${ip}`, 8, 60_000);
  if (!limited.ok) {
    return { error: `অনেকবার চেষ্টা হয়েছে। ${limited.retryAfterSeconds} সেকেন্ড পরে আবার চেষ্টা করুন।` };
  }

  const parsed = loginSchema.safeParse({
    identifier: String(formData.get("identifier") ?? "").trim(),
    password: String(formData.get("password") ?? ""),
  });
  if (!parsed.success) {
    const issue = parsed.error.issues[0];
    return { error: issue.message, field: issue.path[0] as string };
  }

  const { identifier, password } = parsed.data;
  const store = getStore();
  const user = identifier.includes("@")
    ? await store.findUserByEmail(identifier)
    : await store.findUserByPhone(identifier);

  if (!user) return { error: "এই অ্যাকাউন্ট পাওয়া যায়নি। আগে রেজিস্টার করুন।", field: "identifier" };

  const passwordHash = await store.getPasswordHash(user.id);
  if (!passwordHash || !verifyPassword(password, passwordHash)) {
    return { error: "পাসওয়ার্ড ভুল হয়েছে।", field: "password" };
  }

  // Admin blocked this account — refuse login (order placement is blocked by
  // getCurrentUser()/placeOrderAction as well).
  if (user.is_blocked) {
    return {
      error: "আপনার অ্যাকাউন্টটি বন্ধ করা হয়েছে। বিস্তারিত জানতে সাপোর্টে যোগাযোগ করুন।",
      field: "identifier",
    };
  }

  // Link any guest orders placed earlier with this verified phone.
  if (user.role === "customer") {
    await store.claimGuestOrders(user.id, user.phone).catch(() => 0);
  }

  await setSessionCookie(user.id);

  const next = safeNext(formData.get("next") as string | null);
  redirect(next === "/account" && user.role === "admin" ? "/admin" : next);
}

export async function registerAction(_prev: AuthState, formData: FormData): Promise<AuthState> {
  const ip = clientIp(await headers());
  const limited = rateLimit(`register:${ip}`, 5, 60_000);
  if (!limited.ok) {
    return { error: `অনেকবার চেষ্টা হয়েছে। ${limited.retryAfterSeconds} সেকেন্ড পরে আবার চেষ্টা করুন।` };
  }

  const parsed = registerSchema.safeParse({
    name: String(formData.get("name") ?? "").trim(),
    phone: String(formData.get("phone") ?? "").trim(),
    email: String(formData.get("email") ?? "").trim(),
    password: String(formData.get("password") ?? ""),
  });
  if (!parsed.success) {
    const issue = parsed.error.issues[0];
    return { error: issue.message, field: issue.path[0] as string };
  }

  const { name, phone, email, password } = parsed.data;
  const store = getStore();

  if (!(await isPhoneVerified(phone, "register"))) {
    return {
      error: "ফোন নম্বর যাচাই করা হয়নি। WhatsApp এ কোড পাঠিয়ে যাচাই করুন।",
      field: "phone",
    };
  }

  if (email && (await store.findUserByEmail(email))) {
    return { error: "এই ইমেইলে অ্যাকাউন্ট আছে।", field: "email" };
  }
  if (await store.findUserByPhone(phone)) {
    return { error: "এই ফোন নম্বরে অ্যাকাউন্ট আছে।", field: "phone" };
  }

  let user;
  try {
    user = await store.createUser({
      name,
      phone,
      email: email || undefined,
      role: "customer",
      password: hashPassword(password),
    });
  } catch (e) {
    return { error: (e as Error).message };
  }

  const verification = await store.getLatestPhoneVerification(phone, "register");
  if (verification && !verification.consumed_at) {
    await consumePhoneVerification(verification.id);
  }
  await store.claimGuestOrders(user.id, user.phone).catch(() => 0);

  await setSessionCookie(user.id);
  redirect(safeNext(formData.get("next") as string | null));
}

/* ----------------------------- password reset ----------------------------- */

export async function resetPasswordAction(
  _prev: AuthState,
  formData: FormData,
): Promise<AuthState> {
  const ip = clientIp(await headers());
  if (!rateLimit(`reset:${ip}`, 5, 60_000).ok) {
    return { error: "অনেকবার চেষ্টা হয়েছে। এক মিনিট পরে আবার করুন।" };
  }

  const parsed = resetPasswordSchema.safeParse({
    phone: String(formData.get("phone") ?? "").trim(),
    new_password: String(formData.get("new_password") ?? ""),
    confirm_password: String(formData.get("confirm_password") ?? ""),
  });
  if (!parsed.success) {
    const issue = parsed.error.issues[0];
    return { error: issue.message, field: issue.path[0] as string };
  }

  const { phone, new_password } = parsed.data;
  const store = getStore();

  if (!(await isPhoneVerified(phone, "reset"))) {
    return {
      error: "ফোন নম্বর যাচাই করা হয়নি। WhatsApp এ কোড পাঠিয়ে যাচাই করুন।",
      field: "phone",
    };
  }

  const user = await store.findUserByPhone(phone);
  if (!user) return { error: "এই ফোন নম্বরে অ্যাকাউন্ট পাওয়া যায়নি।", field: "phone" };

  try {
    await store.updatePassword(user.id, hashPassword(new_password));
  } catch (e) {
    return { error: (e as Error).message };
  }

  const verification = await store.getLatestPhoneVerification(phone, "reset");
  if (verification && !verification.consumed_at) {
    await consumePhoneVerification(verification.id);
  }
  await store.claimGuestOrders(user.id, user.phone).catch(() => 0);

  await setSessionCookie(user.id);
  redirect("/account");
}

/* ----------------------------- session / password ----------------------------- */

export async function logoutAction(): Promise<void> {
  await clearSessionCookie();
  redirect("/");
}

export async function changePasswordAction(
  _prev: AuthState,
  formData: FormData,
): Promise<AuthState> {
  const user = await getCurrentUser();
  if (!user) return { error: "অনুগ্রহ করে আগে লগইন করুন।" };

  const ip = clientIp(await headers());
  if (!rateLimit(`password:${ip}`, 6, 60_000).ok) {
    return { error: "অনেকবার চেষ্টা হয়েছে। এক মিনিট পরে আবার চেষ্টা করুন।" };
  }

  const parsed = changePasswordSchema.safeParse({
    current_password: String(formData.get("current_password") ?? ""),
    new_password: String(formData.get("new_password") ?? ""),
    confirm_password: String(formData.get("confirm_password") ?? ""),
  });
  if (!parsed.success) {
    const issue = parsed.error.issues[0];
    return { error: issue.message, field: String(issue.path[0]) };
  }

  const store = getStore();
  const currentHash = await store.getPasswordHash(user.id);
  if (!currentHash || !verifyPassword(parsed.data.current_password, currentHash)) {
    return { error: "বর্তমান পাসওয়ার্ড ভুল হয়েছে।", field: "current_password" };
  }

  try {
    await store.updatePassword(user.id, hashPassword(parsed.data.new_password));
    return { success: true };
  } catch (e) {
    return { error: (e as Error).message };
  }
}

/* ----------------------------- milestones (auto-wish) ----------------------------- */

/**
 * Save the customer's birthday / anniversary dates. These drive the daily
 * auto-wish cron, which greets them (with a promo code) on the matching day.
 * Only name/date fields are writable — `role` can never arrive here.
 */
export async function saveMilestonesAction(
  _prev: AuthState,
  formData: FormData,
): Promise<AuthState> {
  const user = await getCurrentUser();
  if (!user) return { error: "অনুগ্রহ করে আগে লগইন করুন।" };

  const ip = clientIp(await headers());
  if (!rateLimit(`milestone:${ip}`, 10, 60_000).ok) {
    return { error: "অনেকবার চেষ্টা হয়েছে। এক মিনিট পরে আবার চেষ্টা করুন।" };
  }

  const parsed = milestoneSchema.safeParse({
    birthdate: String(formData.get("birthdate") ?? "").trim(),
    anniversary_date: String(formData.get("anniversary_date") ?? "").trim(),
  });
  if (!parsed.success) {
    const issue = parsed.error.issues[0];
    return { error: issue.message, field: String(issue.path[0]) };
  }

  const store = getStore();
  try {
    await store.updateProfile(user.id, {
      birthdate: parsed.data.birthdate || null,
      anniversary_date: parsed.data.anniversary_date || null,
    });
    return { success: true };
  } catch (e) {
    return { error: (e as Error).message };
  }
}
