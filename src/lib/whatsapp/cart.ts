import { toE164 } from "@/lib/utils";
import { waDb } from "./db";

export interface CartLeadItem {
  name?: string;
  [key: string]: unknown;
}

export interface AbandonedCart {
  id: string;
  phone: string;
  customer_name?: string | null;
  items: CartLeadItem[];
  subtotal: number;
  last_activity: string;
  reminded_at?: string | null;
  converted_order_id?: string | null;
  opted_in: boolean;
  created_at: string;
}

export interface CartLeadInput {
  phone: string;
  customer_name?: string;
  items: CartLeadItem[];
  subtotal: number;
  opted_in: boolean;
}

export async function saveCartLead(
  input: CartLeadInput,
): Promise<{ ok: boolean; mode: "supabase" | "local" | "invalid" }> {
  const db = waDb();
  if (!db) return { ok: false, mode: "local" };

  const phone = toE164(input.phone);
  if (phone.length < 10 || phone.length > 15 || input.items.length === 0 || input.items.length > 20) {
    return { ok: false, mode: "invalid" };
  }

  try {
    const { data: existing, error: lookupError } = await db
      .from("abandoned_carts")
      .select("id")
      .eq("phone", phone)
      .maybeSingle();
    if (lookupError) {
      console.warn("[whatsapp] cart lead lookup failed:", lookupError.message);
      return { ok: false, mode: "local" };
    }

    const payload = {
      customer_name: input.customer_name?.trim() || null,
      items: input.items,
      subtotal: Math.max(0, Math.round(input.subtotal)),
      last_activity: new Date().toISOString(),
      reminded_at: null,
      converted_order_id: null,
    };

    // Never flip an existing customer back to opted-in — reminders require a
    // WhatsApp START reply (double opt-in) handled by the webhook.
    const { error } = existing
      ? await db.from("abandoned_carts").update(payload).eq("id", existing.id)
      : await db.from("abandoned_carts").insert({
          ...payload,
          phone,
          opted_in: false,
          created_at: new Date().toISOString(),
        });

    if (error) {
      console.warn("[whatsapp] cart lead save failed:", error.message);
      return { ok: false, mode: "local" };
    }
    return { ok: true, mode: "supabase" };
  } catch (e) {
    console.warn("[whatsapp] cart lead save failed:", (e as Error).message);
    return { ok: false, mode: "local" };
  }
}

/** Double opt-in: the customer replied START on WhatsApp. */
export async function markCartOptIn(phone: string): Promise<void> {
  const db = waDb();
  if (!db) return;
  try {
    const { error } = await db
      .from("abandoned_carts")
      .update({ opted_in: true })
      .eq("phone", toE164(phone));
    if (error) console.warn("[whatsapp] cart opt-in failed:", error.message);
  } catch (e) {
    console.warn("[whatsapp] cart opt-in failed:", (e as Error).message);
  }
}

export async function markCartConverted(phone: string, orderId: string): Promise<void> {
  const db = waDb();
  if (!db) return;
  try {
    const { error } = await db
      .from("abandoned_carts")
      .update({ converted_order_id: orderId, reminded_at: new Date().toISOString() })
      .eq("phone", toE164(phone));
    if (error) console.warn("[whatsapp] cart convert failed:", error.message);
  } catch (e) {
    console.warn("[whatsapp] cart convert failed:", (e as Error).message);
  }
}

export async function listAbandonedCartsForReminder(): Promise<AbandonedCart[]> {
  const db = waDb();
  if (!db) return [];

  const twoHoursAgo = new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString();
  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();

  try {
    const [{ data, error }, { data: optOuts }] = await Promise.all([
      db
        .from("abandoned_carts")
        .select("*")
        .eq("opted_in", true)
        .is("reminded_at", null)
        .is("converted_order_id", null)
        .lt("last_activity", twoHoursAgo)
        .gt("last_activity", sevenDaysAgo)
        .order("last_activity", { ascending: true })
        .limit(50),
      db.from("whatsapp_opt_outs").select("phone"),
    ]);

    if (error) {
      console.warn("[whatsapp] abandoned cart query failed:", error.message);
      return [];
    }

    const optedOut = new Set((optOuts ?? []).map((row) => row.phone));
    return ((data ?? []) as AbandonedCart[]).filter((cart) => !optedOut.has(cart.phone));
  } catch (e) {
    console.warn("[whatsapp] abandoned cart query failed:", (e as Error).message);
    return [];
  }
}

/** Atomically claim a cart so two cron runs cannot send the same reminder. */
export async function claimCartForReminder(id: string): Promise<boolean> {
  const db = waDb();
  if (!db) return false;
  try {
    const { data, error } = await db
      .from("abandoned_carts")
      .update({ reminded_at: new Date().toISOString() })
      .eq("id", id)
      .is("reminded_at", null)
      .select("id");
    if (error) {
      console.warn("[whatsapp] cart claim failed:", error.message);
      return false;
    }
    return (data ?? []).length === 1;
  } catch (e) {
    console.warn("[whatsapp] cart claim failed:", (e as Error).message);
    return false;
  }
}

export async function releaseCartReminder(id: string): Promise<void> {
  const db = waDb();
  if (!db) return;
  try {
    const { error } = await db.from("abandoned_carts").update({ reminded_at: null }).eq("id", id);
    if (error) console.warn("[whatsapp] cart release failed:", error.message);
  } catch (e) {
    console.warn("[whatsapp] cart release failed:", (e as Error).message);
  }
}
