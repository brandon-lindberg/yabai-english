import { z } from "zod";
import type { LearningLanguage } from "@/generated/prisma/enums";
import { learningLanguageSchema } from "@/lib/learning-language";
import { resolveSafeCallbackUrl, stripOptionalLocalePrefix } from "@/lib/auth-callback-url";
import { appPathForLocale } from "@/lib/i18n-app-path";

export const LEARNING_LANGUAGE_COOKIE = "learning-language";
export const JOURNEY_INTENT_SECONDS = 1800;

export const LEARNING_JOURNEYS = {
  ENGLISH: { path: "/learn-english", key: "english", landingNamespace: "landing" },
  JAPANESE: { path: "/learn-japanese", key: "japanese", landingNamespace: "landingJapanese" },
} as const;

export function journeyPath(language: LearningLanguage) {
  return LEARNING_JOURNEYS[language].path;
}

export function journeySignInHref(language: LearningLanguage, callbackUrl = "/book") {
  return `/auth/signin?${new URLSearchParams({ learningLanguage: language, callbackUrl: resolveSafeCallbackUrl(callbackUrl, "/book") })}`;
}

export function learningLanguageFromPath(pathname: string): LearningLanguage | null {
  const path = stripOptionalLocalePrefix(pathname).replace(/\/$/, "");
  return (Object.keys(LEARNING_JOURNEYS) as LearningLanguage[]).find((language) => journeyPath(language) === path) ?? null;
}

export function signInIntentCookieName(nonce: string) {
  return z.string().uuid().safeParse(nonce).success ? `learning-signin-${nonce}` : null;
}

export const journeyIntentSchema = z.object({
  learningLanguage: learningLanguageSchema,
  locale: z.enum(["ja", "en"]),
  callbackUrl: z.string(),
  expiresAt: z.number().int().positive(),
}).strict();

export function journeyCallback(language: LearningLanguage, locale: string, raw: string) {
  let path = stripOptionalLocalePrefix(resolveSafeCallbackUrl(raw, "/book"));
  if (language === "JAPANESE" && /^\/(placement|learn)(\/|\?|$)/.test(path)) path = "/book";
  return appPathForLocale(locale, path);
}
