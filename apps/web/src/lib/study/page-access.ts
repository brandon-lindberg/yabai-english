import "server-only";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import { JapaneseStudyFailure, getJapaneseStudyOverview } from "./japanese-service";
import type { PrismaClient } from "@/generated/prisma/client";
import { isLoginAllowedForAccountStatus } from "../account-status";
import { STUDY_LEVEL_ORDER, JAPANESE_STUDY_LEVEL_ORDER } from "./constants";
import { learningLanguageForRequest } from "../learning-site-request";

/** Page routing follows current persisted intent, independently of UI locale. */
export async function getStudyPageActor(db: Pick<PrismaClient, "user">, userId: string) {
  const actor = await db.user.findUnique({ where: { id: userId }, select: { id: true, learningLanguage: true, role: true, accountStatus: true } });
  return actor && isLoginAllowedForAccountStatus(actor.accountStatus) ? { ...actor, learningLanguage: await learningLanguageForRequest(actor.learningLanguage) } : null;
}
export function studyPageLevel(raw: string, language: "ENGLISH" | "JAPANESE") {
  const levels = language === "JAPANESE" ? JAPANESE_STUDY_LEVEL_ORDER : STUDY_LEVEL_ORDER;
  return levels.find(code => code === raw) ?? null;
}
export const parseStudyQueueFocus = (raw?: string) => raw === "weak" || raw === "mastered" ? raw : "mixed";
export const parseJapaneseStudyKind = (raw?: string) => raw === "vocabulary" || raw === "kanji" ? raw : "mixed";

export async function requireStudyPageActor() {
  const session = await auth();
  if (!session?.user?.id) notFound();
  const actor = await getStudyPageActor(prisma, session.user.id);
  if (!actor) notFound();
  return actor;
}

export async function japaneseStudyOverviewForPage(userId: string) {
  try { return await getJapaneseStudyOverview(prisma, userId); }
  catch (error) {
    if (error instanceof JapaneseStudyFailure) {
      if (error.status === 503) return null;
      if (error.status === 401 || error.status === 403) notFound();
    }
    throw error;
  }
}
