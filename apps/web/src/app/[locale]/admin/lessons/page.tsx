import { cookies } from "next/headers";
import { getLocale, getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { AdminBookingsPanel } from "@/components/admin/admin-bookings-panel";
import { AdminLessonFilters } from "@/components/admin/admin-lesson-filters";
import { buttonClasses } from "@/components/ui/button";
import { PageHeader } from "@/components/ui/page-header";
import { adminLessonQuery, adminLessonSearch, adminLessonsHref, defaultAdminLessonQuery, loadAdminLessons } from "@/lib/admin/lesson-search";
import { adminPersonScheduleHref } from "@/lib/admin/lesson-calendar";
import { lessonProductNames } from "@/lib/lesson-product-catalog";
import { validViewerTimeZone, VIEWER_TIME_ZONE_COOKIE } from "@/lib/viewer-time-zone";

export default async function AdminLessonsPage({ searchParams }: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const session = await auth();
  if (session?.user.role !== "SUPER_ADMIN") return null;
  const [raw, locale, t] = await Promise.all([searchParams, getLocale(), getTranslations("admin")]);
  const parsed = adminLessonQuery.safeParse(Object.fromEntries(Object.entries(raw).filter(([, value]) => value !== "")));
  const query = parsed.success ? parsed.data : defaultAdminLessonQuery;
  if (!query.zone && (query.from || query.to)) {
    query.zone = validViewerTimeZone((await cookies()).get(VIEWER_TIME_ZONE_COOKIE)?.value);
  }
  const search = adminLessonSearch(query);
  const [result, person] = await Promise.all([
    parsed.success ? loadAdminLessons(prisma, query, new Date()) : null,
    query.person ? prisma.user.findUnique({ where: { id: query.person }, select: { name: true, email: true } }) : null,
  ]);
  const pageHref = (page: number) => adminLessonsHref(adminLessonSearch({ ...query, page }));

  return (
    <main className="space-y-6">
      <PageHeader title={t("nav.lessons")} description={query.view === "reschedules" ? t("bookingsPanel.pendingReschedules") : undefined}
        actions={person && query.person ? (
          <Link className={buttonClasses({ variant: "secondary" })} href={adminPersonScheduleHref(query.person, query.from ? { date: query.from, view: "week" } : undefined)}>
            {t("lessonCalendar.open")}
          </Link>
        ) : (
          <Link className={buttonClasses({ variant: "secondary" })} href="/admin/users">{t("lessonCalendar.findPerson")}</Link>
        )} />
      <AdminLessonFilters key={search} query={query} personName={person?.name ?? person?.email ?? query.person}
        hasFilters={Boolean(query.q || query.person || query.subject || query.status || query.from || query.to || query.view !== "all" || !parsed.success)} />
      {result ? <>
        <p role="status" className="text-sm text-muted">
          {t("bookingsPanel.results", { total: result.total, page: result.page, pages: result.totalPages })}
        </p>
        <AdminBookingsPanel search={search} locale={locale} bookings={result.bookings.map((booking) => {
          const names = lessonProductNames(booking.lessonProduct, booking.learningLanguage);
          return {
            id: booking.id, learningLanguage: booking.learningLanguage, startsAtIso: booking.startsAt.toISOString(),
            lessonName: locale === "ja" ? names.nameJa : names.nameEn,
            studentName: booking.student.name ?? booking.student.email ?? "—",
            teacherName: booking.teacher.displayName ?? booking.teacher.user.name ?? booking.teacher.user.email ?? "—",
            status: booking.status, meetUrl: booking.meetUrl,
            reschedulePending: booking.privateRescheduleStatus === "PENDING",
          };
        })} />
        {result.totalPages > 1 && <nav aria-label={t("bookingsPanel.pages")} className="flex flex-wrap gap-2">
          {result.page > 1 && <Link className={buttonClasses({ variant: "secondary" })} href={pageHref(result.page - 1)}>{t("grid.prev")}</Link>}
          {result.page < result.totalPages && <Link className={buttonClasses({ variant: "secondary" })} href={pageHref(result.page + 1)}>{t("grid.next")}</Link>}
        </nav>}
      </> : <p role="alert" className="text-sm text-destructive">{t("bookingsPanel.invalidFilters")}</p>}
    </main>
  );
}
