import type { ReactNode } from "react";
import { getLocale } from "next-intl/server";
import { requireAuth } from "@/lib/onboarding-gate";
import { requireEnglishLearningPage } from "@/lib/english-learning-page-access";

export default async function StudyLayout({ children }: { children: ReactNode }) {
  const locale = await getLocale();
  const user = await requireAuth(locale);
  requireEnglishLearningPage(user.learningLanguage, locale);
  return children;
}
