"use client";

import { useEffect } from "react";

type Props = {
  open: boolean;
  onClose: () => void;
  canRemoveThisOccurrence: boolean;
  busy: boolean;
  error: string | null;
  title: string;
  description: string;
  thisOccurrenceLabel: string;
  allSeriesLabel: string;
  cancelLabel: string;
  onThisOccurrence: () => void | Promise<void>;
  onAllSeries: () => void;
};

export function TeacherAvailabilityRemoveModal({
  open,
  onClose,
  canRemoveThisOccurrence,
  busy,
  error,
  title,
  description,
  thisOccurrenceLabel,
  allSeriesLabel,
  cancelLabel,
  onThisOccurrence,
  onAllSeries,
}: Props) {
  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="teacher-availability-remove-title"
    >
      <button
        type="button"
        className="absolute inset-0 bg-black/40"
        aria-label={cancelLabel}
        onClick={onClose}
      />
      <div className="relative z-[101] w-full max-w-md rounded-2xl border border-border bg-surface p-5 shadow-xl">
        <h3 id="teacher-availability-remove-title" className="text-lg font-semibold text-foreground">
          {title}
        </h3>
        <p className="mt-2 text-sm text-muted">{description}</p>
        {error ? (
          <p className="mt-2 text-sm text-destructive" role="alert">
            {error}
          </p>
        ) : null}

        <div className="mt-5 flex flex-col gap-2">
          <button
            type="button"
            disabled={!canRemoveThisOccurrence || busy}
            onClick={() => void onThisOccurrence()}
            className="w-full rounded-xl border border-border bg-background px-4 py-3 text-left text-sm font-medium text-foreground hover:bg-[var(--app-hover)] disabled:cursor-not-allowed disabled:opacity-40"
          >
            {thisOccurrenceLabel}
          </button>
          <button
            type="button"
            disabled={busy}
            onClick={() => {
              onAllSeries();
              onClose();
            }}
            className="w-full rounded-xl border border-destructive/40 bg-destructive/5 px-4 py-3 text-left text-sm font-medium text-destructive hover:bg-destructive/10 disabled:opacity-40"
          >
            {allSeriesLabel}
          </button>
        </div>

        <div className="mt-4 flex justify-end">
          <button
            type="button"
            disabled={busy}
            onClick={onClose}
            className="rounded-full border border-border px-4 py-2 text-sm font-semibold text-foreground hover:bg-[var(--app-hover)] disabled:opacity-40"
          >
            {cancelLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
