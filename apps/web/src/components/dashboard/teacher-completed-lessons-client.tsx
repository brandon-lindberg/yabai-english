"use client";

import { useLocale, useTranslations } from "next-intl";
import { useCallback, useId, useState } from "react";
import { InvoiceDownloadLinks } from "@/components/dashboard/invoice-download-links";
import { TeacherLessonCompletionNotesForm } from "@/components/dashboard/teacher-lesson-completion-notes-form";
import { formatLessonRange } from "@/lib/format-lesson-datetime";
import { Status } from "@/components/ui/status";
import { groupConsecutive } from "@/components/ui/grouped-list";
import { CollapsibleSection } from "@/components/ui/collapsible-section";
import { groupLessonsByYearAndMonth } from "@/lib/dashboard/group-lessons-by-period";

/**
 * A teacher's teaching history.
 *
 * This screen said "sorted by student, then newest lesson first" and then
 * printed the student's name again on every single row — four identical
 * headings in a column, with the lesson buried underneath. It also offered a
 * Cards/List toggle whose two branches were the same eighty lines of markup
 * twice over, differing only in which field led and how the container was
 * bordered; the expandable notes panel was duplicated verbatim in both.
 *
 * Sorting by student is a structure, so it is the structure: the name appears
 * once as a heading and their lessons hang beneath it. That makes the toggle
 * meaningless — "student first" is no longer a view, it is the shape — so it is
 * gone, and with it one of the two copies of everything.
 *
 * A full-time roster then outgrew even that: one student can carry hundreds of
 * lessons, and every student's whole history was open at once. So a student
 * collapses, and their lessons nest under year and month. Only the most recent
 * student, and their most recent year, start open — the caller sorts
 * most-recent-first, so that is who is being taught now.
 */

export type TeacherCompletedLessonItem = {
  id: string;
  startsAtIso: string;
  endsAtIso: string;
  lessonTitleJa: string;
  lessonTitleEn: string;
  studentDisplay: string;
  initialCompletionNotesMd: string | null;
  initialExternalTranscriptUrl: string | null;
  /** Has a Calendar event, so its Gemini notes document can be looked up. */
  canFetchNotesLink: boolean;
  hasSavedContent: boolean;
  invoiceId: string | null;
};

function Chevron({ open }: { open: boolean }) {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 12 12"
      className={`h-3 w-3 shrink-0 text-muted transition-transform duration-150 motion-reduce:transition-none ${
        open ? "rotate-90" : ""
      }`}
    >
      <path d="M4 2l4 4-4 4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function TeacherCompletedLessonsClient({
  lessons,
}: {
  lessons: TeacherCompletedLessonItem[];
}) {
  const locale = useLocale();
  const t = useTranslations("dashboard.schedulePage");
  // Invoice labels live in the parent namespace, not this page's.
  const td = useTranslations("dashboard");
  const groupId = useId();
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const toggle = useCallback((id: string) => {
    setExpandedId((cur) => (cur === id ? null : id));
  }, []);

  const renderLesson = (lesson: TeacherCompletedLessonItem) => {
    const expanded = expandedId === lesson.id;
    const panelId = `${groupId}-panel-${lesson.id}`;
    return (
      <li key={lesson.id} id={`booking-${lesson.id}`} className="scroll-mt-24 border-b border-border">
        <button
          type="button"
          aria-expanded={expanded}
          aria-controls={panelId}
          onClick={() => toggle(lesson.id)}
          className="flex w-full items-baseline gap-3 py-3 text-left transition-colors hover:bg-[var(--app-hover)]"
        >
          <span className="translate-y-0.5">
            <Chevron open={expanded} />
          </span>
          <span className="min-w-0 flex-1">
            {/* The date leads: within one student, when it happened is what you
                are scanning for. */}
            <span className="block text-sm font-semibold tabular-nums text-foreground">
              {formatLessonRange(lesson.startsAtIso, lesson.endsAtIso, locale)}
            </span>
            <span className="mt-0.5 block truncate text-sm text-muted">
              {lesson.lessonTitleJa} / {lesson.lessonTitleEn}
            </span>
          </span>
          {lesson.hasSavedContent ? (
            <Status tone="settled" className="shrink-0">
              {t("completedLessonsHasNotes")}
            </Status>
          ) : null}
        </button>

        {lesson.invoiceId ? (
          <div className="pb-3 pl-6">
            <InvoiceDownloadLinks
              invoiceId={lesson.invoiceId}
              englishLabel={td("downloadInvoiceEn")}
              japaneseLabel={td("downloadInvoiceJa")}
            />
          </div>
        ) : null}

        {expanded ? (
          <div id={panelId} className="border-t border-border py-4 pl-6">
            <TeacherLessonCompletionNotesForm
              variant="embedded"
              bookingId={lesson.id}
              initialCompletionNotesMd={lesson.initialCompletionNotesMd}
              initialExternalTranscriptUrl={lesson.initialExternalTranscriptUrl}
              canFetchNotesLink={lesson.canFetchNotesLink}
            />
          </div>
        ) : null}
      </li>
    );
  };

  const students = groupConsecutive(
    lessons,
    (lesson) => lesson.studentDisplay,
    (lesson) => lesson.id,
  );

  return (
    <div className="space-y-10">
      {students.map((student, studentIndex) => (
        <CollapsibleSection
          key={student.key}
          label={student.label}
          count={t("completedLessonsCount", { count: student.items.length })}
          defaultOpen={studentIndex === 0}
          level="student"
        >
          <div className="space-y-4 pt-2">
            {groupLessonsByYearAndMonth(
              student.items,
              (lesson) => lesson.startsAtIso,
              locale,
            ).map((year, yearIndex) => (
              <CollapsibleSection
                key={year.key}
                label={year.label}
                count={t("completedLessonsCount", { count: year.count })}
                defaultOpen={yearIndex === 0}
                level="year"
              >
                <div className="space-y-3 pl-4">
                  {year.months.map((month) => (
                    <section key={month.key}>
                      <h5 className="pb-1 text-xs font-semibold uppercase tracking-wide text-muted">
                        {month.label}
                      </h5>
                      <ul className="list-none p-0">{month.items.map(renderLesson)}</ul>
                    </section>
                  ))}
                </div>
              </CollapsibleSection>
            ))}
          </div>
        </CollapsibleSection>
      ))}
    </div>
  );
}
