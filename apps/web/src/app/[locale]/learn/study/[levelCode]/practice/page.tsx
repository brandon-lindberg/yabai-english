import { StudyPracticeSession } from "@/components/study/study-practice-session";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { getStudyRpgSnapshot } from "@/lib/study/get-overview";
import { isStudyLevelUnlocked } from "@/lib/study/access";
import { Link, redirect } from "@/i18n/navigation";
import { StudyLevelCode } from "@prisma/client";
import { getLocale, getTranslations } from "next-intl/server";
import { notFound } from "next/navigation";

const TRACK_SLUG = "english-flashcards";

type Props = { params: Promise<{ levelCode: string }> };

function parseLevelCode(raw: string): StudyLevelCode | null {
  return Object.values(StudyLevelCode).includes(raw as StudyLevelCode)
    ? (raw as StudyLevelCode)
    : null;
}

export default async function StudyPracticePage({ params }: Props) {
  const session = await auth();
  if (!session?.user?.id) {
    notFound();
  }

  const { levelCode: raw } = await params;
  const levelCode = parseLevelCode(raw);
  if (!levelCode) {
    notFound();
  }

  const track = await prisma.studyTrack.findUnique({ where: { slug: TRACK_SLUG } });
  if (!track) {
    notFound();
  }
  const canAccess = await isStudyLevelUnlocked(prisma, session.user.id, track.id, levelCode);
  const locale = await getLocale();
  if (!canAccess) {
    redirect({ href: "/learn/study", locale });
  }

  const t = await getTranslations("study");
  const initialRpg = await getStudyRpgSnapshot(prisma, session.user.id, track.id);

  return (
    <main className="mx-auto max-w-lg flex-1 px-4 py-10 sm:px-6">
      <p className="mb-6">
        <Link href="/learn/study" className="text-link text-sm">
          ← {t("backToHub")}
        </Link>
      </p>
      <h1 className="text-xl font-bold text-foreground">{t("practice")}</h1>
      <p className="mt-1 text-sm text-muted">{levelCode}</p>
      <div className="mt-8">
        <StudyPracticeSession levelCode={levelCode} initialRpg={initialRpg} />
      </div>
    </main>
  );
}
