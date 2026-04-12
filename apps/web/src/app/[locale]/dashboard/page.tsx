import { getTranslations } from "next-intl/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { Link } from "@/i18n/navigation";
import { getStudentBookingsForDashboard } from "@/lib/dashboard/student-bookings";
import { getOrCreateQuickReviewCards } from "@/lib/study/quick-review";
import { getStudyTrackOverview } from "@/lib/study/get-overview";
import { getStudyResumeInfo } from "@/lib/dashboard/study-resume";
import { DashboardNextLesson } from "@/components/dashboard/dashboard-next-lesson";
import { DashboardProfileSummary } from "@/components/dashboard/dashboard-profile-summary";
import { DashboardFlashcardStats } from "@/components/dashboard/dashboard-flashcard-stats";
import { DashboardStudyHighlight } from "@/components/dashboard/dashboard-study-highlight";
import { DashboardQuickReview } from "@/components/dashboard/dashboard-quick-review";
import { isPlacementRetakeAllowed } from "@/lib/placement-cooldown";

export default async function DashboardPage() {
  const session = await auth();
  if (!session?.user?.id) return null;

  const t = await getTranslations("dashboard");
  const tCommon = await getTranslations("common");
  const th = await getTranslations("dashboard.highlights");

  if (session.user.role !== "STUDENT") {
    return (
      <div className="space-y-4">
        <h1 className="text-2xl font-bold text-foreground">{t("teacherHome.title")}</h1>
        <p className="text-muted">{t("teacherHome.body")}</p>
        <Link
          href="/book"
          className="inline-flex rounded-full bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:opacity-90"
        >
          {tCommon("bookLesson")}
        </Link>
      </div>
    );
  }

  const profile = await prisma.studentProfile.findUnique({
    where: { userId: session.user.id },
  });

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: {
      name: true,
      email: true,
      image: true,
      studentProfile: { select: { shortBio: true } },
    },
  });

  const { upcoming, scheduleItems } = await getStudentBookingsForDashboard(prisma, session.user.id);
  const quick = await getOrCreateQuickReviewCards(prisma, session.user.id);
  const overview = await getStudyTrackOverview(prisma, session.user.id, "english-flashcards");
  const resume = await getStudyResumeInfo(prisma, session.user.id);

  const canStartPlacement = isPlacementRetakeAllowed(profile?.placementCompletedAt ?? null);

  return (
    <div className="space-y-10">
      <header className="space-y-2">
        <h1 className="text-2xl font-bold text-foreground">{th("pageTitle")}</h1>
        <p className="text-muted">{th("pageIntro")}</p>
      </header>

      {profile ? (
        <div className="flex flex-wrap gap-3">
          <p className="w-full text-sm text-muted sm:w-auto sm:flex-1">
            {t("placedLevel")}:{" "}
            <span className="font-semibold text-foreground">
              {profile.placedLevel === "UNSET"
                ? t("placedUnset")
                : `${t(`levelLabel.${profile.placedLevel}`)} ${t("subLevelShort", {
                    subLevel: profile.placedSubLevel ?? 1,
                  })}`}
            </span>
          </p>
          <Link
            href="/book"
            className="rounded-full bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:opacity-90"
          >
            {tCommon("bookLesson")}
          </Link>
          {canStartPlacement ? (
            profile.placedLevel === "UNSET" ? (
              <Link
                href="/placement"
                className="rounded-full border border-accent/40 bg-accent/10 px-4 py-2 text-sm font-semibold text-foreground hover:bg-accent/20"
              >
                {t("placementCta")}
              </Link>
            ) : (
              <Link
                href="/placement"
                className="rounded-full border border-border px-4 py-2 text-sm font-semibold text-muted hover:bg-[var(--app-hover)]"
              >
                {t("retakePlacement")}
              </Link>
            )
          ) : null}
        </div>
      ) : null}

      <div className="grid gap-6 lg:grid-cols-2">
        <DashboardNextLesson upcoming={upcoming} />
        <DashboardProfileSummary
          name={user?.name ?? null}
          email={user?.email ?? null}
          image={user?.image ?? null}
          shortBio={user?.studentProfile?.shortBio ?? null}
          rpg={overview?.rpg ?? null}
        />
      </div>

      {overview ? <DashboardStudyHighlight overview={overview} resume={resume} /> : null}

      {overview ? <DashboardFlashcardStats trackPractice={overview.trackPractice} /> : null}

      <section>
        <DashboardQuickReview
          initialCards={quick.cards}
          dayKey={quick.dayKey}
          initialLearnedToday={quick.learnedToday}
          initialNotYetToday={quick.notYetToday}
        />
      </section>

      {scheduleItems.length > 0 ? (
        <p className="text-center text-sm text-muted">
          <Link href="/dashboard/schedule" className="text-link">
            {th("seeFullSchedule")}
          </Link>
        </p>
      ) : null}
    </div>
  );
}
