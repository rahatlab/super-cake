import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Tiny session probe for client components (currently the header).
 *
 * The site layout used to call `getCurrentUser()` directly, which reads
 * `cookies()` and — in the non-Cache-Components model — forced *every* page in
 * the `(site)` group to render dynamically on each request. Moving that check
 * behind this endpoint lets the marketing pages be prerendered/ISR while the
 * header still knows whether to show "লগইন" or "Dashboard".
 */
export async function GET() {
  const user = await getCurrentUser();

  return NextResponse.json(
    { user: user ? { name: user.name, role: user.role } : null },
    { headers: { "Cache-Control": "public, max-age=10, s-maxage=10" } },
  );
}
