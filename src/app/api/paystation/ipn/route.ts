import { NextResponse, after } from "next/server";
import { isSuccessfulTrxStatus, settlePayStationOrder } from "@/lib/paystation";
import { clientIp, rateLimit } from "@/lib/rate-limit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

interface IpnPayload {
  invoice_number?: unknown;
  trx_status?: unknown;
  trx_id?: unknown;
  trx_amount?: unknown;
  order_date_time?: unknown;
  payment_method?: unknown;
}

/**
 * PayStation IPN (unauthenticated JSON POST).
 *
 * The payload is treated as a *hint only*: we acknowledge with 200 quickly and
 * re-verify the invoice through the transaction-status API (plus amount match)
 * in `settlePayStationOrder`, which is idempotent — retries never double-mark
 * an order paid and never downgrade a paid order.
 */
export async function POST(request: Request) {
  const ip = clientIp(request.headers);
  if (!rateLimit(`paystation-ipn:${ip}`, 30, 60_000).ok) {
    // Gateway will retry later; nothing is lost by deferring.
    return NextResponse.json({ status: "rate_limited" }, { status: 429 });
  }

  let body: IpnPayload | null = null;
  try {
    body = (await request.json()) as IpnPayload;
  } catch {
    return NextResponse.json({ status: "invalid_json" }, { status: 400 });
  }

  const invoice = String(body?.invoice_number ?? "").trim();
  if (!invoice) {
    return NextResponse.json({ status: "missing_invoice" }, { status: 422 });
  }

  // The gateway's spelling varies (`Success` in the docs, `successful` from
  // the API) — accept any known success alias, settle() re-verifies anyway.
  const trxStatus = String(body?.trx_status ?? "").trim();
  if (!isSuccessfulTrxStatus(trxStatus)) {
    // IPN only fires for successes — anything else is logged and acknowledged.
    console.warn("[paystation] IPN with unexpected status:", trxStatus, invoice);
    return NextResponse.json({ status: "ignored" });
  }

  const amountRaw = Number(body?.trx_amount);
  const ipnAmount = Number.isFinite(amountRaw) ? amountRaw : undefined;
  const trxId = String(body?.trx_id ?? "").trim() || undefined;

  // Answer 2xx immediately; verify + settle outside the request cycle.
  after(async () => {
    try {
      const result = await settlePayStationOrder(invoice, {
        source: "ipn",
        ipnAmount,
        ipnTrxId: trxId,
      });
      console.log(
        "[paystation] IPN settled:",
        invoice,
        result.reason,
        result.ok ? "ok" : "not-settled",
      );
    } catch (e) {
      console.error("[paystation] IPN settle error:", invoice, (e as Error).message);
    }
  });

  return NextResponse.json({ status: "ok" });
}
