import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { getStore } from "@/lib/store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const admin = await requireAdmin();
  if (!admin) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const store = getStore();
  const [notifications, reviews, orders] = await Promise.all([
    store.listNotifications(),
    store.listReviews(),
    store.listOrders(),
  ]);

  const unread = notifications.filter((n) => !n.is_read).length;
  const pendingReviews = reviews.filter((r) => !r.is_approved).length;
  const pendingPayments = orders.filter((o) => o.payment_status === "pending_verify").length;
  const pendingOrders = orders.filter((o) =>
    ["pending", "confirmed", "baking"].includes(o.order_status),
  ).length;

  return NextResponse.json(
    { unread, pendingReviews, pendingPayments, pendingOrders },
    { headers: { "Cache-Control": "no-store" } },
  );
}
