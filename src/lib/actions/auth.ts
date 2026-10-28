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
import { phoneKey, waLink } from "@/lib/utils";
import type { VerificationPurpose } from "@/lib/types";

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
