import { resolveSafeCallbackUrl } from "@/lib/auth-callback-url";

/** Relative URL for the sign-in page with a validated `callbackUrl` query. */
export function authSignInHref(callbackPathAndQuery: string, fallback = "/dashboard", signup = false): string {
  const safe = resolveSafeCallbackUrl(callbackPathAndQuery, fallback);
  return `/auth/signin?callbackUrl=${encodeURIComponent(safe)}${signup ? "&signup=1" : ""}`;
}
