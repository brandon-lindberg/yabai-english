import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { Section } from "@/components/ui/section";
import type { StudyStreak } from "@/lib/study/streak-service";
import { StudyDayStamp } from "./study-day-stamp";
import styles from "./study-streak.module.css";

const calendarDate = (day: string) => new Date(day + "T12:00:00Z");

export async function DashboardStudyStreak({ streak, locale, account }: {
  streak: StudyStreak;
  locale: string;
  account: string;
}) {
  const t = await getTranslations("dashboard.studyStreak");
  const isDaily = streak.mode === "DAILY";
  const weekday = new Intl.DateTimeFormat(locale, { weekday: "short", timeZone: "UTC" });
  const date = new Intl.DateTimeFormat(locale, { weekday: "long", month: "long", day: "numeric", timeZone: "UTC" });
  const weekRange = new Intl.DateTimeFormat(locale, { month: "short", day: "numeric", timeZone: "UTC" });
  const periodHint = streak.mode === "WEEKLY"
    ? t("weekProgress", { count: Math.min(streak.studiedThisWeek, streak.weeklyGoal), goal: streak.weeklyGoal })
    : t(streak.studiedThisMonth ? "monthMet" : "monthPending");

  return (
    <Section
      title={t("title")}
      actions={<Link href="/dashboard/settings?tab=streak" prefetch={false}
        className="inline-flex min-h-11 items-center text-sm font-semibold text-foreground underline underline-offset-4 hover:text-muted">
        {t("edit")}
      </Link>}
    >
      <div className="grid items-end gap-y-4 sm:grid-cols-[minmax(0,1fr)_minmax(0,26rem)] sm:gap-x-12">
        <div>
          <p data-study-streak-count={streak.count} className="text-2xl font-black tracking-[-0.035em] tabular-nums sm:text-3xl">
            {t(`counter.${streak.mode}`, { count: streak.count })}
          </p>
          <p className="mt-1 text-sm leading-relaxed text-muted">
            {isDaily ? t("studyDay") : periodHint}
          </p>
        </div>
        {isDaily && (
          <div data-study-streak-calendar="">
            <p className="mb-2 text-sm font-medium tabular-nums text-muted">
              {weekRange.formatRange(calendarDate(streak.week[0]), calendarDate(streak.week[6]))}
            </p>
            <ol className="grid grid-cols-7 divide-x divide-border border-y border-border" aria-label={t("calendarLabel")}>
              {streak.week.map((day, position) => {
                const stamp = streak.days[position];
                const today = day === streak.today;
                const value = calendarDate(day);
                const state = stamp ? "dayStudied" : today ? "dayOpen" : day > streak.today ? "dayFuture" : "dayMissed";
                return (
                  <li key={day} data-studied={stamp ? "" : undefined} aria-current={today ? "date" : undefined}
                    className="grid justify-items-center gap-1 py-2 aria-[current=date]:bg-surface">
                    <span className="sr-only">{t(state, { date: date.format(value) })}</span>
                    <time aria-hidden="true" dateTime={day} className={today ? "text-sm font-bold" : "text-sm text-muted"}>
                      {weekday.format(value)}
                    </time>
                    <span className="grid size-8 place-items-center">
                      {stamp ? today
                        ? <StudyDayStamp claim={{ account, day }} />
                        : <span aria-hidden="true" className={styles.stamp} />
                        : <span aria-hidden="true" className={today ? `${styles.guide} text-muted` : "size-1 rounded-full bg-border"} />}
                    </span>
                  </li>
                );
              })}
            </ol>
          </div>
        )}
      </div>
    </Section>
  );
}
