import { resolveSafeCallbackUrl } from "@/lib/auth-callback-url";

/** Relative URL for the sign-in page with a validated `callbackUrl` query. */
export function authSignInHref(callbackPathAndQuery: string, fallback = "/dashboard"): string {
  const safe = resolveSafeCallbackUrl(callbackPathAndQuery, fallback);
  return `/auth/signin?callbackUrl=${encodeURIComponent(safe)}`;
}
