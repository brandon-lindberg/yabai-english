import "server-only";
import { cookies } from "next/headers";
import type { LearningLanguage } from "@/generated/prisma/enums";
import { learningLanguageSchema, resolveLearningLanguage } from "@/lib/learning-language";
import { LEARNING_LANGUAGE_COOKIE } from "@/lib/learning-journey";

export const learningCookieOptions = {
  httpOnly: true, sameSite: "lax" as const, secure: process.env.NODE_ENV === "production", path: "/",
};

/** Authenticated intent always wins over a visitor cookie or URL filter. */
export async function getRequestLearningLanguage(session: { user?: { learningLanguage?: unknown } } | null): Promise<LearningLanguage> {
  if (session?.user) return resolveLearningLanguage(session.user.learningLanguage);
  return await getGuestLearningLanguage() ?? "ENGLISH";
}

export async function getGuestLearningLanguage(): Promise<LearningLanguage | null> {
  const parsed = learningLanguageSchema.safeParse((await cookies()).get(LEARNING_LANGUAGE_COOKIE)?.value);
  return parsed.success ? parsed.data : null;
}

export async function rememberGuestLearningLanguage(language: LearningLanguage) {
  (await cookies()).set(LEARNING_LANGUAGE_COOKIE, language, { ...learningCookieOptions, maxAge: 30 * 24 * 60 * 60 });
}
