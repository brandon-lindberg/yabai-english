"use server";

import { getRequestLearningSite } from "@/lib/learning-site-request";
import { configuredLearningSites, learningSiteHref } from "@/lib/learning-sites";
import { appPathForLocale } from "@/lib/i18n-app-path";
import { redirect as redirectAbsolute } from "next/navigation";
import { randomUUID } from "node:crypto";
import { cookies } from "next/headers";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "@/i18n/navigation";
import type { LearningLanguage } from "@/generated/prisma/enums";
import { learningLanguageSchema } from "@/lib/learning-language";
import { learningCookieOptions, rememberGuestLearningLanguage } from "@/lib/learning-language-request";
import { journeyIntentSchema, JOURNEY_INTENT_SECONDS, journeyCallback, signInIntentCookieName } from "@/lib/learning-journey";

/** Server Actions supply the same-origin POST boundary before any intent cookie is issued. */
export async function prepareLearningSignIn(input: { learningLanguage: LearningLanguage; locale: string; callbackUrl: string }) {
  const site = await getRequestLearningSite();
  if (site?.learningLanguage && site.learningLanguage !== input.learningLanguage) throw new Error("Choose this language on its learning site");
  const intent = journeyIntentSchema.parse({
    ...input,
    callbackUrl: journeyCallback(input.learningLanguage, input.locale, input.callbackUrl),
    expiresAt: Date.now() + JOURNEY_INTENT_SECONDS * 1000,
  });
  const nonce = randomUUID();
  (await cookies()).set(signInIntentCookieName(nonce)!, JSON.stringify(intent), {
    ...learningCookieOptions, maxAge: JOURNEY_INTENT_SECONDS,
  });
  await rememberGuestLearningLanguage(intent.learningLanguage);
  return `/api/auth/learning-journey?intent=${nonce}`;
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
