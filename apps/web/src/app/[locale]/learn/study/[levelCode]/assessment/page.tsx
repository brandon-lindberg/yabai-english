import { StudyAssessmentForm } from "@/components/study/study-assessment-form";
import { prisma } from "@/lib/prisma";
import { isStudyLevelUnlocked } from "@/lib/study/access";
import { Link, redirect } from "@/i18n/navigation";
import { requireStudyPageActor, studyPageLevel } from "@/lib/study/page-access";
import { getLocale, getTranslations } from "next-intl/server";
import { notFound } from "next/navigation";
import { actionLinkClass } from "@/components/ui/inline-link";

type Props = { params: Promise<{ levelCode: string }> };

const TRACK_SLUG = "english-flashcards";

export default async function StudyAssessmentPage({ params }: Props) {
  const actor = await requireStudyPageActor();
  const locale = await getLocale();
  if (actor.learningLanguage === "JAPANESE") redirect({ href: "/learn/study", locale });

  const { levelCode: raw } = await params;
  const levelCode = studyPageLevel(raw, "ENGLISH");
  if (!levelCode) {
    notFound();
  }

  const track = await prisma.studyTrack.findUnique({
    where: { slug: TRACK_SLUG },
  });
  if (!track) {
    notFound();
  }

  const level = await prisma.studyLevel.findUnique({
    where: { trackId_levelCode: { trackId: track.id, levelCode } },
    include: {
      assessments: {
        where: { kind: "LEVEL_EXIT" },
        orderBy: { sortOrder: "asc" },
        take: 1,
      },
    },
  });
  if (!level?.assessments[0]) {
    notFound();
  }

  const canAccess = await isStudyLevelUnlocked(prisma, actor.id, track.id, levelCode);
  if (!canAccess) {
    redirect({ href: "/learn/study", locale });
  }

  const t = await getTranslations("study");

  return (
    <main className="mx-auto max-w-lg flex-1 px-4 py-10 sm:px-6">
      <p className="mb-6">
        <Link href="/learn/study" className={`${actionLinkClass} text-sm`}>
          ← {t("backToHub")}
        </Link>
      </p>
      <h1 className="text-xl font-bold text-foreground">{t("levelTest")}</h1>
      <p className="mt-1 text-sm text-muted">
        {locale === "ja" ? level.titleJa : level.titleEn}
      </p>
      <div className="mt-8">
        <StudyAssessmentForm assessmentId={level.assessments[0].id} />
      </div>
    </main>
  );
}
