import { NextResponse } from "next/server";
import { WHATSAPP } from "@/lib/constants";
import { notifyAbandonedCart } from "@/lib/whatsapp";
import {
  claimCartForReminder,
  listAbandonedCartsForReminder,
  releaseCartReminder,
} from "@/lib/whatsapp/cart";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

const BATCH_LIMIT = 25;

function authorized(req: Request): boolean {
  const auth = req.headers.get("authorization");
  return Boolean(WHATSAPP.cronSecret) && auth === `Bearer ${WHATSAPP.cronSecret}`;
}

async function run(req: Request) {
  // Vercel Cron calls GET; manual triggers can use POST. Both need the secret,
  // and neither is cached.
  if (!authorized(req)) {
    return NextResponse.json(
      { ok: false, error: "unauthorized" },
      { status: 401, headers: { "Cache-Control": "no-store" } },
    );
  }

  const carts = (await listAbandonedCartsForReminder()).slice(0, BATCH_LIMIT);
  let sent = 0;
  let failed = 0;
  let skipped = 0;

  for (const cart of carts) {
    // Atomic claim: two overlapping runs cannot send the same reminder.
    const claimed = await claimCartForReminder(cart.id);
    if (!claimed) {
      skipped += 1;
      continue;
    }

    const itemName = cart.items?.[0]?.name ?? "আপনার পছন্দের কেক";
    const result = await notifyAbandonedCart({
      phone: cart.phone,
      itemName,
      cartId: cart.id,
    });

    if (result.ok) {
      sent += 1;
    } else {
      failed += 1;
      // Release the claim so a later run can retry.
      await releaseCartReminder(cart.id);
    }
  }

  return NextResponse.json(
    {
      ok: true,
      total: carts.length,
      sent,
      failed,
      skipped,
      batchLimit: BATCH_LIMIT,
    },
    { headers: { "Cache-Control": "no-store" } },
  );
}

export async function GET(req: Request) {
  return run(req);
}

export async function POST(req: Request) {
  return run(req);
}
