import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { getLocale } from "next-intl/server";
import { prisma } from "@/lib/prisma";
import { BookingForm } from "@/components/booking-form";
import { buildUpcomingSlotOptions } from "@/lib/availability";
import { formatAvailabilitySlotMeta } from "@/lib/availability-slot-lesson-meta";
import { auth } from "@/auth";
import { weekdayLabel } from "@/lib/weekdays";
import { redirectTargetForTeacherBookingPage } from "@/lib/teacher-booking-page-access";
import { formatYenRange, getTeacherRateRangeByType } from "@/lib/teacher-rate-range";
import { redirect } from "@/i18n/navigation";
import { PageHeader } from "@/components/ui/page-header";
import { AppCard } from "@/components/ui/app-card";
import { InlineAlert } from "@/components/ui/inline-alert";

type Props = {
  params: Promise<{ teacherId: string }>;
};

export default async function TeacherProfileBookingPage({ params }: Props) {
  const t = await getTranslations("booking");
  const tSlotMeta = await getTranslations("lessonSlotMeta");
  const locale = await getLocale();
  const { teacherId } = await params;
  const session = await auth();

  const viewerTeacherProfileId =
    session?.user?.role === "TEACHER"
      ? (
          await prisma.teacherProfile.findUnique({
            where: { userId: session.user.id },
            select: { id: true },
          })
        )?.id ?? null
      : null;

  const redirectHref = redirectTargetForTeacherBookingPage({
    role: session?.user?.role,
    requestedTeacherProfileId: teacherId,
    viewerTeacherProfileId,
  });
  if (redirectHref) {
    redirect({ href: redirectHref, locale });
  }

  const teacher = await prisma.teacherProfile.findUnique({
    where: { id: teacherId },
    include: {
      user: true,
      availabilitySlots: {
        where: { active: true },
        orderBy: [{ dayOfWeek: "asc" }, { startMin: "asc" }],
      },
      availabilityOccurrenceSkips: {
        select: { startsAtIso: true },
      },
      lessonOfferings: {
        where: { active: true },
        select: { active: true, rateYen: true, isGroup: true },
      },
    },
  });

  if (!teacher) notFound();

  const displayName = teacher.displayName ?? teacher.user.name ?? "Teacher";
  if (session?.user?.id && session.user.role === "STUDENT") {
    const hiddenByTeacher = await prisma.chatThread.findFirst({
      where: {
        studentId: session.user.id,
        teacherId: teacher.userId,
        teacherBlockedAt: { not: null },
      },
      select: { id: true },
    });
    if (hiddenByTeacher) {
      notFound();
    }
  }
  const studentProfile = session?.user?.id
    ? await prisma.studentProfile.findUnique({
        where: { userId: session.user.id },
        select: { timezone: true },
      })
    : null;
  const viewerTimezone = studentProfile?.timezone ?? "Asia/Tokyo";
  const skippedStartsAtIso = new Set(
    teacher.availabilityOccurrenceSkips.map((s) => s.startsAtIso),
  );
  const slotOptions = buildUpcomingSlotOptions({
    availabilitySlots: teacher.availabilitySlots.map((slot) => ({
      id: slot.id,
      dayOfWeek: slot.dayOfWeek,
      startMin: slot.startMin,
      endMin: slot.endMin,
      timezone: slot.timezone,
      lessonLevel: slot.lessonLevel,
      lessonType: slot.lessonType,
      lessonTypeCustom: slot.lessonTypeCustom,
    })),
    viewerTimezone,
    minimumLeadHours: 48,
    skippedStartsAtIso,
    formatLessonMeta: (slot) =>
      formatAvailabilitySlotMeta(slot, (k) => tSlotMeta(`levels.${k}`), (k) => tSlotMeta(`types.${k}`)),
  });

  const subtitle = `${teacher.countryOfOrigin ?? "—"} · ${teacher.instructionLanguages.join(", ")}`;
  const individualRateRange = getTeacherRateRangeByType(
    teacher.lessonOfferings,
    "individual",
    teacher.rateYen,
  );
  const groupRateRange = getTeacherRateRangeByType(teacher.lessonOfferings, "group");

  return (
    <main className="mx-auto max-w-4xl flex-1 px-4 py-10 sm:px-6">
      <PageHeader title={displayName} description={subtitle} />

      <div className="mt-8 grid gap-6 lg:grid-cols-2">
        <AppCard>
          <div className="mb-4 flex h-16 w-16 items-center justify-center overflow-hidden rounded-full border border-border bg-background text-sm text-muted">
            {teacher.user.image ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={teacher.user.image} alt={displayName} className="h-full w-full object-cover" />
            ) : (
              displayName.slice(0, 2).toUpperCase()
            )}
          </div>
          {teacher.credentials ? (
            <p className="text-sm text-foreground">{teacher.credentials}</p>
          ) : null}
          {teacher.bio ? <p className="mt-2 text-sm text-muted">{teacher.bio}</p> : null}
          {teacher.specialties.length > 0 ? (
            <p className="mt-3 text-sm text-muted">
              {t("teacherSpecialties")}: {teacher.specialties.join(" · ")}
            </p>
          ) : null}
          <p className="mt-3 text-sm font-medium text-foreground">
            {t("teacherRateIndividual")}: {formatYenRange(individualRateRange)}
          </p>
          <p className="mt-1 text-sm font-medium text-foreground">
            {t("teacherRateGroup")}: {formatYenRange(groupRateRange)}
          </p>
        </AppCard>

        <AppCard>
          <h2 className="text-base font-semibold text-foreground">{t("availability")}</h2>
          <ul className="mt-3 max-h-72 space-y-2 overflow-y-auto pr-1">
            {teacher.availabilitySlots.length === 0 ? (
              <li className="text-sm text-muted">{t("noAvailabilityYet")}</li>
            ) : (
              teacher.availabilitySlots.map((slot) => (
                <li key={slot.id} className="text-sm text-muted">
                  {weekdayLabel(slot.dayOfWeek, locale)} ·{" "}
                  {String(Math.floor(slot.startMin / 60)).padStart(2, "0")}:
                  {String(slot.startMin % 60).padStart(2, "0")} -{" "}
                  {String(Math.floor(slot.endMin / 60)).padStart(2, "0")}:
                  {String(slot.endMin % 60).padStart(2, "0")} ({slot.timezone}) ·{" "}
                  {formatAvailabilitySlotMeta(
                    {
                      lessonLevel: slot.lessonLevel,
                      lessonType: slot.lessonType,
                      lessonTypeCustom: slot.lessonTypeCustom,
                    },
                    (k) => tSlotMeta(`levels.${k}`),
                    (k) => tSlotMeta(`types.${k}`),
                  )}
                </li>
              ))
            )}
          </ul>
        </AppCard>
      </div>

      <section className="mt-8 space-y-4">
        <h2 className="text-lg font-semibold text-foreground">{t("scheduleWithTeacher")}</h2>
        <p className="text-sm text-muted">
          {t("selectSlot")} · {t("timezoneShownAs")}: {viewerTimezone}
        </p>
        <InlineAlert variant="warning">{t("leadTimeNotice")}</InlineAlert>
        <BookingForm
          teacherProfileId={teacher.id}
          currentUserRole={session?.user?.role ?? "STUDENT"}
          presetSlots={slotOptions.map((slot) => ({
            startsAtIso: slot.startsAtIso,
            label: slot.label,
          }))}
        />
      </section>
    </main>
  );
}
