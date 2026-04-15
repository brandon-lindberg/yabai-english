"use client";

import { useLocale, useTranslations } from "next-intl";
import { useCallback, useId, useState } from "react";
import { TeacherLessonCompletionNotesForm } from "@/components/dashboard/teacher-lesson-completion-notes-form";

export type TeacherCompletedLessonItem = {
  id: string;
  startsAtIso: string;
  endsAtIso: string;
  lessonTitleJa: string;
  lessonTitleEn: string;
  studentDisplay: string;
  initialCompletionNotesMd: string | null;
  initialExternalTranscriptUrl: string | null;
  hasSavedContent: boolean;
};

type ViewMode = "cards" | "list";

type Props = {
  lessons: TeacherCompletedLessonItem[];
};

function formatRange(locale: string, startsAtIso: string, endsAtIso: string) {
  const start = new Date(startsAtIso);
  const end = new Date(endsAtIso);
  const a = start.toLocaleString(locale, { dateStyle: "medium", timeStyle: "short" });
  const b = end.toLocaleString(locale, { dateStyle: "medium", timeStyle: "short" });
  return `${a} – ${b}`;
}

export function TeacherCompletedLessonsClient({ lessons }: Props) {
  const locale = useLocale();
  const t = useTranslations("dashboard.schedulePage");
  const viewGroupId = useId();
  const [viewMode, setViewMode] = useState<ViewMode>("cards");
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const toggle = useCallback((id: string) => {
    setExpandedId((cur) => (cur === id ? null : id));
  }, []);

  return (
    <div className="space-y-4">
      <div
        className="flex flex-wrap items-center justify-between gap-3"
        role="group"
        aria-label={t("completedLessonsViewToggle")}
      >
        <p className="text-sm text-muted">{t("completedLessonsSortHint")}</p>
        <div className="flex rounded-full border border-border bg-background p-0.5">
          <button
            type="button"
            aria-pressed={viewMode === "cards"}
            className={`rounded-full px-3 py-1.5 text-xs font-semibold transition ${
              viewMode === "cards"
                ? "bg-foreground text-background"
                : "text-muted hover:text-foreground"
            }`}
            onClick={() =>
              setViewMode((prev) => {
                if (prev !== "cards") queueMicrotask(() => setExpandedId(null));
                return "cards";
              })
            }
          >
            {t("completedLessonsViewCards")}
          </button>
          <button
            type="button"
            aria-pressed={viewMode === "list"}
            className={`rounded-full px-3 py-1.5 text-xs font-semibold transition ${
              viewMode === "list"
                ? "bg-foreground text-background"
                : "text-muted hover:text-foreground"
            }`}
            onClick={() =>
              setViewMode((prev) => {
                if (prev !== "list") queueMicrotask(() => setExpandedId(null));
                return "list";
              })
            }
          >
            {t("completedLessonsViewList")}
          </button>
        </div>
      </div>

      <ul className={viewMode === "list" ? "space-y-0 divide-y divide-border rounded-2xl border border-border bg-surface" : "space-y-3"}>
        {lessons.map((lesson) => {
          const expanded = expandedId === lesson.id;
          const range = formatRange(locale, lesson.startsAtIso, lesson.endsAtIso);
          const title = `${lesson.lessonTitleJa} / ${lesson.lessonTitleEn}`;
          const panelId = `${viewGroupId}-panel-${lesson.id}`;
          const headerId = `${viewGroupId}-header-${lesson.id}`;

          if (viewMode === "list") {
            return (
              <li key={lesson.id} id={`booking-${lesson.id}`} className="bg-surface">
                <button
                  type="button"
                  id={headerId}
                  aria-expanded={expanded}
                  aria-controls={panelId}
                  onClick={() => toggle(lesson.id)}
                  className="flex w-full items-start gap-3 px-4 py-3 text-left hover:bg-[var(--app-hover)]"
                >
                  <span className="mt-0.5 shrink-0 text-muted" aria-hidden>
                    {expanded ? "▼" : "▶"}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="font-medium text-foreground">{lesson.studentDisplay}</p>
                    <p className="truncate text-sm text-muted">{title}</p>
                    <p className="text-xs text-muted">{range}</p>
                    {lesson.hasSavedContent ? (
                      <span className="mt-1 inline-block rounded-full border border-border bg-background px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-muted">
                        {t("completedLessonsHasNotes")}
                      </span>
                    ) : null}
                  </div>
                </button>
                {expanded ? (
                  <div id={panelId} className="border-t border-border bg-background/40 px-4 py-3 pl-11">
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
          }

          return (
            <li
              key={lesson.id}
              id={`booking-${lesson.id}`}
              className="min-w-0 rounded-2xl border border-border bg-surface shadow-sm"
            >
              <button
                type="button"
                id={headerId}
                aria-expanded={expanded}
                aria-controls={panelId}
                onClick={() => toggle(lesson.id)}
                className="flex w-full items-start gap-3 p-4 text-left hover:bg-[var(--app-hover)]"
              >
                <span className="mt-1 shrink-0 text-muted" aria-hidden>
                  {expanded ? "▼" : "▶"}
                </span>
                <div className="min-w-0 flex-1 space-y-1">
                  <p className="font-medium text-foreground">{title}</p>
                  <p className="text-sm text-muted">{range}</p>
                  <p className="text-sm text-muted">
                    {t("studentLabel")}: {lesson.studentDisplay}
                  </p>
                  {lesson.hasSavedContent ? (
                    <span className="inline-block rounded-full border border-border bg-background px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-muted">
                      {t("completedLessonsHasNotes")}
                    </span>
                  ) : null}
                </div>
              </button>
              {expanded ? (
                <div id={panelId} className="border-t border-border px-4 pb-4 pt-3">
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
        })}
      </ul>
    </div>
  );
}
