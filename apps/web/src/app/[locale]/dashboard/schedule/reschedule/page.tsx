import { getLocale, getTranslations } from "next-intl/server";
import { notFound } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { lessonProductNames } from "@/lib/lesson-product-catalog";
import { PrivateRescheduleLesson } from "@/components/booking/private-reschedule-lesson";
import { Section } from "@/components/ui/section";

export default async function RescheduleRequestsPage() {
  const session = await auth();
  if (!session?.user?.id || !["STUDENT", "TEACHER"].includes(session.user.role)) notFound();
  const viewer = session.user.role === "TEACHER" ? "teacher" : "student";
  const t = await getTranslations("dashboard.privateReschedule");
  const locale = await getLocale();
  const bookings = await prisma.booking.findMany({
    where: { ...(viewer === "teacher" ? { teacher: { userId: session.user.id } } : { studentId: session.user.id }),
      groupLessonSessionId: null, privateRescheduleStatus: { not: null } },
    orderBy: { rescheduleRequestedAt: "desc" },
    include: { lessonProduct: true,
      student: { select: { name: true, email: true, studentProfile: { select: { timezone: true } } } },
      teacher: { select: { user: { select: { name: true, email: true } }, availabilitySlots: { where: { active: true }, take: 1, select: { timezone: true } } } },
      payments: { where: { status: "SUCCEEDED" }, take: 1, orderBy: { createdAt: "desc" }, select: { amountYen: true } },
      refunds: { take: 1, orderBy: { createdAt: "desc" }, select: { status: true } },
    },
  });
  return <Section title={t("title")}>
    {bookings.length ? bookings.map(booking => {
      const names = lessonProductNames(booking.lessonProduct, booking.learningLanguage);
      const counterpart = viewer === "teacher" ? booking.student : booking.teacher.user;
      return <PrivateRescheduleLesson key={booking.id} bookingId={booking.id} viewer={viewer}
        lessonLabel={locale === "ja" ? names.nameJa : names.nameEn} counterpart={counterpart.name ?? counterpart.email ?? ""}
        startsAtIso={booking.startsAt.toISOString()} timeZone={viewer === "teacher" ? booking.teacher.availabilitySlots[0]?.timezone ?? "Asia/Tokyo" : booking.student.studentProfile?.timezone ?? "Asia/Tokyo"}
        status={booking.privateRescheduleStatus!} bookingStatus={booking.status} rescheduleCount={booking.rescheduleCount} paidAmountYen={booking.payments[0]?.amountYen ?? 0}
        refundStatus={booking.refunds[0]?.status ?? null} hasCalendar={Boolean(booking.googleEventId)} />;
    }) : <p className="text-sm text-muted">{t("empty")}</p>}
  </Section>;
}
