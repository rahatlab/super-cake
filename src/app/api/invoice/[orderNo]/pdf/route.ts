import { NextResponse } from "next/server";
import { getCachedSettings } from "@/lib/store/cache";
import { getAccessibleOrder } from "@/lib/invoice-access";
import { InvoiceDocument } from "@/lib/invoice-pdf";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * One-click downloadable invoice PDF (A4, Bengali font embedded).
 * Same access rules as the invoice page (token / phone / session / admin).
 */
export async function GET(
  req: Request,
  ctx: { params: Promise<{ orderNo: string }> },
) {
  const { orderNo } = await ctx.params;
  const q = new URL(req.url).searchParams;
  const order = await getAccessibleOrder({
    orderNo,
    token: q.get("token"),
    phone: q.get("phone"),
  });
  if (!order) return new NextResponse("Invoice পাওয়া যায়নি", { status: 404 });

  const settings = await getCachedSettings();
  // Dynamic import keeps the heavy renderer out of the normal bundle.
  const { renderToBuffer } = await import("@react-pdf/renderer");
  const buffer = await renderToBuffer(InvoiceDocument({ order, settings }));

  return new NextResponse(new Uint8Array(buffer), {
    status: 200,
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="invoice-${order.order_no}.pdf"`,
      "Cache-Control": "private, no-store",
    },
  });
}
