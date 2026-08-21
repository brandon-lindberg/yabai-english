"use client";

import { useTranslations } from "next-intl";
import { useState } from "react";
import { MarkdownField } from "@/components/ui/markdown-field";
import { BOOKING_COMPLETION_NOTES_MD_MAX } from "@/lib/booking-completion-notes";
import { buttonClasses } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/field";

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
      <Field label={t("transcriptLinkLabel")} hint={t("transcriptLinkHelp")}>
        {(field) => (
          <Input
            {...field}
            type="url"
            inputMode="url"
            autoComplete="url"
            placeholder={t("transcriptLinkPlaceholder")}
            value={transcriptUrl}
            onChange={(e) => setTranscriptUrl(e.target.value)}
          />
        )}
      </Field>
      <MarkdownField
        label={t("lessonNotesLabel")}
        hint={`${t("lessonNotesHelp")} ${t("lessonNotesListTip")}`}
        value={notesMd}
        maxChars={BOOKING_COMPLETION_NOTES_MD_MAX}
        placeholder={t("lessonNotesPlaceholder")}
        tone="background"
        size="sm"
        onChange={setNotesMd}
      />
      <div className="flex flex-wrap items-center gap-2">
        <button
          type="submit"
          disabled={status === "saving"}
          className={buttonClasses()}
        >
          {status === "saving" ? t("lessonNotesSaving") : t("lessonNotesSave")}
        </button>
        {status === "saved" ? (
          <span className="text-sm text-foreground">{t("lessonNotesSaved")}</span>
        ) : null}
        {status === "error" ? (
          <span className="text-sm text-destructive">{t("lessonNotesError")}</span>
        ) : null}
      </div>
    </form>
  );
}
