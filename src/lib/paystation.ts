/**
 * PayStation (paystation.com.bd) REST client + payment settlement.
 *
 * Docs: payment.md (initiate-payment / transaction-status / IPN).
 *
 * Security rules baked in here:
 *   - Merchant ID + password only ever read from server env vars.
 *   - The IPN is plain untrusted HTTP — `settlePayStationOrder` ALWAYS
 *     re-verifies through the transaction-status API (and amount match)
 *     before an order is marked paid, regardless of what the caller claims.
 *   - Settlement is idempotent: a paid order is never downgraded, and a
 *     repeated settle never inserts a second payment row.
 */
import { getStore } from "@/lib/store";
import { SITE } from "@/lib/constants";
import type { Order } from "@/lib/types";
import { notifyAdminNewOrder, notifyOrderConfirmation } from "@/lib/whatsapp";

const SANDBOX_BASE = "https://sandbox.paystation.com.bd";
const LIVE_BASE = "https://api.paystation.com.bd";

const REQUEST_TIMEOUT_MS = 15_000;

export function payStationConfigured(): boolean {
  return Boolean(
    process.env.PAYSTATION_MERCHANT_ID?.trim() && process.env.PAYSTATION_PASSWORD?.trim(),
  );
}

/** Sandbox by default; set PAYSTATION_BASE_URL (or PAYSTATION_LIVE=true) for production. */
export function payStationBaseUrl(): string {
  const raw = (process.env.PAYSTATION_BASE_URL ?? "").trim().replace(/\/+$/, "");
  if (raw) return raw;
  return process.env.PAYSTATION_LIVE === "true" ? LIVE_BASE : SANDBOX_BASE;
}

/** Where PayStation sends the customer back after hosted checkout. */
export function payStationCallbackUrl(): string {
  return `${SITE.url.replace(/\/+$/, "")}/payment/callback`;
}

function credentials(): { merchantId: string; password: string } | null {
  const merchantId = process.env.PAYSTATION_MERCHANT_ID?.trim();
  const password = process.env.PAYSTATION_PASSWORD?.trim();
  if (!merchantId || !password) return null;
  return { merchantId, password };
}

/* ---------------- initiate ---------------- */

export interface InitiateInput {
  invoice_number: string;
  payment_amount: number;
  cust_name: string;
  cust_phone: string;
  cust_email: string;
  cust_address?: string;
  checkout_items?: string;
}

export type InitiateResult = { ok: true; payment_url: string } | { ok: false; error: string };

export async function initiatePayStation(input: InitiateInput): Promise<InitiateResult> {
  const creds = credentials();
  if (!creds) return { ok: false, error: "PayStation credentials সেট করা নেই" };

  const body = new URLSearchParams({
    merchantId: creds.merchantId,
    password: creds.password,
    invoice_number: input.invoice_number,
    currency: "BDT",
    payment_amount: String(Math.round(input.payment_amount)),
    // 0 = merchant absorbs the gateway charge.
    pay_with_charge: "0",
    cust_name: input.cust_name,
    cust_phone: input.cust_phone,
    cust_email: input.cust_email,
    callback_url: payStationCallbackUrl(),
  });
  if (input.cust_address) body.set("cust_address", input.cust_address);
  if (input.checkout_items) body.set("checkout_items", input.checkout_items);

  try {
    const res = await fetch(`${payStationBaseUrl()}/initiate-payment`, {
      method: "POST",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body,
      cache: "no-store",
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    });

    const json = (await res.json().catch(() => null)) as {
      status_code?: number | string;
      status?: string;
      message?: string;
      payment_url?: string;
    } | null;

    if (!res.ok || !json) {
      return { ok: false, error: `PayStation HTTP ${res.status}` };
    }
    if (String(json.status_code) === "200" && json.payment_url) {
      return { ok: true, payment_url: json.payment_url };
    }
    return {
      ok: false,
      error: `${json.status_code ?? res.status} ${json.message ?? "initiate failed"}`.trim(),
    };
  } catch (e) {
    return { ok: false, error: (e as Error).message || "network error" };
  }
}

/* ---------------- status ---------------- */

export type TrxStatus = "processing" | "success" | "failed" | "refund";

export interface StatusResult {
  /** false = the API call itself failed (network / auth); see `error`. */
  ok: boolean;
  status?: TrxStatus;
  amount?: number;
  trxId?: string | null;
  paymentMethod?: string | null;
  error?: string;
}

/**
 * The docs promise `processing | success | failed | refund`, but the API
 * actually answers `successful` for a completed payment and the IPN has been
 * documented as `Success`. Map every known spelling onto the canonical four —
 * otherwise a paid order silently fails to settle.
 */
const TRX_STATUS_ALIASES: Record<string, TrxStatus> = {
  processing: "processing",
  pending: "processing",
  initiated: "processing",
  success: "success",
  successful: "success",
  complete: "success",
  completed: "success",
  paid: "success",
  failed: "failed",
  failure: "failed",
  refund: "refund",
  refunded: "refund",
};

/** Canonical status for any gateway spelling; undefined = value we don't know. */
export function normalizeTrxStatus(value: unknown): TrxStatus | undefined {
  return TRX_STATUS_ALIASES[String(value ?? "").trim().toLowerCase()];
}

/** True only for an explicitly successful transaction (never for unknowns). */
export function isSuccessfulTrxStatus(value: unknown): boolean {
  return normalizeTrxStatus(value) === "success";
}

export async function getPayStationStatus(invoiceNumber: string): Promise<StatusResult> {
  const creds = credentials();
  if (!creds) return { ok: false, error: "not_configured" };

  try {
    const res = await fetch(`${payStationBaseUrl()}/transaction-status`, {
      method: "POST",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/x-www-form-urlencoded",
        merchantId: creds.merchantId,
      },
      body: new URLSearchParams({ invoice_number: invoiceNumber }),
      cache: "no-store",
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    });

    const json = (await res.json().catch(() => null)) as {
      status_code?: number | string;
      message?: string;
      data?: {
        trx_status?: string;
        payment_amount?: number | string;
        trx_amount?: number | string;
        trx_id?: string;
        payment_method?: string;
      };
    } | null;

    if (!res.ok || !json) return { ok: false, error: `HTTP ${res.status}` };
    if (String(json.status_code) !== "200" || !json.data) {
      return { ok: false, error: `${json.status_code ?? res.status} ${json.message ?? ""}`.trim() };
    }

    const rawStatus = String(json.data.trx_status ?? "").trim();
    const status = normalizeTrxStatus(rawStatus);
    if (!status) {
      // Unknown spelling: fail closed (never mark paid) but leave a trace.
      console.warn("[paystation] unknown trx_status", JSON.stringify(rawStatus), invoiceNumber);
    }
    const amountRaw = json.data.payment_amount ?? json.data.trx_amount;
    const amount = amountRaw != null && amountRaw !== "" ? Number(amountRaw) : undefined;

    return {
      ok: true,
      status,
      amount: amount != null && Number.isFinite(amount) ? amount : undefined,
      trxId: json.data.trx_id ?? null,
      paymentMethod: json.data.payment_method ?? null,
    };
  } catch (e) {
    return { ok: false, error: (e as Error).message || "network error" };
  }
}

/* ---------------- settlement ---------------- */

export type SettleReason =
  | "paid"
  | "refunded"
  | "unknown_invoice"
  | "not_paystation"
  | "not_configured"
  | "api_error"
  | "processing"
  | "not_success"
  | "amount_mismatch";

export interface SettleResult {
  /** true when the local record now reflects the gateway's verdict. */
  ok: boolean;
  reason: SettleReason;
  order?: Order;
}

interface SettleOptions {
  /** Who is asking — callback page or IPN webhook (for logs). */
  source?: "callback" | "ipn";
  /** Cross-check amount claimed by the IPN payload (untrusted — API still verified). */
  ipnAmount?: number;
  /** Gateway transaction id from the IPN (untrusted — informational only). */
  ipnTrxId?: string;
}

/**
 * Verify an invoice against PayStation and settle the local order.
 *
 * Used by the browser callback page AND the IPN webhook. Never trusts the
 * caller: the gateway status + amount are always re-checked server side.
 */
export async function settlePayStationOrder(
  invoiceNumber: string,
  opts: SettleOptions = {},
): Promise<SettleResult> {
  const invoice = String(invoiceNumber ?? "").trim();
  if (!invoice) return { ok: false, reason: "unknown_invoice" };
  if (!payStationConfigured()) return { ok: false, reason: "not_configured" };

  const store = getStore();
  const order = await store.getOrderByNo(invoice);
  if (!order) return { ok: false, reason: "unknown_invoice" };
  if (order.payment_method !== "paystation") return { ok: false, reason: "not_paystation" };

  // Idempotency: an already-paid order is never touched again (IPN retries).
  if (order.payment_status === "paid") return { ok: true, reason: "paid", order };

  const status = await getPayStationStatus(invoice);
  if (!status.ok) {
    console.error("[paystation] status check failed for", invoice, status.error);
    return { ok: false, reason: "api_error", order };
  }

  if (status.status === "refund") {
    if (order.payment_status === "refunded") return { ok: true, reason: "refunded", order };
    const refunded = await store.updateOrder(order.id, { payment_status: "refunded" });
    return { ok: true, reason: "refunded", order: refunded };
  }

  if (status.status !== "success") {
    return { ok: false, reason: status.status === "processing" ? "processing" : "not_success", order };
  }

  // Amount checks — gateway figure first, then whatever the IPN claimed.
  const expected = Math.round(order.total);
  if (status.amount != null && Math.round(status.amount) !== expected) {
    console.error(
      "[paystation] amount mismatch (api)", invoice, status.amount, "expected", expected,
    );
    return { ok: false, reason: "amount_mismatch", order };
  }
  if (opts.ipnAmount != null && Number.isFinite(opts.ipnAmount) && Math.round(opts.ipnAmount) !== expected) {
    console.error(
      "[paystation] amount mismatch (ipn)", invoice, opts.ipnAmount, "expected", expected,
    );
    return { ok: false, reason: "amount_mismatch", order };
  }

  const trxId = status.trxId || opts.ipnTrxId || null;

  try {
    await store.updateOrder(order.id, { payment_status: "paid" });
  } catch (e) {
    console.error("[paystation] order update failed", invoice, (e as Error).message);
    return { ok: false, reason: "api_error", order };
  }

  // Payment ledger row — best effort, the order itself is already settled.
  try {
    const existing = await store.listPayments({ orderId: order.id });
    const row = existing.find((p) => p.method === "paystation");
    if (row) {
      if (row.status !== "paid") {
        await store.updatePayment(row.id, { status: "paid", trx_id: row.trx_id ?? trxId });
      }
    } else {
      await store.createPayment({
        order_id: order.id,
        method: "paystation",
        amount: expected,
        trx_id: trxId,
        status: "paid",
      });
    }
  } catch (e) {
    console.error("[paystation] payment row failed for", invoice, (e as Error).message);
  }

  const settled = await store.getOrderById(order.id).catch(() => null);
  const finalOrder = settled ?? order;

  // Send the admin + customer WhatsApp confirmation exactly once, only after
  // the gateway has confirmed payment. The timestamp makes IPN + callback
  // races idempotent.
  if (!finalOrder.confirmation_sent_at) {
    try {
      const settings = await store.getSettings();
      await store.updateOrder(finalOrder.id, {
        confirmation_sent_at: new Date().toISOString(),
      });
      await Promise.allSettled([
        notifyAdminNewOrder(settings.whatsapp_phone, finalOrder.order_no, finalOrder.total, finalOrder.id),
        notifyOrderConfirmation({ order: finalOrder }),
      ]);
      await store
        .createNotification({
          type: "payment",
          title: "PayStation পেমেন্ট সফল",
          message: `${finalOrder.order_no} — ${finalOrder.customer_name} ৳${finalOrder.total} পেমেন্ট করেছেন।`,
        })
        .catch(() => undefined);
    } catch (e) {
      console.error("[paystation] confirmation notify failed", invoice, (e as Error).message);
    }
  }

  return { ok: true, reason: "paid", order: finalOrder };
}
