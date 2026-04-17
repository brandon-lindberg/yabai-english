import createMiddleware from "next-intl/middleware";
import { routing } from "./i18n/routing";

// Next.js 16 renamed the `middleware` file convention to `proxy`.
// https://nextjs.org/docs/messages/middleware-to-proxy
export default createMiddleware(routing);

export const config = {
  matcher: [
    "/",
    "/(ja|en)/:path*",
    "/((?!api|trpc|_next|_vercel|.*\\..*).*)",
  ],
};
