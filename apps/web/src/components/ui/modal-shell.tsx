"use client";

import { useEffect } from "react";
import type { ReactNode } from "react";

/**
 * The centred overlay + panel that the availability modals had each built for
 * themselves, byte for byte — and each got wrong the same way.
 *
 * The overlay is `fixed inset-0` and centres its panel, so a panel taller than
 * the viewport overflowed off *both* ends with nothing able to scroll: on a
 * short screen the confirming button sat below the fold and could not be
 * reached at all. Hence the height cap and `overflow-y-auto` here — the panel
 * scrolls itself rather than growing past the screen.
 *
 * `overscroll-contain` stops that scroll chaining to the page behind once the
 * panel hits its end, and the page is locked outright while this is open. The
 * lock goes on the document element, not `body`: `html` already carries
 * `overflow-x: clip`, and body's overflow only propagates to the viewport
 * while html's own overflow is `visible`, so locking body alone does nothing.
 */

type Props = {
  open: boolean;
  onClose: () => void;
  /** Id of the heading that names this dialog. */
  labelledBy: string;
  /** Accessible name for the backdrop dismiss control. */
  dismissLabel: string;
  children: ReactNode;
};

export function ModalShell({ open, onClose, labelledBy, dismissLabel, children }: Props) {
  useEffect(() => {
    if (!open) return;

    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", onKey);

    const root = document.documentElement;
    const previousOverflow = root.style.overflow;
    root.style.overflow = "hidden";

    return () => {
      document.removeEventListener("keydown", onKey);
      root.style.overflow = previousOverflow;
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby={labelledBy}
    >
      <button
        type="button"
        className="absolute inset-0 bg-[var(--storm-ink)]/40"
        aria-label={dismissLabel}
        onClick={onClose}
      />
      <div
        data-modal-panel
        className="relative z-[101] max-h-[calc(100dvh-2rem)] w-full max-w-md overflow-y-auto overscroll-contain rounded-2xl border border-border bg-surface p-5"
      >
        {children}
      </div>
    </div>
  );
}
