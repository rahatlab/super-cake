import { createHmac, randomInt, timingSafeEqual } from "crypto";
import { getStore } from "./store";
import type { PhoneVerification, VerificationPurpose } from "./types";

const OTP_TTL_MS = 10 * 60_000;
const MAX_ATTEMPTS = 5;

function otpSecret(): string {
  return (
    process.env.OTP_SECRET?.trim() ||
    process.env.AUTH_SECRET?.trim() ||
    "super-cake-development-only-otp-secret"
  );
}

export function hashOtp(code: string): string {
  return createHmac("sha256", otpSecret()).update(code.trim()).digest("hex");
}

function equalHash(a: string, b: string): boolean {
  try {
    const bufA = Buffer.from(a, "hex");
    const bufB = Buffer.from(b, "hex");
    return bufA.length === bufB.length && timingSafeEqual(bufA, bufB);
  } catch {
    return false;
  }
}

/** Development fallback when no WhatsApp webhook is configured. */
function devAutoVerify(): boolean {
  return process.env.NODE_ENV !== "production" || process.env.OTP_DEV_AUTO_VERIFY === "true";
}

export function generateOtp(): string {
  return String(randomInt(0, 1_000_000)).padStart(6, "0");
}

export async function issuePhoneVerification(
  phone: string,
  purpose: VerificationPurpose,
): Promise<{ code: string; record: PhoneVerification }> {
  const code = generateOtp();
  const record = await getStore().savePhoneVerification({
    phone,
    purpose,
    code_hash: hashOtp(code),
    expires_at: new Date(Date.now() + OTP_TTL_MS).toISOString(),
    verified_at: devAutoVerify() ? new Date().toISOString() : null,
  });
  return { code, record };
}

export async function isPhoneVerified(
  phone: string,
  purpose: VerificationPurpose,
): Promise<boolean> {
  const record = await getStore().getLatestPhoneVerification(phone, purpose);
  if (!record) return false;
  if (record.consumed_at) return false;
  if (!record.verified_at) return false;
  if (new Date(record.expires_at).getTime() < Date.now()) return false;
  return true;
}

/**
 * Called by the WhatsApp webhook when the customer sends `VERIFY-123456`
 * from their own WhatsApp number. This is the proof of phone ownership.
 */
export async function verifyPhoneCode(
  phone: string,
  code: string,
): Promise<{ ok: boolean; reason?: string; record?: PhoneVerification }> {
  const store = getStore();
  for (const purpose of ["register", "reset", "claim"] as VerificationPurpose[]) {
    const record = await store.getLatestPhoneVerification(phone, purpose);
    if (!record) continue;
    if (record.consumed_at) continue;
    if (new Date(record.expires_at).getTime() < Date.now()) continue;

    if (record.attempts >= MAX_ATTEMPTS) {
      return { ok: false, reason: "অনেকবার ভুল কোড দেওয়া হয়েছে। নতুন কোড নিন।", record };
    }

    if (!equalHash(record.code_hash, hashOtp(code))) {
      await store.updatePhoneVerification(record.id, { attempts: record.attempts + 1 });
      await new Promise((resolve) => setTimeout(resolve, 150));
      continue;
    }

    const updated = await store.updatePhoneVerification(record.id, {
      verified_at: new Date().toISOString(),
    });
    return { ok: true, record: updated };
  }
  return { ok: false, reason: "কোড পাওয়া যায়নি বা মেয়াদ শেষ" };
}

export async function consumePhoneVerification(id: string): Promise<void> {
  await getStore().updatePhoneVerification(id, { consumed_at: new Date().toISOString() });
}

/** Validate the code typed into the UI (development-only shortcut). */
export async function verifyPhoneCodeTyped(
  phone: string,
  purpose: VerificationPurpose,
  code: string,
): Promise<{ ok: boolean; reason?: string }> {
  if (!devAutoVerify()) {
    return { ok: false, reason: "WhatsApp এ কোডটি পাঠিয়ে যাচাই করুন" };
  }
  const store = getStore();
  const record = await store.getLatestPhoneVerification(phone, purpose);
  if (!record) return { ok: false, reason: "আগে কোড পাঠান" };
  if (new Date(record.expires_at).getTime() < Date.now()) {
    return { ok: false, reason: "কোডের মেয়াদ শেষ — আবার পাঠান" };
  }
  if (record.attempts >= MAX_ATTEMPTS) {
    return { ok: false, reason: "অনেকবার ভুল কোড দেওয়া হয়েছে" };
  }
  if (!equalHash(record.code_hash, hashOtp(code))) {
    await store.updatePhoneVerification(record.id, { attempts: record.attempts + 1 });
    return { ok: false, reason: "কোড মিলছে না" };
  }
  await store.updatePhoneVerification(record.id, { verified_at: new Date().toISOString() });
  return { ok: true };
}

export function otpExpiryMinutes(): number {
  return Math.round(OTP_TTL_MS / 60_000);
}
