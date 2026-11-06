"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { auth, signOut } from "@/auth";
import { appPathForLocale } from "@/lib/i18n-app-path";
import { isGoogleSignInConfigured } from "@/lib/auth-mode";
import { googleAuthorizationUrl } from "@/lib/google-authorization-url";
import { getRequestLearningSite } from "@/lib/learning-site-request";
import { configuredLearningSites, publicAppOrigin } from "@/lib/learning-sites";
import { prisma } from "@/lib/prisma";
import { siteSessionCookie } from "@/lib/site-session-cookie";
import { otherLearningSite, siteSessionStartHref } from "@/lib/site-session-path";
import { redeemTeacherInvitation, teacherInvitationCookieName, teacherInvitationIsPending } from "@/lib/teacher-invitations";

export async function continueTeacherInvitation(locale: string, form: FormData) {
  const uiLocale = locale === "en" ? "en" : "ja";
  const path = appPathForLocale(uiLocale, "/teacher-invite");
  const [store, site, session] = await Promise.all([cookies(), getRequestLearningSite(), auth()]);
  const origin = site?.origin ?? publicAppOrigin();
  const sessionCookie = siteSessionCookie(origin);
  const cookieName = teacherInvitationCookieName(sessionCookie.options.secure);
  const value = form.get("token");
  const token = typeof value === "string" && value ? value : store.get(cookieName)?.value ?? "";
  const action = form.get("intent");

  if (action === "accept" && session?.user.id) {
    const sessionToken = store.get(sessionCookie.name)?.value ?? "";
    const result = await redeemTeacherInvitation(prisma, token, session.user.id, sessionToken);
    if (result === "accepted") {
      store.delete(cookieName);
      const next = appPathForLocale(uiLocale, "/onboarding/teacher");
      const sites = configuredLearningSites();
      redirect(sites && site?.learningLanguage ? siteSessionStartHref(otherLearningSite(sites, site), "after-signin", uiLocale, next) : next);
    }
    if (result === "unavailable") {
      store.delete(cookieName);
      redirect(`${path}?status=unavailable`);
    }
  }

  if (!await teacherInvitationIsPending(prisma, token)) {
    store.delete(cookieName);
    redirect(`${path}?status=unavailable`);
  }
  // Carry the link across OAuth without placing its secret in a callback URL.
  store.set(cookieName, token, { ...sessionCookie.options, maxAge: 15 * 60 });

  if (action === "switch" && session?.user.id) {
    await signOut({ redirect: false });
    redirect(path);
  }
  if (session?.user.id) redirect(action === "accept" ? `${path}?status=ineligible` : path);
  let destination = `${path}?status=google-error`;
  if (isGoogleSignInConfigured()) {
    try {
      destination = await googleAuthorizationUrl(path, { prompt: "select_account" });
    } catch (error) {
      console.error("[auth] Teacher invitation Google sign-in could not start", error instanceof Error ? error.name : "Unknown error");
    }
  }
  redirect(destination);
}
