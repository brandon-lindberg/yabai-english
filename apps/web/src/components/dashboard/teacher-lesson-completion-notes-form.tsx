"use client";

import { useTranslations } from "next-intl";
import { useCallback, useEffect, useRef, useState } from "react";
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
  /**
   * Whether this lesson has a Google Calendar event to read notes off. Without
   * one there is nothing to fetch, so the control stays hidden rather than
   * offering an action that can only fail.
   */
  canFetchNotesLink?: boolean;
};

/** Outcomes of a notes-link lookup that the teacher needs told apart. */
type FetchState = "idle" | "fetching" | "found" | "pending" | "unavailable" | "failed";

export function TeacherLessonCompletionNotesForm({
  bookingId,
  initialCompletionNotesMd,
  initialExternalTranscriptUrl,
  variant = "default",
  canFetchNotesLink = false,
}: Props) {
  const t = useTranslations("dashboard.schedulePage");
  const [notesMd, setNotesMd] = useState(initialCompletionNotesMd ?? "");
  const [transcriptUrl, setTranscriptUrl] = useState(initialExternalTranscriptUrl ?? "");
  const [status, setStatus] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [fetchState, setFetchState] = useState<FetchState>("idle");
  const autoTried = useRef(false);

  /**
   * Asks the server to read the notes document off the lesson's Calendar event.
   *
   * The lookup only reads. What comes back fills the field and nothing more —
   * this link is shown to the student, so publishing it stays the teacher's
   * decision, made by saving the form.
   */
  const fetchNotesLink = useCallback(async () => {
    setFetchState("fetching");
    try {
      const res = await fetch(`/api/bookings/${bookingId}/notes-link`, { method: "POST" });
      if (!res.ok) {
        setFetchState("failed");
        return;
      }
      const outcome = (await res.json()) as { status: string; url?: string };
      if ((outcome.status === "FOUND" || outcome.status === "ALREADY_SET") && outcome.url) {
        setTranscriptUrl(outcome.url);
        setFetchState("found");
        return;
      }
      // Gemini publishes its notes minutes after the call, so an empty result
      // is usually "not yet" — worth saying, and worth being able to retry.
      setFetchState(outcome.status === "NO_NOTES_YET" ? "pending" : "unavailable");
    } catch {
      setFetchState("failed");
    }
  }, [bookingId]);

  /*
    Opening a lesson is the automatic trigger. This form only mounts when its
    panel is expanded, so the lookup costs one Calendar call for the lesson
    being read rather than one for every lesson on the page.

    Guarded to a single attempt per mount, and skipped entirely when a link is
    already present — the teacher's own link is never worth a network round trip
    to second-guess.
  */
  useEffect(() => {
    if (!canFetchNotesLink) return;
    if (autoTried.current) return;
    if (transcriptUrl.trim() !== "") return;
    autoTried.current = true;
    void fetchNotesLink();
    // Deliberately not depending on `transcriptUrl`: this is a one-shot on open,
    // and re-running it as the teacher types would fight their editing.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [canFetchNotesLink, fetchNotesLink]);

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
    setFetchState("idle");
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
      {canFetchNotesLink ? (
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => void fetchNotesLink()}
            disabled={fetchState === "fetching"}
            className={buttonClasses({ variant: "secondary", size: "sm" })}
          >
            {fetchState === "fetching"
              ? t("notesLinkFetching")
              : t("notesLinkFetch")}
          </button>
          {fetchState === "found" ? (
            <span className="text-sm text-foreground">{t("notesLinkFound")}</span>
          ) : null}
          {fetchState === "pending" ? (
            <span className="text-sm text-muted">{t("notesLinkPending")}</span>
          ) : null}
          {fetchState === "unavailable" ? (
            <span className="text-sm text-muted">{t("notesLinkUnavailable")}</span>
          ) : null}
          {fetchState === "failed" ? (
            <span className="text-sm text-muted">{t("notesLinkFailed")}</span>
          ) : null}
        </div>
      ) : null}
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
