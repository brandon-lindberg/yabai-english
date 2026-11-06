import { getLocale, getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import type { Prisma } from "@/generated/prisma/client";
import { learningLanguageSchema } from "@/lib/learning-language";
import { AdminBookingsPanel } from "@/components/admin/admin-bookings-panel";
import { actionLinkClass } from "@/components/ui/inline-link";
import { PageHeader } from "@/components/ui/page-header";
import { adminLessonsForPerson, pendingPrivateReschedules, upcomingAdminLessonsWhere } from "@/lib/admin/lesson-filters";
import { lessonProductNames } from "@/lib/lesson-product-catalog";

const bookingSelect = {
  id: true, startsAt: true, status: true, meetUrl: true, learningLanguage: true,
  lessonProduct: { select: { nameEn: true, nameJa: true, tier: true, durationMin: true } },
  student: { select: { name: true, email: true } },
  teacher: { select: { user: { select: { name: true, email: true } } } },
} satisfies Prisma.BookingSelect;

export default async function AdminLessonsPage({ searchParams }: {
  searchParams: Promise<{ subject?: string; person?: string; view?: string }>;
}) {
  const session = await auth();
  if (session?.user.role !== "SUPER_ADMIN") return null;
  const [{ view, subject, person }, locale, t, language] = await Promise.all([
    searchParams, getLocale(), getTranslations("admin"), getTranslations("admin.teachingLanguages"),
  ]);
  const parsed = learningLanguageSchema.safeParse(subject);
  const personId = typeof person === "string" && person.length <= 200 ? person : undefined;
  const filters: Prisma.BookingWhereInput = {
    ...(parsed.success ? { learningLanguage: parsed.data } : {}),
    ...(personId ? adminLessonsForPerson(personId) : {}),
  };
  const now = new Date();
  const queue = view === "reschedules" ? "reschedules" : view === "upcoming" ? "upcoming" : undefined;
  const findBookings = (where: Prisma.BookingWhereInput, order: Prisma.SortOrder, take: number) =>
    prisma.booking.findMany({ where: { ...filters, ...where }, orderBy: { startsAt: order }, take, select: bookingSelect });
  const bookings = queue === "reschedules" ? await findBookings(pendingPrivateReschedules, "asc", 200)
    : queue === "upcoming" ? await findBookings(upcomingAdminLessonsWhere(now), "asc", 200)
    : (await Promise.all([
      findBookings({ startsAt: { gte: now } }, "asc", 100),
      findBookings({ startsAt: { lt: now } }, "desc", 100),
    ])).flat();

  return (
    <main>
      <PageHeader title={t("nav.lessons")} description={
        queue === "reschedules" ? t("bookingsPanel.pendingReschedules") :
          parsed.success ? language(parsed.data) : undefined
      } actions={queue || parsed.success ?
        <Link href="/admin/lessons" className={actionLinkClass}>{t("bookingsPanel.clearFilters")}</Link> : undefined} />
      <AdminBookingsPanel locale={locale} nowIso={now.toISOString()} queue={queue} initialScope={view === "history" ? "past" : undefined} bookings={bookings.map((booking) => {
        const names = lessonProductNames(booking.lessonProduct, booking.learningLanguage);
        return {
          id: booking.id,
          learningLanguage: booking.learningLanguage,
          startsAtIso: booking.startsAt.toISOString(),
          lessonName: locale === "ja" ? names.nameJa : names.nameEn,
          studentName: booking.student.name ?? booking.student.email ?? "—",
          teacherName: booking.teacher.user.name ?? booking.teacher.user.email ?? "—",
          status: booking.status,
          meetUrl: booking.meetUrl,
        };
      })} />
    </main>
  );
}
