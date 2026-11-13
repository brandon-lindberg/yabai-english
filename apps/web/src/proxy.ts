import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import createMiddleware from "next-intl/middleware";
import { routing } from "./i18n/routing";
import { clientIpFromHeaders, shouldBlockAdminRequest } from "./lib/admin-ip-allowlist";
import { configuredLearningSites, learningSiteForHost, learningSiteHref, learningSitePathLanguage } from "./lib/learning-sites";

const intlMiddleware = createMiddleware(routing);

// Next.js 16 renamed the `middleware` file convention to `proxy`.
// https://nextjs.org/docs/messages/middleware-to-proxy
export default function proxy(request: NextRequest) {
  const sites = configuredLearningSites();
  if (sites) {
    const host = request.headers.get("host") ?? request.nextUrl.host;
    const site = learningSiteForHost(host, sites);
    if (!site) return new NextResponse("Unrecognized learning site", { status: 421 });
    const forwardedHost = request.headers.get("x-forwarded-host");
    if (forwardedHost && learningSiteForHost(forwardedHost, sites)?.origin !== site.origin) {
      return new NextResponse("Conflicting learning-site host", { status: 421 });
    }
    const pathLanguage = learningSitePathLanguage(request.nextUrl.pathname);
    if (pathLanguage && pathLanguage !== site.learningLanguage) {
      const href = learningSiteHref(sites, pathLanguage, `${request.nextUrl.pathname}${request.nextUrl.search}`);
      if (request.nextUrl.pathname.startsWith("/api/") || !["GET", "HEAD"].includes(request.method)) {
        return NextResponse.json({ error: "WRONG_LEARNING_SITE", destination: href }, { status: 403 });
      }
      return NextResponse.redirect(href, 307);
    }
    if (site.learningLanguage && /^\/(en\/|ja\/)?learn-(english|japanese)\/?$/.test(request.nextUrl.pathname)) {
      return NextResponse.redirect(learningSiteHref(sites, site.learningLanguage, `${request.nextUrl.pathname}${request.nextUrl.search}`), 307);
    }
    // Next's dev server can normalize a loopback request URL to localhost;
    // canonicalize the actual allowlisted Host, not that internal URL.
    if (["GET", "HEAD"].includes(request.method) && host.toLowerCase() !== new URL(site.origin).host) {
      return NextResponse.redirect(new URL(`${request.nextUrl.pathname}${request.nextUrl.search}`, site.origin), 307);
    }
  }
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
    "/api/:path*",
    // `~offline` is the locale-less service worker fallback page; routing it
    // through next-intl would redirect it to /en/~offline which 404s and
    // breaks the service worker's install-time precache.
    "/((?!api|trpc|_next|_vercel|~offline|.*\\..*).*)",
  ],
};
