import "server-only";
import { redirect } from "next/navigation";
import { getLocale } from "next-intl/server";
import type { LearningLanguage } from "@/generated/prisma/enums";
import { getRequestLearningSite } from "./learning-site-request";
import { configuredLearningSites, learningSiteHref } from "./learning-sites";
import { appPathForLocale } from "./i18n-app-path";

/** The optional neutral site introduces the choices; learning continues on a subject's site. */
export async function requireLearningSiteForPage(path: string, language?: LearningLanguage) {
  const sites = configuredLearningSites();
  if (!sites) return;
  const site = await getRequestLearningSite();
  if (site?.learningLanguage) return;
  const locale = await getLocale();
  redirect(language ? learningSiteHref(sites, language, appPathForLocale(locale, path)) : appPathForLocale(locale, "/choose-language"));
}
