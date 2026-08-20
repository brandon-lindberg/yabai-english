import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import createMiddleware from "next-intl/middleware";
import { routing } from "./i18n/routing";
import { clientIpFromHeaders, shouldBlockAdminRequest } from "./lib/admin-ip-allowlist";

const intlMiddleware = createMiddleware(routing);

// Next.js 16 renamed the `middleware` file convention to `proxy`.
// https://nextjs.org/docs/messages/middleware-to-proxy
export default function proxy(request: NextRequest) {
  // Optional IP allowlist for SUPER_ADMIN surfaces (ADMIN_IP_ALLOWLIST env var).
  if (
    shouldBlockAdminRequest({
      pathname: request.nextUrl.pathname,
      clientIp: clientIpFromHeaders(request.headers),
      allowlistRaw: process.env.ADMIN_IP_ALLOWLIST,
    })
  ) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  if (request.nextUrl.pathname.startsWith("/api/")) {
    return NextResponse.next();
  }

  return intlMiddleware(request);
}

export const config = {
  matcher: [
    "/",
    "/(ja|en)/:path*",
    "/api/admin/:path*",
    // `~offline` is the locale-less service worker fallback page; routing it
    // through next-intl would redirect it to /en/~offline which 404s and
    // breaks the service worker's install-time precache.
    "/((?!api|trpc|_next|_vercel|~offline|.*\\..*).*)",
  ],
};
