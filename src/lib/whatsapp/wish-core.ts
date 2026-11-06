import type { Profile } from "../types.ts";

export type WishKind = "birthday" | "anniversary";

/** Personal promo gift attached to every auto-wish. */
export const WISH_PROMO = {
  percent: 10,
  minOrder: 1000,
  maxDiscount: 800,
  validDays: 7,
} as const;

/**
 * Is `kind` due today for this profile?
 *
 * - month+day must match the stored date (the year is a birth year / wedding
 *   year, so only the recurrence matters),
 * - one greeting per calendar year: when `last_*_wish` already carries this
 *   year's date the daily cron must not fire again.
 *
 * Pure by design — unit-testable without the store or Meta.
 */
export function isWishDue(profile: Profile, kind: WishKind, today: string): boolean {
  const date = kind === "birthday" ? profile.birthdate : profile.anniversary_date;
  if (!date || date.length < 10) return false;

  const [y, m, d] = today.split("-");
  const [, mm, dd] = date.split("-");
  if (m !== mm || d !== dd) return false;

  const last = kind === "birthday" ? profile.last_birthday_wish : profile.last_anniversary_wish;
  if (last && last.slice(0, 4) === y) return false;

  return true;
}
