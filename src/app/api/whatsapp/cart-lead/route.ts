import { NextResponse } from "next/server";
import { verifyCartLeadToken } from "@/lib/auth";
import { rateLimit, clientIp } from "@/lib/rate-limit";
import { cartLeadSchema } from "@/lib/validators";
import { phoneKey } from "@/lib/utils";
import { saveCartLead, type CartLeadItem } from "@/lib/whatsapp/cart";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const ip = clientIp(req.headers);
  if (!rateLimit(`cart-lead:${ip}`, 12, 60_000).ok) {
    return NextResponse.json({ ok: false, error: "rate_limited" }, { status: 429 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: "invalid_json" }, { status: 400 });
  }

  const parsed = cartLeadSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ ok: false, error: "invalid" }, { status: 400 });
  }

  const { token, customer_name, items, subtotal, opted_in } = parsed.data;
  const phone = verifyCartLeadToken(token);
  if (!phone) {
    return NextResponse.json({ ok: false, error: "invalid_token" }, { status: 401 });
  }

  if (!rateLimit(`cart-lead-phone:${phoneKey(phone)}`, 6, 10 * 60_000).ok) {
    return NextResponse.json({ ok: false, error: "rate_limited" }, { status: 429 });
  }

  // The checkbox is consent to receive a confirmation; the actual reminder
  // requires a WhatsApp START reply (double opt-in, handled by the webhook).
  if (!opted_in) {
    return NextResponse.json({ ok: true, mode: "skipped" });
  }

  const safeItems: CartLeadItem[] = items.map((item) => ({
    cake_id: typeof item.cake_id === "string" ? item.cake_id.slice(0, 100) : undefined,
    name: typeof item.name === "string" ? item.name.slice(0, 120) : undefined,
    quantity: typeof item.quantity === "number" ? item.quantity : 1,
  }));

  try {
    const result = await saveCartLead({
      phone,
      customer_name: customer_name?.slice(0, 80),
      items: safeItems,
      subtotal,
      opted_in: true,
    });
    return NextResponse.json(result);
  } catch (e) {
    console.error("[cart-lead]", (e as Error).message);
    return NextResponse.json({ ok: false, error: "server_error" }, { status: 500 });
  }
}
