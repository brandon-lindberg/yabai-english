import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { getLocale } from "next-intl/server";
import { prisma } from "@/lib/prisma";
import { BookingForm } from "@/components/booking-form";
import { buildUpcomingSlotOptions } from "@/lib/availability";
import { auth } from "@/auth";
import { weekdayLabel } from "@/lib/weekdays";

type Props = {
  params: Promise<{ teacherId: string }>;
};

export default async function TeacherProfileBookingPage({ params }: Props) {
  const t = await getTranslations("booking");
  const locale = await getLocale();
  const { teacherId } = await params;

  const teacher = await prisma.teacherProfile.findUnique({
    where: { id: teacherId },
    include: {
      user: true,
      availabilitySlots: {
        where: { active: true },
        orderBy: [{ dayOfWeek: "asc" }, { startMin: "asc" }],
      },
    },
  });

  if (!teacher) notFound();

  const displayName = teacher.displayName ?? teacher.user.name ?? "Teacher";
  const session = await auth();
  const studentProfile = session?.user?.id
    ? await prisma.studentProfile.findUnique({
        where: { userId: session.user.id },
        select: { timezone: true },
      })
    : null;
  const viewerTimezone = studentProfile?.timezone ?? "Asia/Tokyo";
  const slotOptions = buildUpcomingSlotOptions({
    availabilitySlots: teacher.availabilitySlots.map((slot) => ({
      id: slot.id,
      dayOfWeek: slot.dayOfWeek,
      startMin: slot.startMin,
      endMin: slot.endMin,
      timezone: slot.timezone,
    })),
    viewerTimezone,
    minimumLeadHours: 48,
  });

  return (
    <main className="mx-auto max-w-4xl flex-1 px-4 py-10 sm:px-6">
      <section className="rounded-2xl border border-border bg-surface p-6">
        <div className="mb-4 flex h-20 w-20 items-center justify-center overflow-hidden rounded-full border border-border bg-background text-sm text-muted">
          {teacher.user.image ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={teacher.user.image} alt={displayName} className="h-full w-full object-cover" />
          ) : (
            displayName.slice(0, 2).toUpperCase()
          )}
        </div>
        <h1 className="text-2xl font-bold text-foreground">{displayName}</h1>
        <p className="mt-2 text-sm text-muted">
          {(teacher.countryOfOrigin ?? "—") + " · " + teacher.instructionLanguages.join(", ")}
        </p>
        {teacher.credentials && (
          <p className="mt-3 text-sm text-foreground">{teacher.credentials}</p>
        )}
        {teacher.bio && <p className="mt-2 text-sm text-muted">{teacher.bio}</p>}
        {teacher.specialties.length > 0 && (
          <p className="mt-2 text-sm text-muted">
            {t("teacherSpecialties")}: {teacher.specialties.join(" · ")}
          </p>
        )}
        <p className="mt-2 text-sm text-foreground">
          {t("teacherRate")}:{" "}
          {teacher.rateYen ? `JPY ${teacher.rateYen.toLocaleString()}` : "JPY —"}
        </p>
      </section>

      <section className="mt-6 rounded-2xl border border-border bg-surface p-6">
        <h2 className="text-lg font-semibold text-foreground">{t("availability")}</h2>
        <ul className="mt-3 space-y-2">
          {teacher.availabilitySlots.length === 0 ? (
            <li className="text-sm text-muted">{t("noAvailabilityYet")}</li>
          ) : (
            teacher.availabilitySlots.map((slot) => (
              <li key={slot.id} className="text-sm text-muted">
                {weekdayLabel(slot.dayOfWeek, locale)} ·{" "}
                {String(Math.floor(slot.startMin / 60)).padStart(2, "0")}:
                {String(slot.startMin % 60).padStart(2, "0")} -{" "}
                {String(Math.floor(slot.endMin / 60)).padStart(2, "0")}:
                {String(slot.endMin % 60).padStart(2, "0")} ({slot.timezone})
              </li>
            ))
          )}
        </ul>
      </section>

      <section className="mt-6">
        <h2 className="text-lg font-semibold text-foreground">{t("scheduleWithTeacher")}</h2>
        <p className="mt-1 text-sm text-muted">
          {t("selectSlot")} · {t("timezoneShownAs")}: {viewerTimezone}
        </p>
        <p
          className="mt-2 rounded-xl border px-3 py-2 text-xs"
          style={{
            borderColor: "var(--app-warn-border)",
            background: "var(--app-warn-bg)",
            color: "var(--app-warn-text)",
          }}
        >
          {t("leadTimeNotice")}
        </p>
        <div className="mt-4 max-w-lg">
          <BookingForm
            teacherProfileId={teacher.id}
            currentUserRole={session?.user?.role ?? "STUDENT"}
            presetSlots={slotOptions.map((slot) => ({
              startsAtIso: slot.startsAtIso,
              label: slot.label,
            }))}
          />
        </div>
      </section>
    </main>
  );
}
