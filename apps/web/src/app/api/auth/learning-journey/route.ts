import { getRequestLearningSite } from "@/lib/learning-site-request";
import { configuredLearningSites, publicAppOrigin } from "@/lib/learning-sites";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { journeyCallback, signInIntentCookieName } from "@/lib/learning-journey";
import { parseLearningSignInIntent } from "@/lib/learning-sign-in";
import { authErrorHref } from "@/lib/auth-error-kind";
import { rememberGuestLearningLanguage } from "@/lib/learning-language-request";
import { appPathForLocale } from "@/lib/i18n-app-path";
import { otherLearningSite, siteSessionStartHref } from "@/lib/site-session-path";

/** OAuth returns here before onboarding or booking can read the default English subject. */
export async function GET(req: Request) {
  const url = new URL(req.url);
  const name = signInIntentCookieName(url.searchParams.get("intent") ?? "");
  const store = await cookies();
  const intent = name ? parseLearningSignInIntent(store.get(name)?.value) : null;
  const send = (path: string) => {
    const response = NextResponse.redirect(new URL(path, publicAppOrigin(req)), 303);
    response.headers.set("Cache-Control", "no-store");
    return response;
  };
  if (!name || !intent || intent.expiresAt <= Date.now()) {
    if (name) store.delete(name);
    return send(appPathForLocale(intent?.locale ?? "ja", authErrorHref("JourneyExpired")));
  }
  const site = await getRequestLearningSite();
  if (site?.learningLanguage && site.learningLanguage !== intent.learningLanguage) {
    store.delete(name);
    return send(appPathForLocale(intent.locale, authErrorHref("JourneyExpired")));
  }
  const session = await auth();
  if (!session?.user?.id) {
    return send(appPathForLocale(intent.locale, authErrorHref("JourneyExpired")));
  }
  store.delete(name);
  const sites = configuredLearningSites();
  const finishSignIn = (path: string) => send(sites && site?.learningLanguage
    ? siteSessionStartHref(otherLearningSite(sites, site), "after-signin", intent.locale, path)
    : path);
  if (session.user.role !== "STUDENT") return finishSignIn(appPathForLocale(intent.locale, "/dashboard"));
  await prisma.user.update({ where: { id: session.user.id }, data: { learningLanguage: intent.learningLanguage } });
  await rememberGuestLearningLanguage(intent.learningLanguage);
  const profile = await prisma.studentProfile.findUnique({ where: { userId: session.user.id }, select: { onboardingCompletedAt: true } });
  return finishSignIn(profile?.onboardingCompletedAt
    ? journeyCallback(intent.learningLanguage, intent.locale, intent.callbackUrl)
    : appPathForLocale(intent.locale, "/onboarding"));
}
