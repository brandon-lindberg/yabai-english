import { APP_NAME, LEARNING_APP_NAMES } from "./brand";
import type { LearningLanguage } from "@/generated/prisma/enums";
import { stripOptionalLocalePrefix } from "./auth-callback-url";

export type LearningSite = { origin: string; learningLanguage: LearningLanguage | null; brandName: string };
export type LearningSites = Record<LearningLanguage, LearningSite> & { neutral: LearningSite | null };
type Environment = Record<string, string | undefined>;

const localHostname = (hostname: string) => hostname === "localhost" || hostname.endsWith(".localhost") || hostname === "127.0.0.1" || hostname === "[::1]";
function siteOrigin(raw: string | undefined): string {
  if (!raw) throw new Error("Both learning site origins must be configured");
  const url = new URL(raw);
  if (url.username || url.password || url.search || url.hash || url.pathname !== "/"
    || (url.protocol !== "https:" && !(url.protocol === "http:" && localHostname(url.hostname)))) throw new Error("Learning site URLs must be HTTPS origins (HTTP is allowed only on loopback hosts)");
  return url.origin;
}

/** Explicit opt-in keeps existing single-host deployments unchanged until configured. */
export function configuredLearningSites(env: Environment = process.env): LearningSites | null {
  if (env.LEARNING_SITES_ENABLED !== "true") return null;
  const english = siteOrigin(env.ENGLISH_SITE_URL), japanese = siteOrigin(env.JAPANESE_SITE_URL);
  const neutral = env.NEUTRAL_SITE_URL ? siteOrigin(env.NEUTRAL_SITE_URL) : null;
  if (new Set([english, japanese, ...(neutral ? [neutral] : [])]).size !== (neutral ? 3 : 2)) throw new Error("Learning sites must have distinct origins");
  return {
    ENGLISH: { origin: english, learningLanguage: "ENGLISH", brandName: LEARNING_APP_NAMES.ENGLISH },
    JAPANESE: { origin: japanese, learningLanguage: "JAPANESE", brandName: LEARNING_APP_NAMES.JAPANESE },
    neutral: neutral ? { origin: neutral, learningLanguage: null, brandName: APP_NAME } : null,
  };
}

/** Exact configured hosts only; a suffix, forwarded-host list or credential is never a match. */
export function learningSiteForHost(host: string, sites: LearningSites): LearningSite | null {
  if (!host || /[\s\/@\\?#,%]/.test(host)) return null;
  const normalized = host.toLowerCase();
  return [sites.ENGLISH, sites.JAPANESE, sites.neutral].find(site => {
    if (!site) return false;
    const url = new URL(site.origin);
    return normalized === url.host || (!localHostname(url.hostname) && normalized === `www.${url.host}`);
  }) ?? null;
}

export function learningSitePathLanguage(pathname: string): LearningLanguage | null {
  const path = stripOptionalLocalePrefix(pathname);
  if (/^\/(learn-japanese|japanese-placement)(\/|$)/.test(path) || /^\/api\/japanese-(placement|study)(\/|$)/.test(path)) return "JAPANESE";
  if (/^\/(learn-english|placement)(\/|$)/.test(path) || /^\/api\/(placement|study)(\/|$)/.test(path)) return "ENGLISH";
  if (/^\/learn(\/|$)/.test(path) && !/^\/learn\/study(\/|$)/.test(path)) return "ENGLISH";
  return null;
}

/** Cross-site navigation is built from this map, never from an incoming return URL's origin. */
export function learningSiteHref(sites: LearningSites, language: LearningLanguage, path = "/"): string {
  let decoded = path;
  for (let index = 0; index < 3; index++) { const next = decodeURIComponent(decoded); if (next === decoded) break; decoded = next; }
  if (!decoded.startsWith("/") || decoded.startsWith("//") || decoded.includes("\\") || /[\r\n]/.test(decoded)) throw new Error("Invalid learning-site path");
  const url = new URL(path, sites[language].origin);
  if (url.origin !== sites[language].origin) throw new Error("Invalid learning-site origin");
  if (/^\/(en\/|ja\/)?learn-(english|japanese)\/?$/.test(url.pathname)) url.pathname = url.pathname.startsWith("/en/") ? "/en" : "/";
  if (url.pathname === "/en/") url.pathname = "/en";
  return url.pathname === "/" && !url.search && !url.hash ? url.origin : url.toString();
}

export function publicAppOrigin(request?: Request, env: Environment = process.env): string {
  const sites = configuredLearningSites(env);
  if (sites && request) {
    const host = request.headers.get("host") ?? new URL(request.url).host;
    const site = learningSiteForHost(host, sites);
    if (!site) throw new Error("Unrecognized learning-site host");
    return site.origin;
  }
  return (env.NEXTAUTH_URL || env.AUTH_URL || env.NEXT_PUBLIC_APP_URL || (request ? new URL(request.url).origin : "http://localhost:3000")).replace(/\/$/, "");
}
