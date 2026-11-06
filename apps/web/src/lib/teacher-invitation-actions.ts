"use server";

import { randomBytes } from "node:crypto";
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
import { parseTeacherInvitationCookie, pendingTeacherInvitation, redeemTeacherInvitation, teacherInvitationCookieName, teacherInvitationOAuthSeconds, teacherInvitationPath } from "@/lib/teacher-invitations";

export async function continueTeacherInvitation(locale: string, form: FormData) {
  const uiLocale = locale === "en" ? "en" : "ja";
  const path = appPathForLocale(uiLocale, teacherInvitationPath);
  const emailPath = `${path}?mode=email`;
  const [store, site, session] = await Promise.all([cookies(), getRequestLearningSite(), auth()]);
  const origin = site?.origin ?? publicAppOrigin();
  const sessionCookie = siteSessionCookie(origin);
  const cookieName = teacherInvitationCookieName(sessionCookie.options.secure);
  const cookieOptions = { ...sessionCookie.options, maxAge: teacherInvitationOAuthSeconds };
  const context = parseTeacherInvitationCookie(store.get(cookieName)?.value);
  const value = form.get("token");
  const token = typeof value === "string" && value ? value : context?.token ?? "";
  const attempt = context?.token === token ? context.attempt : undefined;
  const action = form.get("intent");

  if (action === "accept" && session?.user.id) {
    const sessionToken = store.get(sessionCookie.name)?.value ?? "";
    const result = await redeemTeacherInvitation(prisma, token, session.user.id, sessionToken, attempt);
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
    if (result === "verify-email") {
      store.set(cookieName, token, cookieOptions);
      redirect(emailPath);
    }
    store.set(cookieName, attempt ? `${token}.${attempt}` : token, cookieOptions);
    redirect(`${path}?status=ineligible`);
  }

  const invite = await pendingTeacherInvitation(prisma, token);
  if (!invite) {
    store.delete(cookieName);
    redirect(`${path}?status=unavailable`);
  }
  const target = invite.recipientEmail ? emailPath : path;

  if (action === "switch" && session?.user.id) {
    store.set(cookieName, token, cookieOptions);
    await signOut({ redirect: false, redirectTo: target });
    redirect(target);
  }
  if (session?.user.id && !invite.recipientEmail) {
    store.set(cookieName, token, cookieOptions);
    redirect(path);
  }
  let destination = `${target}${invite.recipientEmail ? "&" : "?"}status=google-error`;
  if (isGoogleSignInConfigured()) {
    // A fresh Google sign-in must start without a session, so Auth.js cannot
    // link a different Google identity to the account currently signed in.
    if (session?.user.id) await signOut({ redirect: false, redirectTo: target });
    const pending = invite.recipientEmail ? `${token}.${randomBytes(32).toString("base64url")}` : token;
    store.set(cookieName, pending, cookieOptions);
    try {
      destination = await googleAuthorizationUrl(target, { prompt: "select_account" });
    } catch (error) {
      console.error("[auth] Teacher invitation Google sign-in could not start", error instanceof Error ? error.name : "Unknown error");
    }
  }
  redirect(destination);
}
