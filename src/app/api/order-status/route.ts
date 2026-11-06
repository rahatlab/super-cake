import { NextResponse } from "next/server";
import { getStore } from "@/lib/store";
import { rateLimit, clientIp } from "@/lib/rate-limit";

/**
 * Fallback status endpoint for the tracking page (used when Supabase Realtime
 * isn't configured). Returns status only — never customer names, addresses or
 * items — and still requires the checkout phone number.
 */
export async function POST(request: Request) {
  const ip = clientIp(request.headers);
  if (!rateLimit(`order-status:${ip}`, 120, 60_000).ok) {
    return NextResponse.json({ error: "too_many_requests" }, { status: 429 });
  }

  let body: { order_no?: unknown; phone?: unknown } | null = null;
  try {
    body = (await request.json()) as { order_no?: unknown; phone?: unknown };
  } catch {
    return NextResponse.json({ error: "invalid_body" }, { status: 400 });
  }

  const orderNo = String(body?.order_no ?? "").trim();
  const phone = String(body?.phone ?? "").trim();
  if (!orderNo || !phone) {
    return NextResponse.json({ error: "missing_fields" }, { status: 400 });
  }

  const order = await getStore().getOrderByNo(orderNo);
  if (!order) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }

  const expected = order.phone.replace(/\D/g, "").slice(-10);
  const given = phone.replace(/\D/g, "").slice(-10);
  if (expected !== given) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }

  return NextResponse.json(
    {
      order_status: order.order_status,
      payment_status: order.payment_status,
      updated_at: order.updated_at,
    },
    { headers: { "Cache-Control": "no-store" } },
  );
}
