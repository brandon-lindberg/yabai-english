import { notFound } from "next/navigation";
import { getLocale, getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { AdminPersonSchedule } from "@/components/admin/admin-person-schedule";
import { actionLinkClass } from "@/components/ui/inline-link";
import { PageHeader } from "@/components/ui/page-header";
import { adminLessonCalendarQuery } from "@/lib/admin/lesson-calendar";
import { loadAdminPersonSchedule } from "@/lib/admin/lesson-search";
import { bookingStatusKey, resolveBookingDisplayStatus } from "@/lib/booking-status";
import { lessonProductNames } from "@/lib/lesson-product-catalog";

export default async function AdminPersonSchedulePage({ params, searchParams }: {
  params: Promise<{ userId: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const session = await auth();
  if (session?.user.role !== "SUPER_ADMIN") return null;
  const [{ userId }, raw, locale, t, dashboard, language] = await Promise.all([
    params, searchParams, getLocale(), getTranslations("admin.lessonCalendar"), getTranslations("dashboard"), getTranslations("admin.teachingLanguages"),
  ]);
  if (userId.length > 200) notFound();
  const person = await prisma.user.findUnique({ where: { id: userId }, select: {
    name: true, email: true, role: true, teacherProfile: { select: { displayName: true } },
  } });
  if (!person || (person.role !== "STUDENT" && person.role !== "TEACHER" && !person.teacherProfile)) notFound();

  const parsed = adminLessonCalendarQuery.safeParse(raw);
  const query = parsed.success && parsed.data.date ? parsed.data : adminLessonCalendarQuery.parse({});
  const now = new Date();
  const bookings = await loadAdminPersonSchedule(prisma, userId, query, now);
  const personName = person.name ?? person.teacherProfile?.displayName ?? person.email ?? t("unnamed");

  return (
    <main className="space-y-5">
      <Link className={`${actionLinkClass} text-sm`} href={`/admin/users/${encodeURIComponent(userId)}`}>{t("profile")}</Link>
      <div className="break-words">
        <PageHeader title={t("title", { name: personName })} description={t("description")} />
      </div>
      <AdminPersonSchedule personId={userId} query={query} nowIso={now.toISOString()} items={bookings.map((booking) => {
        const names = lessonProductNames(booking.lessonProduct, booking.learningLanguage);
        const counterpart = booking.student.id === userId ? booking.teacher.user : booking.student;
        const displayName = booking.student.id === userId ? booking.teacher.displayName : null;
        const status = resolveBookingDisplayStatus(booking, now);
        return {
          id: booking.id, startsAtIso: booking.startsAt.toISOString(), endsAtIso: booking.endsAt.toISOString(),
          title: locale === "ja" ? names.nameJa : names.nameEn,
          counterpartName: displayName ?? counterpart.name ?? counterpart.email ?? t("unnamed"),
          isPast: booking.endsAt <= now || status === "CANCELLED" || status === "EXPIRED" || status === "COMPLETED",
          groupSeats: null,
          annotation: `${dashboard(bookingStatusKey(status))} · ${language(booking.learningLanguage)}`,
        };
      })} />
    </main>
  );
}
