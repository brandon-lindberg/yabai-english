import "server-only";
import { cookies } from "next/headers";
import type { LearningLanguage } from "@/generated/prisma/enums";
import { learningLanguageSchema, resolveLearningLanguage } from "@/lib/learning-language";
import { LEARNING_LANGUAGE_COOKIE } from "@/lib/learning-journey";
import { getRequestLearningSite } from "./learning-site-request";

export const learningCookieOptions = {
  httpOnly: true, sameSite: "lax" as const, secure: process.env.NODE_ENV === "production", path: "/",
};

/** A configured site wins; neutral/single-host requests retain saved account/cookie intent. */
export async function getRequestLearningLanguage(session: { user?: { learningLanguage?: unknown } } | null): Promise<LearningLanguage> {
  const site = await getRequestLearningSite();
  if (site?.learningLanguage) return site.learningLanguage;
  if (session?.user) return resolveLearningLanguage(session.user.learningLanguage);
  return await getGuestLearningLanguage() ?? "ENGLISH";
}

export async function getGuestLearningLanguage(): Promise<LearningLanguage | null> {
  const site = await getRequestLearningSite();
  if (site?.learningLanguage) return site.learningLanguage;
  const parsed = learningLanguageSchema.safeParse((await cookies()).get(LEARNING_LANGUAGE_COOKIE)?.value);
  return parsed.success ? parsed.data : null;
}

export async function rememberGuestLearningLanguage(language: LearningLanguage) {
  (await cookies()).set(LEARNING_LANGUAGE_COOKIE, language, { ...learningCookieOptions, maxAge: 30 * 24 * 60 * 60 });
}
