import { getTranslations } from "next-intl/server";
import { auth } from "@/auth";
import { Link } from "@/i18n/navigation";
import { prisma } from "@/lib/prisma";
import { AdminPlacementReviewForm } from "@/components/admin/admin-placement-review-form";
import { actionLinkClass } from "@/components/ui/inline-link";
import { DataList, DataRow } from "@/components/ui/data-row";
import { PageHeader } from "@/components/ui/page-header";
import { Section } from "@/components/ui/section";
import { LearningLanguage } from "@/generated/prisma/enums";
import { pendingPrivateReschedules, upcomingAdminLessonsWhere } from "@/lib/admin/lesson-filters";
import { adminRefundRecoveryWhere, adminWebhookRecoveryWhere } from "@/lib/refund-recovery";

export default async function AdminPage() {
  const t = await getTranslations("admin");
  const language = await getTranslations("admin.teachingLanguages");
  const session = await auth();
  if (!session?.user?.id || session.user.role !== "SUPER_ADMIN") return null;

  const now = new Date();

  const reviewWhere = { placementNeedsReview: true };
  const [reviewQueue, reviewCount, reschedules, refunds, deliveries, upcoming] = await Promise.all([
    prisma.studentProfile.findMany({
      where: reviewWhere,
      // Freshest placement first. `StudentProfile` carries no row timestamp, and
      // nulls sort first under Postgres DESC, which would head the queue with
      // students who never sat the placement at all.
      orderBy: { placementCompletedAt: { sort: "desc", nulls: "last" } },
      take: 50,
      select: {
        userId: true,
        placedLevel: true,
        placementReviewReason: true,
        user: { select: { name: true, email: true } },
      },
    }),
    prisma.studentProfile.count({ where: reviewWhere }),
    prisma.booking.count({ where: pendingPrivateReschedules }),
    prisma.refund.count({ where: adminRefundRecoveryWhere() }),
    prisma.paymentWebhookEvent.count({ where: adminWebhookRecoveryWhere }),
    prisma.booking.groupBy({
      by: ["learningLanguage"],
      where: upcomingAdminLessonsWhere(now),
      _count: { _all: true },
    }),
  ]);

  const overviewSections = [
    { title: t("overview.attention"), rows: [
      { label: t("overview.reschedules"), count: reschedules, href: "/admin/lessons?view=reschedules" },
      { label: t("overview.payments"), count: refunds + deliveries, href: "/admin/payments" },
      { label: t("overview.englishReviews"), count: reviewCount, href: "#placement-reviews" },
    ] },
    { title: t("overview.upcomingSubjects"), rows: Object.values(LearningLanguage).map((subject) => ({
      label: language(subject),
      count: upcoming.find((row) => row.learningLanguage === subject)?._count._all ?? 0,
      href: `/admin/lessons?view=upcoming&subject=${subject}`,
    })) },
  ];

  return (
    <main className="space-y-10">
      <PageHeader title={t("title")} />

      {overviewSections.map(({ title, rows }, index) => (
        <Section key={title} title={title} ruled={index !== 0}>
          <DataList>
            {rows.map(({ label, count, href }) => (
              <DataRow key={href} className="py-0!" interactive>
                <Link className={`${actionLinkClass} flex min-h-12 items-center justify-between gap-4 py-2`} href={href}>
                  {label}<span className="shrink-0 text-lg font-semibold tabular-nums">{count}</span>
                </Link>
              </DataRow>
            ))}
          </DataList>
        </Section>
      ))}

      <div id="placement-reviews" className="scroll-mt-6">
      <Section title={t("overview.englishReviews")}>
        {reviewQueue.length === 0 ? (
          <p className="border-y border-border py-6 text-sm text-muted">
            {t("noReviewItems")}
          </p>
        ) : (
          <DataList>
            {reviewQueue.map((profile) => {
              const name = profile.user.name ?? profile.user.email ?? "—";
              return (
                <DataRow key={profile.userId}>
                  <p className="font-medium text-foreground">{name}</p>
                  <p className="mt-0.5 text-sm text-muted">
                    {t("reviewReason")}: {profile.placementReviewReason ?? "—"}
                  </p>
                  <div className="mt-3">
                    <AdminPlacementReviewForm
                      studentId={profile.userId}
                      studentName={name}
                      currentLevel={profile.placedLevel}
                    />
                  </div>
                </DataRow>
              );
            })}
          </DataList>
        )}
      </Section>
      </div>
    </main>
  );
}
