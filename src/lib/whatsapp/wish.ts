import { getStore } from "@/lib/store";
import { dhakaDatePlus, dhakaDateString, toE164 } from "@/lib/utils";
import type { Profile } from "@/lib/types";
import { notifyWish } from "@/lib/whatsapp";
import { waDb } from "./db";
import { WISH_PROMO, isWishDue, type WishKind } from "./wish-core";

export { isWishDue, WISH_PROMO };
export type { WishKind };

export interface WishSummary {
  sent: number;
  failed: number;
  skipped: number;
}

const KINDS: WishKind[] = ["birthday", "anniversary"];

/**
 * A unique, single-use promo code like `BDAY1103K7QX` / `ANNIV1103Z2P9`.
 * The date segment keeps codes readable in the customer's inbox; the random
 * suffix (retried on collision) keeps them unique across years.
 */
async function ensureWishPromo(kind: WishKind, day: string): Promise<{
  code: string;
  percent: number;
  maxDiscount: number;
  expiresAt: string;
} | null> {
  const store = getStore();
  const prefix = kind === "birthday" ? "BDAY" : "ANNIV";
  const stamp = day.slice(5).replace("-", "");
  const expiresAt = dhakaDatePlus(WISH_PROMO.validDays);

  for (let attempt = 0; attempt < 6; attempt++) {
    const suffix = Math.random().toString(36).slice(2, 6).toUpperCase();
    const code = `${prefix}${stamp}${suffix}`;
    try {
      const existing = await store.getPromoByCode(code);
      if (existing) continue;
      await store.createPromo({
        code,
        percent: WISH_PROMO.percent,
        min_order: WISH_PROMO.minOrder,
        max_discount: WISH_PROMO.maxDiscount,
        // One customer, one redemption — this code was minted for them.
        usage_limit: 1,
        expires_at: expiresAt,
        is_active: true,
      });
      return { code, percent: WISH_PROMO.percent, maxDiscount: WISH_PROMO.maxDiscount, expiresAt };
    } catch (e) {
      console.warn("[wishes] promo create failed:", (e as Error).message);
      return null;
    }
  }
  return null;
}

/** Customers who replied STOP — wishes are marketing, so honour the opt-out. */
async function optedOutPhones(): Promise<Set<string>> {
  const db = waDb();
  if (!db) return new Set();
  try {
    const { data, error } = await db.from("whatsapp_opt_outs").select("phone");
    if (error) {
      console.warn("[wishes] opt-out read failed:", error.message);
      return new Set();
    }
    return new Set((data ?? []).map((row) => toE164(row.phone)));
  } catch {
    return new Set();
  }
}

/**
 * Send today's birthday / anniversary wishes.
 *
 * Ordering matters: `markWishSent` runs *before* the send, so a crash or a
 * timeout mid-batch never produces a second greeting the same day (a lost
 * message is strictly better than an embarrassing duplicate).
 *
 * Called by the daily cron (`/api/cron/abandoned-carts`), which Vercel Hobby
 * allows only one schedule per day.
 */
export async function sendDueWishes(limit = 25): Promise<WishSummary> {
  const summary: WishSummary = { sent: 0, failed: 0, skipped: 0 };
  if (!canSendWishes()) return summary;

  const store = getStore();
  const today = dhakaDateString();
  const optedOut = await optedOutPhones();

  let users: Profile[];
  try {
    users = await store.listUsers();
  } catch (e) {
    console.warn("[wishes] user list failed:", (e as Error).message);
    return summary;
  }

  for (const user of users) {
    if (summary.sent >= limit) break;
    if (!user.phone || optedOut.has(toE164(user.phone))) continue;

    for (const kind of KINDS) {
      if (summary.sent >= limit) break;
      if (!isWishDue(user, kind, today)) continue;

      // Stamp first — see the doc comment above. `false` means another run
      // already claimed today for this profile; don't send twice.
      try {
        const claimed = await store.markWishSent(user.id, kind, today);
        if (!claimed) {
          summary.skipped += 1;
          break;
        }
      } catch (e) {
        console.warn("[wishes] stamp failed:", (e as Error).message);
        // Without the stamp two overlapping runs could both send; abort this
        // profile rather than risk a duplicate.
        break;
      }

      const promo = await ensureWishPromo(kind, today);
      if (!promo) {
        summary.skipped += 1;
        break;
      }

      const result = await notifyWish({
        phone: user.phone,
        name: user.name,
        kind,
        code: promo.code,
        percent: promo.percent,
        maxDiscount: promo.maxDiscount,
        expiresAt: promo.expiresAt,
      });

      if (result.ok) summary.sent += 1;
      else {
        summary.failed += 1;
        console.warn(
          `[wishes] ${kind} wish to ${user.phone} failed:`,
          result.detail?.slice(0, 300) ?? "unknown",
        );
      }
    }
  }

  return summary;
}

/**
 * Wishes need the Cloud API (they go out to cold numbers, so an approved
 * template is required). With automation off there is nothing to send.
 */
function canSendWishes(): boolean {
  const token = process.env.WHATSAPP_TOKEN;
  const phoneId = process.env.WHATSAPP_PHONE_ID;
  const enabled = process.env.WHATSAPP_AUTOMATION_ENABLED !== "false";
  return Boolean(enabled && token && phoneId);
}
