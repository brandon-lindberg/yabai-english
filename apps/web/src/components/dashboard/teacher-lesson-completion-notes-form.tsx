"use client";

import { useTranslations } from "next-intl";
import { useRef, useState } from "react";
import type { MDXEditorMethods } from "@mdxeditor/editor";
import { StudentBioMdxEditor } from "@/components/dashboard/student-bio-mdx-editor";
import { BOOKING_COMPLETION_NOTES_MD_MAX } from "@/lib/booking-completion-notes";

type Props = {
  bookingId: string;
  initialCompletionNotesMd: string | null;
  initialExternalTranscriptUrl: string | null;
  /** When opened inside an accordion, drop the top divider so the panel reads as one block. */
  variant?: "default" | "embedded";
};

export function TeacherLessonCompletionNotesForm({
  bookingId,
  initialCompletionNotesMd,
  initialExternalTranscriptUrl,
  variant = "default",
}: Props) {
  const t = useTranslations("dashboard.schedulePage");
  const [notesMd, setNotesMd] = useState(initialCompletionNotesMd ?? "");
  const [transcriptUrl, setTranscriptUrl] = useState(initialExternalTranscriptUrl ?? "");
  const [status, setStatus] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const editorRef = useRef<MDXEditorMethods>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setStatus("saving");
    const res = await fetch(`/api/bookings/${bookingId}/completion-notes`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        completionNotesMd: notesMd.trim() === "" ? null : notesMd,
        externalTranscriptUrl: transcriptUrl.trim() === "" ? null : transcriptUrl.trim(),
      }),
    });
    if (!res.ok) {
      setStatus("error");
      return;
    }
    setStatus("saved");
    setTimeout(() => setStatus("idle"), 2000);
  }

  const formShell =
    variant === "embedded"
      ? "mt-0 space-y-3 border-t-0 pt-0"
      : "mt-3 space-y-3 border-t border-border pt-3";

  return (
    <form onSubmit={(e) => void onSubmit(e)} className={formShell}>
      <div>
        <label className="block text-xs font-medium text-foreground" htmlFor={`transcript-${bookingId}`}>
          {t("transcriptLinkLabel")}
        </label>
        <p className="mt-0.5 text-xs text-muted">{t("transcriptLinkHelp")}</p>
        <input
          id={`transcript-${bookingId}`}
          type="url"
          inputMode="url"
          autoComplete="url"
          placeholder={t("transcriptLinkPlaceholder")}
          value={transcriptUrl}
          onChange={(e) => setTranscriptUrl(e.target.value)}
          className="mt-1 w-full rounded-lg border border-border bg-background px-2 py-2 text-sm text-foreground"
        />
      </div>
      <div>
        <span className="block text-xs font-medium text-foreground">{t("lessonNotesLabel")}</span>
        <p className="mt-0.5 text-xs text-muted">{t("lessonNotesHelp")}</p>
        <p className="mt-1 text-xs text-muted/90">{t("lessonNotesListTip")}</p>
        <div
          className="mdxeditor-rich-lists min-w-0 mt-1 overflow-visible rounded-xl border border-border bg-background text-sm text-foreground focus-within:ring-2 focus-within:ring-foreground/25 [&_.mdxeditor]:bg-background [&_.mdxeditor-root-contenteditable]:min-h-[160px]"
          role="group"
          aria-label={t("lessonNotesLabel")}
        >
          <StudentBioMdxEditor
            ref={editorRef}
            markdown={notesMd}
            placeholder={t("lessonNotesPlaceholder")}
            onChange={(md) => {
              if (md.length <= BOOKING_COMPLETION_NOTES_MD_MAX) {
                setNotesMd(md);
                return;
              }
              const clipped = md.slice(0, BOOKING_COMPLETION_NOTES_MD_MAX);
              setNotesMd(clipped);
              queueMicrotask(() => editorRef.current?.setMarkdown(clipped));
            }}
            contentEditableClassName="px-0 py-2 text-sm"
          />
        </div>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <button
          type="submit"
          disabled={status === "saving"}
          className="rounded-full bg-foreground px-4 py-2 text-sm font-semibold text-background hover:opacity-90 disabled:opacity-50"
        >
          {status === "saving" ? t("lessonNotesSaving") : t("lessonNotesSave")}
        </button>
        {status === "saved" ? (
          <span className="text-sm text-green-600 dark:text-green-400">{t("lessonNotesSaved")}</span>
        ) : null}
        {status === "error" ? (
          <span className="text-sm text-destructive">{t("lessonNotesError")}</span>
        ) : null}
      </div>
    </form>
  );
}
