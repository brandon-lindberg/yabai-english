import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { journeyCallback, journeyIntentSchema, signInIntentCookieName } from "@/lib/learning-journey";
import { rememberGuestLearningLanguage } from "@/lib/learning-language-request";
import { appPathForLocale } from "@/lib/i18n-app-path";

/** OAuth returns here before onboarding or booking can read the default English subject. */
export async function GET(req: Request) {
  const url = new URL(req.url);
  const name = signInIntentCookieName(url.searchParams.get("intent") ?? "");
  const store = await cookies();
  const raw = name ? store.get(name)?.value : null;
  const parsed = journeyIntentSchema.safeParse(raw ? parseJson(raw) : null);
  const intent = parsed.success ? parsed.data : null;
  const send = (path: string) => {
    const response = NextResponse.redirect(new URL(path, req.url), 303);
    response.headers.set("Cache-Control", "no-store");
    return response;
  };
  if (!name || !intent || intent.expiresAt <= Date.now()) {
    if (name) store.delete(name);
    return send(`${appPathForLocale(intent?.locale ?? "ja", "/auth/signin")}?error=JourneyExpired${intent ? `&learningLanguage=${intent.learningLanguage}` : ""}`);
  }
  const session = await auth();
  if (!session?.user?.id) {
    return send(`${appPathForLocale(intent.locale, "/auth/signin")}?learningLanguage=${intent.learningLanguage}`);
  }
  store.delete(name);
  if (session.user.role !== "STUDENT") return send(appPathForLocale(intent.locale, "/dashboard"));
  await prisma.user.update({ where: { id: session.user.id }, data: { learningLanguage: intent.learningLanguage } });
  await rememberGuestLearningLanguage(intent.learningLanguage);
  const profile = await prisma.studentProfile.findUnique({ where: { userId: session.user.id }, select: { onboardingCompletedAt: true } });
  return send(profile?.onboardingCompletedAt
    ? journeyCallback(intent.learningLanguage, intent.locale, intent.callbackUrl)
    : appPathForLocale(intent.locale, "/onboarding"));
}

function parseJson(value: string): unknown {
  try { return JSON.parse(value); } catch { return null; }
}
