import type { ReactNode } from "react";
import { getLocale, getTranslations } from "next-intl/server";
import { requireAuth } from "@/lib/onboarding-gate";
import { getStudyPageActor } from "@/lib/study/page-access";
import { prisma } from "@/lib/prisma";
import { actionLinkClass } from "@/components/ui/inline-link";

export default async function StudyLayout({ children }: { children: ReactNode }) {
  const locale = await getLocale();
  const user = await requireAuth(locale);
  const actor = await getStudyPageActor(prisma, user.id);
  if (actor?.learningLanguage !== "JAPANESE") return children;
  const t = await getTranslations("japaneseStudy");
  return <div className="relative flex min-h-0 flex-1 flex-col [&>main]:w-full">
    <span data-study-beta className="pointer-events-none absolute left-0 top-0 bg-primary py-1 pl-4 pr-6 text-sm font-semibold text-primary-foreground [clip-path:polygon(0_0,100%_0,calc(100%_-_10px)_50%,100%_100%,0_100%)]">{t("beta")}</span>
    {children}
    <p className="mx-auto w-full max-w-3xl px-4 pb-6 text-sm sm:px-6">
      <a href="/api/japanese-study/attribution" target="_blank" rel="noopener noreferrer" className={actionLinkClass}>{t("sources")}</a>
    </p>
  </div>;
}
