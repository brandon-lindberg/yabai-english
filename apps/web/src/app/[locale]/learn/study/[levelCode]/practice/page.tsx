import { StudyPracticeSession } from "@/components/study/study-practice-session";
import { prisma } from "@/lib/prisma";
import { getStudyRpgSnapshot } from "@/lib/study/get-overview";
import { isStudyLevelUnlocked } from "@/lib/study/access";
import { Link, redirect } from "@/i18n/navigation";
import { getLocale, getTranslations } from "next-intl/server";
import { notFound } from "next/navigation";
import { actionLinkClass } from "@/components/ui/inline-link";

import { requireStudyPageActor, japaneseStudyOverviewForPage, studyPageLevel, parseStudyQueueFocus, parseJapaneseStudyKind } from "@/lib/study/page-access";
import { JapaneseStudySession } from "@/components/study/japanese-study-session";
import { JapaneseStudyUnavailable } from "@/components/study/japanese-study-unavailable";
import { studyRpgProgressFromTotalXp } from "@/lib/study/rpg-xp";

const TRACK_SLUG = "english-flashcards";

type Props = {
  params: Promise<{ levelCode: string }>;
  searchParams: Promise<{ focus?: string; kind?: string }>;
};

export default async function StudyPracticePage({ params, searchParams }: Props) {
  const actor = await requireStudyPageActor();
  const { levelCode: raw } = await params;
  const sp = await searchParams;
  const queueFocus = parseStudyQueueFocus(sp.focus);
  const levelCode = studyPageLevel(raw, actor.learningLanguage);
  if (!levelCode) notFound();
  const locale = await getLocale();
  const t = await getTranslations("study");
  if (actor.learningLanguage === "JAPANESE") {
    const jp = await getTranslations("japaneseStudy");
    const overview = await japaneseStudyOverviewForPage(actor.id);
    if (overview && !overview.levels.some(level => level.code === levelCode && level.unlocked)) redirect({ href: "/learn/study", locale });
    const kind = parseJapaneseStudyKind(sp.kind);
    const initialRpg = studyRpgProgressFromTotalXp(overview?.levels.reduce((sum, level) => sum + level.xp, 0) ?? 0);
    return <main className="mx-auto max-w-lg flex-1 py-10">
      <p className="mb-6"><Link href="/learn/study" className={`${actionLinkClass} text-sm`}>{t("backToHub")}</Link></p>
      <h1 className="text-xl font-bold text-foreground">{jp("practiceTitle", { level: levelCode })}</h1>
      <p className="mt-1 text-sm text-muted">{jp(kind)} · {t(queueFocus === "weak" ? "practiceWeak" : queueFocus === "mastered" ? "practiceMastered" : "practiceMixed")}</p>
      <div className="mt-8" data-state={overview ? "available" : "unavailable"}>{overview ? <JapaneseStudySession key={`${actor.id}:${levelCode}:${kind}:${queueFocus}`} levelCode={levelCode} initialRpg={initialRpg} queueFocus={queueFocus} kind={kind} /> : <JapaneseStudyUnavailable />}</div>
    </main>;
  }

  const track = await prisma.studyTrack.findUnique({ where: { slug: TRACK_SLUG } });
  if (!track) {
    notFound();
  }
  const canAccess = await isStudyLevelUnlocked(prisma, actor.id, track.id, levelCode);
  if (!canAccess) {
    redirect({ href: "/learn/study", locale });
  }

  const levelRow = await prisma.studyLevel.findUnique({
    where: { trackId_levelCode: { trackId: track.id, levelCode } },
    select: { titleJa: true, titleEn: true },
  });
  const levelTitle = levelRow ? (locale === "ja" ? levelRow.titleJa : levelRow.titleEn) : null;

  const initialRpg = await getStudyRpgSnapshot(prisma, actor.id, track.id);

  return (
    <main className="mx-auto max-w-lg flex-1 px-4 py-10 sm:px-6">
      <p className="mb-6">
        <Link href="/learn/study" className={`${actionLinkClass} text-sm`}>
          ← {t("backToHub")}
        </Link>
      </p>
      <h1 className="text-xl font-bold text-foreground">{t("practice")}</h1>
      {levelTitle ? <p className="mt-1 text-sm text-muted">{levelTitle}</p> : null}
      <div className="mt-8">
        <StudyPracticeSession levelCode={levelCode} initialRpg={initialRpg} queueFocus={queueFocus} />
      </div>
    </main>
  );
}
