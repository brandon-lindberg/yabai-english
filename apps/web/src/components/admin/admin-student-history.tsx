"use client";

import { useLocale, useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { LearningLanguage } from "@/generated/prisma/enums";
import type { AdminStudentOverview } from "@/lib/admin/student-overview";
import { formatCalendarDate } from "@/lib/date-only-in-zone";
import { bookingStatusKey, bookingStatusTone } from "@/lib/booking-status";
import { LocalDateTime } from "@/components/local-datetime";
import { DataList, DataRow } from "@/components/ui/data-row";
import { Section } from "@/components/ui/section";
import { Status } from "@/components/ui/status";
import { actionLinkClass } from "@/components/ui/inline-link";

export function AdminStudentHistory({ overview, studentId, learningLanguage, interfaceLocale }: {
  overview: AdminStudentOverview;
  studentId: string;
  learningLanguage: LearningLanguage;
  interfaceLocale: string;
}) {
  const t = useTranslations("admin.profileOverview");
  const language = useTranslations("admin.teachingLanguages");
  const dashboard = useTranslations("dashboard");
  const locale = useLocale();
  const formatLevel = (level: string, subLevel?: number | null) => {
    if (level === "BEGINNER" || level === "INTERMEDIATE" || level === "ADVANCED") {
      return [t(`levels.${level}`), subLevel].filter(Boolean).join(" ");
    }
    return level === "BELOW_N5" ? t("levels.BELOW_N5") : level;
  };

  return (
    <Section title={t("studentHistory")}>
      <dl className="mb-5 flex flex-wrap gap-x-10 gap-y-3 text-sm">
        <div><dt className="text-muted">{t("learningPath")}</dt><dd className="mt-1 font-semibold">{language(learningLanguage)}</dd></div>
        <div><dt className="text-muted">{t("interfaceLanguage")}</dt>
          <dd className="mt-1 font-semibold">{interfaceLocale === "en" ? language("ENGLISH") : interfaceLocale === "ja" ? language("JAPANESE") : interfaceLocale}</dd>
        </div>
      </dl>
      <div className="grid divide-y divide-border border-y border-border lg:grid-cols-2 lg:divide-x lg:divide-y-0">
        {Object.values(LearningLanguage).map((subject) => {
          const history = overview[subject];
          const latest = history.attempts[0];
          const status = history.currentLevel ? "AWARDED" : latest ? "INCONCLUSIVE" : "UNASSESSED";
          return (
            <section key={subject} aria-label={language(subject)} className="min-w-0 space-y-4 py-5 lg:px-5 lg:first:pl-0 lg:last:pr-0">
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <h3 className="text-lg font-bold">{language(subject)}</h3>
                <span className="text-sm text-muted">{t("lessonCount", { count: history.lessonCount })}</span>
              </div>
              <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
                {history.currentLevel && <p className="text-2xl font-bold tracking-[-0.02em]">{formatLevel(history.currentLevel, history.subLevel)}</p>}
                <Status tone={status === "AWARDED" ? "settled" : status === "INCONCLUSIVE" ? "warn" : "open"}>{t(`assessment.${status}`)}</Status>
              </div>
              {history.currentLevel && latest?.status === "INCONCLUSIVE" && <p className="text-sm text-muted">{t("latestInconclusive")}</p>}
              {(history.completedAt || latest?.completedAt) && (
                <dl className="space-y-1 text-sm">
                  <div className="flex flex-wrap gap-x-2"><dt className="text-muted">{t("completed")}</dt>
                    <dd><LocalDateTime iso={history.completedAt ?? latest.completedAt} locale={locale} timeStyle={null} /></dd>
                  </div>
                  <div className="flex flex-wrap gap-x-2">
                    <dt className="text-muted">{t(history.retakeDate ? "retake" : "retakeAvailability")}</dt>
                    <dd>{history.retakeDate ? formatCalendarDate(history.retakeDate, locale) : t("retakeNow")}</dd>
                  </div>
                </dl>
              )}
              {history.attempts.length > 0 && (
                <details className="border-t border-border pt-3">
                  <summary className="cursor-pointer text-sm font-medium">{t("recentAssessments")}</summary>
                  <ul className="mt-2 divide-y divide-border text-sm">
                    {history.attempts.map((attempt) => (
                      <li key={attempt.id} className="flex flex-wrap justify-between gap-2 py-2">
                        <LocalDateTime iso={attempt.completedAt} locale={locale} timeStyle={null} className="text-muted" />
                        <span>{attempt.level ? formatLevel(attempt.level, attempt.subLevel) : t(`assessment.${attempt.status}`)}</span>
                      </li>
                    ))}
                  </ul>
                </details>
              )}
              {history.lessons.length ? (
                <details className="border-t border-border pt-3">
                  <summary className="cursor-pointer text-sm font-medium">{t("recentLessons")}</summary>
                  <DataList className="mt-2">
                    {history.lessons.map((lesson) => (
                      <DataRow key={lesson.id}>
                        <p className="text-sm font-medium">{locale === "ja" ? lesson.names.nameJa : lesson.names.nameEn}</p>
                        <p className="my-1 text-xs text-muted"><LocalDateTime iso={lesson.startsAt} locale={locale} />{lesson.teacher ? ` · ${lesson.teacher}` : ""}</p>
                        <Status tone={bookingStatusTone(lesson.status)}>{dashboard(bookingStatusKey(lesson.status))}</Status>
                      </DataRow>
                    ))}
                  </DataList>
                  <Link className={`${actionLinkClass} mt-3 text-sm`} href={`/admin/lessons?view=history&subject=${subject}&person=${encodeURIComponent(studentId)}`}>
                    {t("allLessons")}
                  </Link>
                </details>
              ) : <p className="border-t border-border pt-3 text-sm text-muted">{t("noLessons")}</p>}
            </section>
          );
        })}
      </div>
    </Section>
  );
}
