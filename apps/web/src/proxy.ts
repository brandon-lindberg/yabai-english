import createMiddleware from "next-intl/middleware";
import { routing } from "./i18n/routing";

// Next.js 16 renamed the `middleware` file convention to `proxy`.
// https://nextjs.org/docs/messages/middleware-to-proxy
export default createMiddleware(routing);

export const config = {
  matcher: [
    "/",
    "/(ja|en)/:path*",
    // `~offline` is the locale-less service worker fallback page; routing it
    // through next-intl would redirect it to /en/~offline which 404s and
    // breaks the service worker's install-time precache.
    "/((?!api|trpc|_next|_vercel|~offline|.*\\..*).*)",
  ],
};
