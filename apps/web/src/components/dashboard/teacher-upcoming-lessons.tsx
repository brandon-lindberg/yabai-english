import { getLocale, getTranslations } from "next-intl/server";
import type { getTeacherBookingsForDashboard } from "@/lib/dashboard/teacher-bookings";

type Upcoming = Awaited<ReturnType<typeof getTeacherBookingsForDashboard>>["upcoming"];

export async function TeacherUpcomingLessons({ upcoming }: { upcoming: Upcoming }) {
  const locale = await getLocale();
  const t = await getTranslations("dashboard");

  if (upcoming.length === 0) {
    return <li className="rounded-2xl border border-dashed border-border bg-surface p-6 text-muted">{t("noBookings")}</li>;
  }

  return (
    <>
      {upcoming.map((b) => (
        <li key={b.id} className="rounded-2xl border border-border bg-surface p-4 shadow-sm">
          <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="font-medium text-foreground">
                {b.lessonProduct.nameJa} / {b.lessonProduct.nameEn}
              </p>
              <p className="text-sm text-muted">
                {b.startsAt.toLocaleString(locale, { dateStyle: "medium", timeStyle: "short" })} -{" "}
                {b.endsAt.toLocaleString(locale, { dateStyle: "medium", timeStyle: "short" })}
              </p>
              <p className="text-sm text-muted">
                Student: {b.student.name ?? b.student.email}
              </p>
            </div>
            {b.meetUrl ? (
              <a
                href={b.meetUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-2 inline-flex text-sm font-semibold text-link hover:opacity-90 sm:mt-0"
              >
                {t("meetLink")}
              </a>
            ) : null}
          </div>
        </li>
      ))}
    </>
  );
}
