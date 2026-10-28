import { toE164 } from "@/lib/utils";
import { waDb } from "./db";

export type WhatsAppLogStatus = "sent" | "failed" | "skipped";

export interface WhatsAppLogInput {
  type: string;
  to: string;
  status: WhatsAppLogStatus;
  detail?: string;
  templateName?: string;
  orderId?: string | null;
  cartId?: string | null;
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
    });
    if (error) console.warn("[whatsapp] log insert failed:", error.message);
  } catch (e) {
    console.warn("[whatsapp] log insert failed:", (e as Error).message);
  }
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
