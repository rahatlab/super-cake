import { NextResponse, type NextRequest } from "next/server";

/**
 * Next.js 16 renamed Middleware to Proxy (same file convention, Node.js runtime
 * by default). This file runs before routes render and handles two things:
 *
 *  1. Canonical host — strip `www.` in production so links, cookies and SEO all
 *     live on one origin.
 *  2. `/admin` gate — bounce anonymous visitors to the login page before any
 *     admin page or server action runs.
 *
 * The cookie check is a fast pre-filter only: a cookie can be forged, so the
 * real authorisation still happens in `requireAdmin()` (pages + every admin
 * action). Middleware on stale/revoked cookies is intentionally not trusted.
 */

const SESSION_COOKIE = "sc_session";

function canonicalHost(): string | null {
  const raw = process.env.NEXT_PUBLIC_SITE_URL;
  if (!raw) return null;
  try {
    return new URL(raw).host.toLowerCase();
  } catch {
    return null;
  }
}

export function proxy(request: NextRequest) {
  const { pathname, search, host } = request.nextUrl;
  const hostname = host.toLowerCase();

  // 1. www → apex, only in production and only when we know the canonical host.
  if (process.env.NODE_ENV === "production" && hostname.startsWith("www.")) {
    const apex = hostname.slice(4);

    if (!canonicalHost() || canonicalHost() === apex) {
      const url = request.nextUrl.clone();
      url.protocol = "https:";
      url.host = apex;
      return NextResponse.redirect(url, 308);
    }
  }

  // 2. Admin gate.
  if (pathname === "/admin" || pathname.startsWith("/admin/")) {
    const hasSession = Boolean(request.cookies.get(SESSION_COOKIE)?.value);
    if (!hasSession) {
      const login = new URL("/login", request.url);
      login.searchParams.set("next", `${pathname}${search}`);
      return NextResponse.redirect(login);
    }
  }

  const response = NextResponse.next();

  // Headers that complement the ones set in next.config.ts. `X-Robots-Tag`
  // keeps admin screens out of search results even if a page forgets its
  // metadata block.
  response.headers.set("X-DNS-Prefetch-Control", "off");
  response.headers.set("Cross-Origin-Opener-Policy", "same-origin");
  response.headers.set("X-Permitted-Cross-Domain-Policies", "none");
  if (pathname === "/admin" || pathname.startsWith("/admin/")) {
    response.headers.set("X-Robots-Tag", "noindex, nofollow");
    response.headers.set("Cache-Control", "private, no-store, max-age=0");
  }

  return response;
}

export const config = {
  /*
   * Everything except Next internals, API routes, static assets and public
   * files. API handlers do their own auth (signature/token checks) and must not
   * be redirected to an HTML login page.
   */
  matcher: [
    "/((?!api|_next/static|_next/image|favicon.ico|robots.txt|sitemap.xml|.*\\.(?:svg|png|jpg|jpeg|gif|webp|avif|ico|txt|xml|woff2?)$).*)",
  ],
};
