"use client";

import { useLocale, useTranslations } from "next-intl";
import { useCallback, useId, useState } from "react";
import { InvoiceDownloadLinks } from "@/components/dashboard/invoice-download-links";
import { TeacherLessonCompletionNotesForm } from "@/components/dashboard/teacher-lesson-completion-notes-form";
import { formatLessonRange } from "@/lib/format-lesson-datetime";
import { Status } from "@/components/ui/status";
import { GroupedList } from "@/components/ui/grouped-list";

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
 * Sorting by student is a structure, so it is now the structure: the name
 * appears once as a heading and their lessons hang beneath it. That makes the
 * toggle meaningless — "student first" is no longer a view, it is the shape —
 * so it is gone, and with it one of the two copies of everything.
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
  notesDocId: string | null;
  transcriptArtifactIds: string[];
  smartNotesIds: string[];
  recordingIds: string[];
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

  return (
    <GroupedList
      items={lessons}
      labelOf={(lesson) => lesson.studentDisplay}
      keyOf={(lesson) => lesson.id}
      countLabel={(count) => t("completedLessonsCount", { count })}
      empty={null}
      renderItem={(lesson) => {
              const expanded = expandedId === lesson.id;
              const panelId = `${groupId}-panel-${lesson.id}`;
              const notesDocUrl = lesson.notesDocId
                ? `https://docs.google.com/document/d/${lesson.notesDocId}/edit`
                : "";
              const hasGoogleRecap =
                notesDocUrl.length > 0 ||
                lesson.transcriptArtifactIds.length > 0 ||
                lesson.smartNotesIds.length > 0 ||
                lesson.recordingIds.length > 0;

              return (
                <li
                  key={lesson.id}
                  id={`booking-${lesson.id}`}
                  className="scroll-mt-24 border-b border-border"
                >
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
                      {/* The date leads: within one student, when it happened is
                          what you are scanning for. */}
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
                      {hasGoogleRecap ? (
                        <div className="mb-4 space-y-1">
                          <p className="text-sm font-semibold text-foreground">
                            {t("googleRecapSectionLabel")}
                          </p>
                          {notesDocUrl ? (
                            <p className="text-sm">
                              <a
                                href={notesDocUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="font-semibold text-link underline hover:opacity-90"
                              >
                                {t("googleDocNotesCta")}
                              </a>
                            </p>
                          ) : null}
                          {lesson.transcriptArtifactIds.length > 0 ? (
                            <p className="text-sm text-muted">
                              {t("syncedTranscriptRefsLabel")}:{" "}
                              {lesson.transcriptArtifactIds.join(", ")}
                            </p>
                          ) : null}
                          {lesson.smartNotesIds.length > 0 ? (
                            <p className="text-sm text-muted">
                              {t("syncedSmartNotesRefsLabel")}: {lesson.smartNotesIds.join(", ")}
                            </p>
                          ) : null}
                          {lesson.recordingIds.length > 0 ? (
                            <p className="text-sm text-muted">
                              {t("syncedRecordingRefsLabel")}: {lesson.recordingIds.join(", ")}
                            </p>
                          ) : null}
                        </div>
                      ) : null}
                      <TeacherLessonCompletionNotesForm
                        variant="embedded"
                        bookingId={lesson.id}
                        initialCompletionNotesMd={lesson.initialCompletionNotesMd}
                        initialExternalTranscriptUrl={lesson.initialExternalTranscriptUrl}
                      />
                    </div>
                  ) : null}
                </li>
        );
      }}
    />
  );
}
