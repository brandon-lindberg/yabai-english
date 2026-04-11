import { getTranslations } from "next-intl/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { Link } from "@/i18n/navigation";
import { bookingStatusKey } from "@/lib/booking-status";
import { DashboardScheduleCalendar } from "@/components/dashboard-schedule-calendar";
import { buildGoogleCalendarUrl } from "@/lib/calendar";
export default async function DashboardPage() {
  const t = await getTranslations("dashboard");
  const tCommon = await getTranslations("common");
  const session = await auth();
  if (!session?.user?.id) return null;

  const profile = await prisma.studentProfile.findUnique({
    where: { userId: session.user.id },
  });

  const isStudent = session.user.role === "STUDENT";

  const bookings = await prisma.booking.findMany({
    where: { studentId: session.user.id },
    orderBy: { startsAt: "asc" },
    include: {
      lessonProduct: true,
      teacher: { include: { user: true } },
      invoice: true,
    },
  });

  const now = new Date();
  const upcoming = bookings.filter((b) => b.endsAt >= now);
  const scheduleItems = upcoming.map((b) => ({
    id: b.id,
    startsAtIso: b.startsAt.toISOString(),
    endsAtIso: b.endsAt.toISOString(),
    title: `${b.lessonProduct.nameJa} / ${b.lessonProduct.nameEn}`,
    teacherName: b.teacher.user.name ?? b.teacher.user.email ?? "",
  }));

  return (
    <main className="mx-auto max-w-3xl flex-1 px-4 py-10 sm:px-6">
      <h1 className="text-2xl font-bold text-foreground">{t("title")}</h1>
      {isStudent && profile && (
        <p className="mt-2 text-muted">
          {t("placedLevel")}:{" "}
          <span className="font-semibold text-foreground">
            {profile.placedLevel === "UNSET"
              ? t("placedUnset")
              : `${t(`levelLabel.${profile.placedLevel}`)} ${t("subLevelShort", {
                  subLevel: profile.placedSubLevel ?? 1,
                })}`}
          </span>
        </p>
      )}
      <div className="mt-4 flex flex-wrap gap-3">
        <Link
          href="/book"
          className="rounded-full bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:opacity-90"
        >
          {tCommon("bookLesson")}
        </Link>
        {isStudent && profile?.placedLevel === "UNSET" && (
          <Link
            href="/placement"
            className="rounded-full border border-accent/40 bg-accent/10 px-4 py-2 text-sm font-semibold text-foreground hover:bg-accent/20"
          >
            {t("placementCta")}
          </Link>
        )}
        {isStudent && profile && profile.placedLevel !== "UNSET" && (
          <Link
            href="/placement"
            className="rounded-full border border-border px-4 py-2 text-sm font-semibold text-muted hover:bg-[var(--app-hover)]"
          >
            {t("retakePlacement")}
          </Link>
        )}
      </div>

      <section className="mt-10">
        <h2 className="text-lg font-semibold text-foreground">{t("upcoming")}</h2>
        <DashboardScheduleCalendar items={scheduleItems} />
        <ul className="mt-4 space-y-4">
          {upcoming.length === 0 ? (
            <li className="rounded-2xl border border-dashed border-border bg-surface p-6 text-muted">
              {t("noBookings")}
            </li>
          ) : (
            upcoming.map((b) => (
              <li
                key={b.id}
                id={`booking-${b.id}`}
                className="rounded-2xl border border-border bg-surface p-4 shadow-sm"
              >
                <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <p className="font-medium text-foreground">
                      {b.lessonProduct.nameJa} / {b.lessonProduct.nameEn}
                    </p>
                    <p className="text-sm text-muted">
                      {b.startsAt.toLocaleString()} — {b.endsAt.toLocaleString()}
                    </p>
                    <p className="text-sm text-muted">
                      {t("teacher")}: {b.teacher.user.name ?? b.teacher.user.email}
                    </p>
                    <div className="mt-2 flex flex-wrap gap-2">
                      <span className="rounded-full border border-border bg-background px-2.5 py-1 text-xs font-medium text-foreground">
                        {t(bookingStatusKey(b.status))}
                      </span>
                      {b.status === "PENDING_PAYMENT" && (
                        <Link
                          href={`/book/checkout/${b.id}`}
                          className="rounded-full bg-primary px-3 py-1 text-xs font-semibold text-primary-foreground hover:opacity-90"
                        >
                          {t("completePayment")}
                        </Link>
                      )}
                      {b.invoice && (
                        <a
                          href={`/api/invoices/${b.invoice.id}/csv`}
                          className="rounded-full border border-border bg-surface px-3 py-1 text-xs font-medium text-foreground hover:bg-[var(--app-hover)]"
                        >
                          {t("downloadInvoice")}
                        </a>
                      )}
                      <a
                        href={buildGoogleCalendarUrl({
                          uid: `booking-${b.id}@english-studio.local`,
                          title: `${b.lessonProduct.nameEn} (${b.lessonProduct.nameJa})`,
                          description: `${t("teacher")}: ${b.teacher.user.name ?? b.teacher.user.email}`,
                          location: b.meetUrl ?? "English Studio lesson",
                          startsAt: b.startsAt,
                          endsAt: b.endsAt,
                        })}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="rounded-full border border-border bg-surface px-3 py-1 text-xs font-medium text-foreground hover:bg-[var(--app-hover)]"
                      >
                        {t("addToGoogleCalendar")}
                      </a>
                      <a
                        href={`/api/bookings/ics?bookingId=${b.id}`}
                        className="rounded-full border border-border bg-surface px-3 py-1 text-xs font-medium text-foreground hover:bg-[var(--app-hover)]"
                      >
                        {t("downloadIcs")}
                      </a>
                    </div>
                  </div>
                  {b.meetUrl && (
                    <a
                      href={b.meetUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="mt-2 inline-flex text-sm font-semibold text-link hover:opacity-90 sm:mt-0"
                    >
                      {t("meetLink")}
                    </a>
                  )}
                </div>
              </li>
            ))
          )}
        </ul>
      </section>
    </main>
  );
}
