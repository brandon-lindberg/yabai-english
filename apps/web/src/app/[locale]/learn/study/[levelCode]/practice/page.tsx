import { StudyPracticeSession, type StudyQueueFocus } from "@/components/study/study-practice-session";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { getStudyRpgSnapshot } from "@/lib/study/get-overview";
import { isStudyLevelUnlocked } from "@/lib/study/access";
import { Link, redirect } from "@/i18n/navigation";
import { StudyLevelCode } from "@prisma/client";
import { getLocale, getTranslations } from "next-intl/server";
import { notFound } from "next/navigation";

const TRACK_SLUG = "english-flashcards";

type Props = {
  params: Promise<{ levelCode: string }>;
  searchParams: Promise<{ focus?: string }>;
};

function parseLevelCode(raw: string): StudyLevelCode | null {
  return Object.values(StudyLevelCode).includes(raw as StudyLevelCode)
    ? (raw as StudyLevelCode)
    : null;
}

function parseQueueFocus(raw: string | undefined): StudyQueueFocus {
  if (raw === "weak" || raw === "mastered") return raw;
  return "mixed";
}

export default async function StudyPracticePage({ params, searchParams }: Props) {
  const session = await auth();
  if (!session?.user?.id) {
    notFound();
  }

  const { levelCode: raw } = await params;
  const sp = await searchParams;
  const queueFocus = parseQueueFocus(sp.focus);
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

  const levelRow = await prisma.studyLevel.findUnique({
    where: { trackId_levelCode: { trackId: track.id, levelCode } },
    select: { titleJa: true, titleEn: true },
  });
  const levelTitle = levelRow ? (locale === "ja" ? levelRow.titleJa : levelRow.titleEn) : null;

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
      {levelTitle ? <p className="mt-1 text-sm text-muted">{levelTitle}</p> : null}
      <div className="mt-8">
        <StudyPracticeSession levelCode={levelCode} initialRpg={initialRpg} queueFocus={queueFocus} />
      </div>
    </main>
  );
}
