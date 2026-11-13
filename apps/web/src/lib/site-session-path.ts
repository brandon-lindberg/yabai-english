import { appPathForLocale } from "@/lib/i18n-app-path";
import { authSignInHref } from "@/lib/auth-sign-in-href";
import { resolveSafeCallbackUrl } from "@/lib/auth-callback-url";
import type { LearningSite, LearningSites } from "@/lib/learning-sites";

export const SITE_SESSION_PATH = "/api/auth/site-session";
export const SITE_SESSION_SKIP = "skip";
export const SITE_SESSION_FLOWS = ["signin", "signup", "after-signin", "switch"] as const;
type SiteSessionFlow = (typeof SITE_SESSION_FLOWS)[number];

export function otherLearningSite(sites: LearningSites, site: LearningSite) {
  return site.learningLanguage === "ENGLISH" ? sites.JAPANESE : sites.ENGLISH;
}

export function siteSessionHref(origin: string, params: Record<string, string>) {
  const url = new URL(SITE_SESSION_PATH, origin);
  url.search = new URLSearchParams(params).toString();
  return url;
}

export function siteSessionStartHref(
  site: LearningSite,
  flow: SiteSessionFlow,
  locale: string,
  returnTo?: string,
) {
  return siteSessionHref(site.origin, { flow, locale, ...(returnTo ? { returnTo } : {}) }).href;
}

export function siteSessionReturnPath(flow: SiteSessionFlow, locale: string, returnTo?: string | null) {
  return flow === "switch" ? appPathForLocale(locale, "/")
    : resolveSafeCallbackUrl(returnTo, appPathForLocale(locale, "/dashboard"));
}

export function siteSessionSignInFallback(locale: string, returnTo: string, signup = false) {
  return appPathForLocale(locale, `${authSignInHref(returnTo, "/dashboard", signup)}&siteSession=${SITE_SESSION_SKIP}`);
}
