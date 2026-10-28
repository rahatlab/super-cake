import { createHmac, timingSafeEqual } from "crypto";
import { cookies } from "next/headers";
import type { Profile } from "./types";
import { getStore } from "./store";

export const SESSION_COOKIE = "sc_session";
const SESSION_DAYS = 30;
const TOKEN_VERSION = "v1";

/**
 * AUTH_SECRET is mandatory in production. We resolve it lazily (instead of at
 * module load) so a missing secret fails requests with a clear error rather
 * than silently signing tokens with a public default.
 */
function getSecret(): string {
  const secret = process.env.AUTH_SECRET?.trim();
  if (secret && secret.length >= 32) return secret;

  if (process.env.NODE_ENV === "production") {
    throw new Error(
      "AUTH_SECRET is missing or too short (minimum 32 characters). Refusing to sign tokens.",
    );
  }

  if (secret) {
    console.warn("[auth] AUTH_SECRET is shorter than 32 characters; using it only because NODE_ENV is not production.");
    return secret;
  }

  console.warn("[auth] AUTH_SECRET is not set. Using an insecure development-only secret.");
  return "super-cake-development-only-secret-do-not-use-in-production";
}

function sign(payload: string): string {
  return createHmac("sha256", getSecret()).update(payload).digest("hex");
}

function safeEqualHex(a: string, b: string): boolean {
  if (!/^[0-9a-f]+$/i.test(a) || a.length !== b.length) return false;
  try {
    return timingSafeEqual(Buffer.from(a, "hex"), Buffer.from(b, "hex"));
  } catch {
    return false;
  }
}

function base64UrlEncode(value: string): string {
  return Buffer.from(value, "utf8").toString("base64url");
}

function base64UrlDecode(value: string): string | null {
  try {
    return Buffer.from(value, "base64url").toString("utf8");
  } catch {
    return null;
  }
}

export type TokenPurpose = "session" | "order_access" | "review_access" | "cart_lead";

interface TokenPayload {
  v: 1;
  p: TokenPurpose;
  s: string;
  e: number;
  n: string;
}

export interface VerifiedToken {
  subject: string;
  expires: number;
}

/** Create a purpose-scoped, signed, expiring token. */
export function createSignedToken(purpose: TokenPurpose, subject: string, ttlMs: number): string {
  const payload: TokenPayload = {
    v: 1,
    p: purpose,
    s: subject,
    e: Date.now() + ttlMs,
    n: Math.random().toString(36).slice(2, 10),
  };
  const encoded = base64UrlEncode(JSON.stringify(payload));
  return `${TOKEN_VERSION}.${encoded}.${sign(`${TOKEN_VERSION}.${encoded}`)}`;
}

/** Verify signature, purpose and expiry. Returns null for anything invalid. */
export function verifySignedToken(
  token: string | undefined | null,
  purpose: TokenPurpose,
): VerifiedToken | null {
  if (!token) return null;
  const parts = token.split(".");
  if (parts.length !== 3) return null;
  const [version, encoded, signature] = parts;
  if (version !== TOKEN_VERSION) return null;

  const expected = sign(`${version}.${encoded}`);
  if (!safeEqualHex(signature, expected)) return null;

  const raw = base64UrlDecode(encoded);
  if (!raw) return null;

  let payload: TokenPayload;
  try {
    payload = JSON.parse(raw) as TokenPayload;
  } catch {
    return null;
  }

  if (payload.v !== 1 || payload.p !== purpose) return null;
  if (typeof payload.s !== "string" || payload.s.length === 0 || payload.s.length > 200) return null;
  if (!Number.isSafeInteger(payload.e) || payload.e <= Date.now()) return null;

  return { subject: payload.s, expires: payload.e };
}

/* ---------------- signed session token ---------------- */

export function createSessionToken(userId: string): string {
  return createSignedToken("session", userId, SESSION_DAYS * 86400_000);
}

export function verifySessionToken(token: string | undefined | null): string | null {
  return verifySignedToken(token, "session")?.subject ?? null;
}

/* ---------------- short-lived resource tokens ---------------- */

export function createOrderAccessToken(orderId: string): string {
  return createSignedToken("order_access", orderId, 7 * 86400_000);
}

export function verifyOrderAccessToken(token: string | undefined | null): string | null {
  return verifySignedToken(token, "order_access")?.subject ?? null;
}

export function createReviewAccessToken(orderId: string): string {
  return createSignedToken("review_access", orderId, 30 * 86400_000);
}

export function verifyReviewAccessToken(token: string | undefined | null): string | null {
  return verifySignedToken(token, "review_access")?.subject ?? null;
}

export function createCartLeadToken(phone: string): string {
  return createSignedToken("cart_lead", phone, 24 * 3600_000);
}

export function verifyCartLeadToken(token: string | undefined | null): string | null {
  return verifySignedToken(token, "cart_lead")?.subject ?? null;
}

/* ---------------- request helpers ---------------- */

export async function getSessionUserId(): Promise<string | null> {
  const store = await cookies();
  return verifySessionToken(store.get(SESSION_COOKIE)?.value);
}

export async function getCurrentUser(): Promise<Profile | null> {
  const id = await getSessionUserId();
  if (!id) return null;
  return getStore().getUserById(id);
}

export async function setSessionCookie(userId: string): Promise<void> {
  const jar = await cookies();
  jar.set(SESSION_COOKIE, createSessionToken(userId), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: SESSION_DAYS * 86400,
  });
}

export async function clearSessionCookie(): Promise<void> {
  const jar = await cookies();
  jar.delete(SESSION_COOKIE);
}

/** Returns null when the caller is not an admin. */
export async function requireAdmin(): Promise<Profile | null> {
  const user = await getCurrentUser();
  if (!user || user.role !== "admin") return null;
  return user;
}
