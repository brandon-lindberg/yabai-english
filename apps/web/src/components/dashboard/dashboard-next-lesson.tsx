import { getLocale, getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { bookingStatusKey } from "@/lib/booking-status";
import type { getStudentBookingsForDashboard } from "@/lib/dashboard/student-bookings";

type Upcoming = Awaited<ReturnType<typeof getStudentBookingsForDashboard>>["upcoming"];

export async function DashboardNextLesson({ upcoming }: { upcoming: Upcoming }) {
  const locale = await getLocale();
  const t = await getTranslations("dashboard");
  const th = await getTranslations("dashboard.highlights");
  const next = upcoming[0];

  if (!next) {
    return (
      <div className="rounded-2xl border border-dashed border-border bg-surface/60 p-5">
        <h2 className="text-lg font-semibold text-foreground">{th("nextLessonTitle")}</h2>
        <p className="mt-2 text-sm text-muted">{th("noNextLesson")}</p>
        <Link
          href="/book"
          className="mt-4 inline-flex rounded-full bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:opacity-90"
        >
          {th("bookCta")}
        </Link>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-border bg-surface p-5 shadow-sm">
      <h2 className="text-lg font-semibold text-foreground">{th("nextLessonTitle")}</h2>
      <p className="mt-2 font-medium text-foreground">
        {next.lessonProduct.nameJa} / {next.lessonProduct.nameEn}
      </p>
      <p className="mt-1 text-sm text-muted">
        {next.startsAt.toLocaleString(locale, { dateStyle: "medium", timeStyle: "short" })} —{" "}
        {next.endsAt.toLocaleString(locale, { dateStyle: "medium", timeStyle: "short" })}
      </p>
      <p className="mt-1 text-sm text-muted">
        {t("teacher")}: {next.teacher.user.name ?? next.teacher.user.email}
      </p>
      <div className="mt-3 flex flex-wrap items-center gap-2">
        <span className="rounded-full border border-border bg-background px-2.5 py-1 text-xs font-medium text-foreground">
          {t(bookingStatusKey(next.status))}
        </span>
        {next.meetUrl && next.status === "CONFIRMED" && (
          <a
            href={next.meetUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm font-semibold text-link hover:opacity-90"
          >
            {t("meetLink")}
          </a>
        )}
        <Link href="/dashboard/schedule" className="text-sm text-link">
          {th("fullSchedule")}
        </Link>
      </div>
    </div>
  );
}
