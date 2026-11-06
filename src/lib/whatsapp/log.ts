import { toE164 } from "@/lib/utils";
import { waDb } from "./db";

/**
 * Lifecycle of one outbound message.
 *
 * `sent` is written by us at send time; `delivered` / `read` / `failed` come
 * back later from Meta's `statuses` webhook callback.
 */
export type WhatsAppLogStatus =
  | "sent"
  | "delivered"
  | "read"
  | "failed"
  | "skipped";

export interface WhatsAppLogInput {
  type: string;
  to: string;
  status: WhatsAppLogStatus;
  detail?: string;
  templateName?: string;
  orderId?: string | null;
  cartId?: string | null;
  /** Meta `wamid.…` returned on send — the key used to match status callbacks. */
  metaMessageId?: string;
}

/** A row of the outbound log, as shown on /admin/whatsapp. */
export interface WhatsAppLogRow {
  id: string;
  order_id?: string | null;
  cart_id?: string | null;
  type: string;
  template_name?: string | null;
  to_phone: string;
  status: WhatsAppLogStatus;
  detail?: string | null;
  meta_message_id?: string | null;
  created_at: string;
}

/**
 * Best-effort message log. Never throws — WhatsApp delivery must not break
 * checkout or admin actions if the log table is missing.
 */
export async function logWhatsAppMessage(input: WhatsAppLogInput): Promise<void> {
  const phone = toE164(input.to);
  const db = waDb();

  if (!db) {
    console.log(
      `[whatsapp] ${input.status} ${input.type} -> ${phone}${input.detail ? ` (${input.detail})` : ""}`,
    );
    return;
  }

  try {
    const { error } = await db.from("whatsapp_messages").insert({
      order_id: input.orderId ?? null,
      cart_id: input.cartId ?? null,
      type: input.type,
      template_name: input.templateName ?? null,
      to_phone: phone,
      status: input.status,
      detail: input.detail ?? null,
      meta_message_id: input.metaMessageId ?? null,
    });
    if (error) console.warn("[whatsapp] log insert failed:", error.message);
  } catch (e) {
    console.warn("[whatsapp] log insert failed:", (e as Error).message);
  }
}

/**
 * Apply a delivery receipt from Meta's `statuses` webhook.
 *
 * Only ever moves a row forward (sent → delivered → read) and never downgrades
 * a `failed` row, so an out-of-order or replayed callback cannot corrupt the
 * log. Best-effort: the table may predate this column.
 */
export async function applyDeliveryStatus(
  metaMessageId: string,
  status: "sent" | "delivered" | "read" | "failed",
  errorDetail?: string,
): Promise<void> {
  const db = waDb();
  if (!db || !metaMessageId) return;

  const RANK: Record<string, number> = { sent: 1, delivered: 2, read: 3, failed: 99 };

  try {
    // Read the current row first so a stale callback cannot demote a newer one.
    const { data } = await db
      .from("whatsapp_messages")
      .select("id, status")
      .eq("meta_message_id", metaMessageId)
      .maybeSingle();
    if (!data) return;

    if ((RANK[status] ?? 0) <= (RANK[data.status] ?? 0)) return;

    const patch: { status: string; detail?: string } = { status };
    if (status === "failed") patch.detail = errorDetail ?? "Meta reported a failure";

    const { error } = await db
      .from("whatsapp_messages")
      .update(patch)
      .eq("id", data.id);
    if (error) console.warn("[whatsapp] status update failed:", error.message);
  } catch (e) {
    console.warn("[whatsapp] status update failed:", (e as Error).message);
  }
}

export interface WhatsAppLogQuery {
  limit?: number;
  status?: WhatsAppLogStatus;
  type?: string;
}

/** Recent outbound messages for the admin log screen (Supabase only). */
export async function listWhatsAppLogs(query: WhatsAppLogQuery = {}): Promise<WhatsAppLogRow[]> {
  const db = waDb();
  if (!db) return [];

  try {
    let builder = db
      .from("whatsapp_messages")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(Math.min(Math.max(query.limit ?? 100, 1), 500));
    if (query.status) builder = builder.eq("status", query.status);
    if (query.type) builder = builder.eq("type", query.type);

    const { data, error } = await builder;
    if (error) {
      console.warn("[whatsapp] log list failed:", error.message);
      return [];
    }
    return (data ?? []) as WhatsAppLogRow[];
  } catch (e) {
    console.warn("[whatsapp] log list failed:", (e as Error).message);
    return [];
  }
}

/** Counts per status for the summary cards on /admin/whatsapp. */
export async function summarizeWhatsAppLogs(): Promise<Record<string, number>> {
  const rows = await listWhatsAppLogs({ limit: 500 });
  const counts: Record<string, number> = {};
  for (const row of rows) counts[row.status] = (counts[row.status] ?? 0) + 1;
  return counts;
}

export async function isPhoneOptedOut(phone: string): Promise<boolean> {
  const db = waDb();
  if (!db) return false;
  const normalized = toE164(phone);
  try {
    const { data, error } = await db
      .from("whatsapp_opt_outs")
      .select("phone")
      .eq("phone", normalized)
      .maybeSingle();
    if (error) {
      console.warn("[whatsapp] opt-out lookup failed:", error.message);
      return false;
    }
    return Boolean(data);
  } catch (e) {
    console.warn("[whatsapp] opt-out lookup failed:", (e as Error).message);
    return false;
  }
}

export async function markPhoneOptedOut(phone: string, reason = "customer requested"): Promise<void> {
  const db = waDb();
  if (!db) return;
  const normalized = toE164(phone);
  try {
    const { error } = await db
      .from("whatsapp_opt_outs")
      .upsert({ phone: normalized, reason }, { onConflict: "phone" });
    if (error) console.warn("[whatsapp] opt-out save failed:", error.message);
  } catch (e) {
    console.warn("[whatsapp] opt-out save failed:", (e as Error).message);
  }
}

export async function markPhoneSubscribed(phone: string): Promise<void> {
  const db = waDb();
  if (!db) return;
  const normalized = toE164(phone);
  try {
    const { error } = await db.from("whatsapp_opt_outs").delete().eq("phone", normalized);
    if (error) console.warn("[whatsapp] opt-in save failed:", error.message);
  } catch (e) {
    console.warn("[whatsapp] opt-in save failed:", (e as Error).message);
  }
}
