import { toE164 } from "@/lib/utils";
import { waDb } from "./db";
import type { OrderOccasion, OrderSlot } from "./order-request";

/**
 * A WhatsApp order being collected across several messages.
 *
 * Meta caps button ids at 256 bytes, so the free-text details (address,
 * phone, date) cannot ride on the confirm button — the draft persists
 * between messages instead. One open draft per customer phone number.
 *
 * Stored as a `whatsapp_messages` row with `type='order_draft'` (status
 * `skipped`, JSON in `detail`) so no migration is needed; the admin log
 * filters these rows out. Falls back to an in-process map when Supabase is
 * not configured (local dev / E2E).
 */
export interface OrderDraft {
  cakeId: string;
  quantity: number;
  weight?: number;
  occasion: OrderOccasion;
  /** `YYYY-MM-DD` — only once the customer has named a date. */
  deliveryDate?: string;
  slot?: OrderSlot;
  address?: string;
  phone?: string;
  updatedAt: string;
}

const DRAFT_TYPE = "order_draft";

/** In-process fallback for environments without Supabase. */
const memoryDrafts = new Map<string, OrderDraft>();

function draftKey(phone: string): string {
  return toE164(phone);
}

function parseDraft(detail: unknown): OrderDraft | null {
  if (typeof detail !== "string") return null;
  try {
    const parsed = JSON.parse(detail) as Partial<OrderDraft>;
    if (
      typeof parsed.cakeId === "string" &&
      parsed.cakeId.length > 0 &&
      Number.isInteger(parsed.quantity) &&
      (parsed.quantity as number) >= 1 &&
      (parsed.quantity as number) <= 20
    ) {
      return parsed as OrderDraft;
    }
  } catch {
    // Corrupt row — treat as no draft; the customer is simply asked again.
  }
  return null;
}

/** The open draft for this customer, or null. Never throws. */
export async function loadOrderDraft(phone: string): Promise<OrderDraft | null> {
  const key = draftKey(phone);
  const db = waDb();
  if (!db) return memoryDrafts.get(key) ?? null;

  try {
    const { data, error } = await db
      .from("whatsapp_messages")
      .select("detail")
      .eq("type", DRAFT_TYPE)
      .eq("to_phone", key)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (error) {
      console.warn("[whatsapp draft] load failed:", error.message);
      return memoryDrafts.get(key) ?? null;
    }
    return data ? parseDraft(data.detail) : null;
  } catch (e) {
    console.warn("[whatsapp draft] load failed:", (e as Error).message);
    return memoryDrafts.get(key) ?? null;
  }
}

/** Create or replace the open draft. Best-effort: a failed save degrades to
 * "the customer is asked for details again", never to an order without them. */
export async function saveOrderDraft(phone: string, draft: OrderDraft): Promise<void> {
  const key = draftKey(phone);
  memoryDrafts.set(key, draft);

  const db = waDb();
  if (!db) return;
  try {
    // One draft per phone — replace the previous row instead of piling up.
    const { error: delError } = await db
      .from("whatsapp_messages")
      .delete()
      .eq("type", DRAFT_TYPE)
      .eq("to_phone", key);
    if (delError) console.warn("[whatsapp draft] replace (delete old) failed:", delError.message);

    const { error } = await db.from("whatsapp_messages").insert({
      type: DRAFT_TYPE,
      to_phone: key,
      status: "skipped",
      detail: JSON.stringify(draft),
    });
    if (error) console.warn("[whatsapp draft] save failed:", error.message);
  } catch (e) {
    console.warn("[whatsapp draft] save failed:", (e as Error).message);
  }
}

/** Drop the open draft (cancelled, superseded, or converted to an order). */
export async function clearOrderDraft(phone: string): Promise<void> {
  const key = draftKey(phone);
  memoryDrafts.delete(key);

  const db = waDb();
  if (!db) return;
  try {
    const { error } = await db
      .from("whatsapp_messages")
      .delete()
      .eq("type", DRAFT_TYPE)
      .eq("to_phone", key);
    if (error) console.warn("[whatsapp draft] clear failed:", error.message);
  } catch (e) {
    console.warn("[whatsapp draft] clear failed:", (e as Error).message);
  }
}
