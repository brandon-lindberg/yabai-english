import { getLocale, getTranslations } from "next-intl/server";
import { auth } from "@/auth";
import { Link } from "@/i18n/navigation";
import { prisma } from "@/lib/prisma";
import {
  AdminBookingsPanel,
  type AdminBookingRow,
} from "@/components/admin/admin-bookings-panel";
import { AdminPlacementReviewForm } from "@/components/admin/admin-placement-review-form";
import { buttonClasses } from "@/components/ui/button";
import { DataList, DataRow } from "@/components/ui/data-row";
import { PageHeader } from "@/components/ui/page-header";
import { Section } from "@/components/ui/section";
import { StatLedger } from "@/components/ui/stat-ledger";

/**
 * The admin overview.
 *
 * Was three stacked lists with no controls: fifty bookings in one column, the
 * placement review queue, and then *every student again* with an inline level
 * form on each row — a third place to edit a placement, after the students grid
 * and the user detail page, and the worst of the three.
 *
 * Now it answers the two questions an overview should: what is happening, and
 * what is waiting on me. Browsing and editing students belongs to the students
 * screen, which already searches, sorts and paginates.
 */
export default async function AdminPage() {
  const locale = await getLocale();
  const t = await getTranslations("admin");
  const session = await auth();
  if (!session?.user?.id || session.user.role !== "SUPER_ADMIN") return null;

  const now = new Date();

  const [bookings, reviewQueue, studentCount, upcomingCount] = await Promise.all([
    prisma.booking.findMany({
      orderBy: { startsAt: "desc" },
      take: 200,
      /*
        `select`, not `include`. `include: { student: true }` returned every
        column of the user record — including whatever secret the model gains
        next — to render a name on a list.
      */
      select: {
        id: true,
        startsAt: true,
        status: true,
        meetUrl: true,
        lessonProduct: { select: { nameEn: true } },
        student: { select: { name: true, email: true } },
        teacher: { select: { user: { select: { name: true, email: true } } } },
      },
    }),
    prisma.studentProfile.findMany({
      where: { placementNeedsReview: true },
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
    prisma.user.count({ where: { role: "STUDENT" } }),
    prisma.booking.count({
      where: { startsAt: { gte: now }, status: { in: ["CONFIRMED", "PENDING_PAYMENT"] } },
    }),
  ]);

  const rows: AdminBookingRow[] = bookings.map((b) => ({
    id: b.id,
    startsAtIso: b.startsAt.toISOString(),
    lessonName: b.lessonProduct.nameEn,
    studentName: b.student.name ?? b.student.email ?? "—",
    teacherName: b.teacher.user.name ?? b.teacher.user.email ?? "—",
    status: b.status,
    meetUrl: b.meetUrl,
  }));

  return (
    <main className="space-y-10">
      <PageHeader title={t("title")} />

      <StatLedger
        stats={[
          { label: t("overview.statUpcoming"), value: upcomingCount },
          { label: t("overview.statNeedsReview"), value: reviewQueue.length },
          { label: t("overview.statStudents"), value: studentCount },
        ]}
      />

      {/* The queue comes first: it is the only thing on this page waiting on
          someone. The booking list is for looking things up. */}
      <Section title={t("reviewQueue")} ruled={false}>
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

      <Section title={t("bookings")}>
        <AdminBookingsPanel
          bookings={rows}
          locale={locale}
          nowIso={now.toISOString()}
        />
      </Section>

      <Section title={t("students")} description={t("overview.studentsHint")}>
        <Link href="/admin/students" className={buttonClasses({ variant: "secondary" })}>
          {t("bookingsPanel.allStudentsCta")}
        </Link>
      </Section>
    </main>
  );
}
