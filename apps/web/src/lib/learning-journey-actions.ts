"use server";

import { getRequestLearningSite } from "@/lib/learning-site-request";
import { configuredLearningSites, learningSiteHref } from "@/lib/learning-sites";
import { appPathForLocale } from "@/lib/i18n-app-path";
import { redirect as redirectAbsolute } from "next/navigation";
import { auth, signIn } from "@/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "@/i18n/navigation";
import type { LearningLanguage } from "@/generated/prisma/enums";
import { learningLanguageSchema } from "@/lib/learning-language";
import { rememberGuestLearningLanguage } from "@/lib/learning-language-request";
import { prepareLearningSignIn } from "@/lib/learning-sign-in";
import { isGoogleSignInConfigured } from "@/lib/auth-mode";
import { authErrorHref } from "@/lib/auth-error-kind";

/** Start OAuth only after the Google form is submitted. */
export async function startGoogleSignIn(input: Parameters<typeof prepareLearningSignIn>[0]) {
  const locale = input?.locale === "en" ? "en" : "ja";
  const unavailable = appPathForLocale(locale, authErrorHref("SignInUnavailable"));
  if (!isGoogleSignInConfigured()) redirectAbsolute(unavailable);

  let destination = unavailable;
  try {
    const redirectTo = await prepareLearningSignIn({ ...input, locale });
    const authorizationUrl = new URL(await signIn("google", { redirect: false, redirectTo }));
    if (authorizationUrl.origin === "https://accounts.google.com") destination = authorizationUrl.href;
  } catch (error) {
    console.error("[auth] Google sign-in could not start", error instanceof Error ? error.name : "Unknown error");
  }
  redirectAbsolute(destination);
}

/** A named subject action is deliberate; merely viewing a landing page never switches an account. */
export async function selectLearningJourney(language: LearningLanguage, locale: string) {
  const learningLanguage = learningLanguageSchema.parse(language);
  const site = await getRequestLearningSite();
  const sites = configuredLearningSites();
  if (sites && site?.learningLanguage && site.learningLanguage !== learningLanguage) {
    redirectAbsolute(learningSiteHref(sites, learningLanguage, appPathForLocale(locale, "/book")));
  }
  const session = await auth();
  if (session?.user && session.user.role !== "STUDENT") redirect({ href: "/dashboard", locale });
  if (session?.user?.role === "STUDENT") {
    await prisma.user.update({ where: { id: session.user.id }, data: { learningLanguage } });
  }
  await rememberGuestLearningLanguage(learningLanguage);
  redirect({ href: "/book", locale });
}
