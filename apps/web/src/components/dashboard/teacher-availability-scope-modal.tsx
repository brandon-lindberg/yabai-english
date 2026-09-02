"use client";

import { ModalShell } from "@/components/ui/modal-shell";

/**
 * A weekly rule means two different things by "this slot": the one time the
 * teacher clicked, or every week it repeats. Removing has always asked; so does
 * updating, and both ask with this.
 */
type Props = {
  open: boolean;
  onClose: () => void;
  canApplyToThisOccurrence: boolean;
  /** Removing is destructive and says so; updating is not. */
  allSeriesTone?: "destructive" | "neutral";
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

export function TeacherAvailabilityScopeModal({
  open,
  onClose,
  canApplyToThisOccurrence,
  allSeriesTone = "destructive",
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
  return (
    <ModalShell
      open={open}
      onClose={onClose}
      labelledBy="teacher-availability-scope-title"
      dismissLabel={cancelLabel}
    >
      <>
        <h3 id="teacher-availability-scope-title" className="text-lg font-semibold text-foreground">
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
            disabled={!canApplyToThisOccurrence || busy}
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
            className={`w-full rounded-xl border px-4 py-3 text-left text-sm font-medium disabled:opacity-40 ${
              allSeriesTone === "destructive"
                ? "border-destructive/40 bg-destructive/5 text-destructive hover:bg-destructive/10"
                : "border-border bg-background text-foreground hover:bg-[var(--app-hover)]"
            }`}
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
      </>
    </ModalShell>
  );
}
