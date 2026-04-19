import { StudyAssessmentForm } from "@/components/study/study-assessment-form";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { isStudyLevelUnlocked } from "@/lib/study/access";
import { Link, redirect } from "@/i18n/navigation";
import { StudyLevelCode } from "@/generated/prisma/client";
import { getLocale, getTranslations } from "next-intl/server";
import { notFound } from "next/navigation";

type Props = { params: Promise<{ levelCode: string }> };

const TRACK_SLUG = "english-flashcards";

function parseLevelCode(raw: string): StudyLevelCode | null {
  return Object.values(StudyLevelCode).includes(raw as StudyLevelCode)
    ? (raw as StudyLevelCode)
    : null;
}

export default async function StudyAssessmentPage({ params }: Props) {
  const session = await auth();
  if (!session?.user?.id) {
    notFound();
  }

  const { levelCode: raw } = await params;
  const levelCode = parseLevelCode(raw);
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

  const locale = await getLocale();
  const canAccess = await isStudyLevelUnlocked(prisma, session.user.id, track.id, levelCode);
  if (!canAccess) {
    redirect({ href: "/learn/study", locale });
  }

  const t = await getTranslations("study");

  return (
    <main className="mx-auto max-w-lg flex-1 px-4 py-10 sm:px-6">
      <p className="mb-6">
        <Link href="/learn/study" className="text-link text-sm">
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
