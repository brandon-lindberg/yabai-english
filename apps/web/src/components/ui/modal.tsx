"use client";

import { useEffect, useRef } from "react";
import type { ReactNode } from "react";

/**
 * Built on the native <dialog> element, so focus trapping, Escape-to-close and
 * inerting the background come from the platform instead of being hand-rolled.
 * That is the whole reason for this primitive: the hand-written modals it
 * replaces trapped neither focus nor Escape.
 *
 * Use it only where a task genuinely needs protected focus — confirming a
 * destructive action, or a step that must not be abandoned half-done. A panel
 * that merely shows more detail belongs inline.
 */

type Props = {
  open: boolean;
  onClose: () => void;
  title: string;
  description?: string | null;
  children: ReactNode;
  /** Footer actions. Put the confirming action last. */
  actions?: ReactNode;
  /** Clicking the backdrop dismisses. Turn off for destructive confirmations. */
  dismissOnBackdrop?: boolean;
};

export function Modal({
  open,
  onClose,
  title,
  description,
  children,
  actions,
  dismissOnBackdrop = true,
}: Props) {
  const ref = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (open && !el.open) el.showModal();
    if (!open && el.open) el.close();
  }, [open]);

  // Keep body scroll locked only while a modal is actually open.
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  return (
    <dialog
      ref={ref}
      aria-labelledby="modal-title"
      aria-describedby={description ? "modal-description" : undefined}
      onClose={onClose}
      onCancel={(e) => {
        e.preventDefault();
        onClose();
      }}
      onClick={(e) => {
        if (!dismissOnBackdrop) return;
        // A click landing on the dialog itself is the backdrop; the inner
        // wrapper stops propagation for clicks on actual content.
        if (e.target === ref.current) onClose();
      }}
      className="m-auto w-[calc(100vw-2rem)] max-w-lg rounded-2xl border border-border bg-surface p-0 text-foreground backdrop:bg-[color-mix(in_srgb,var(--storm-ink)_55%,transparent)]"
    >
      <div className="flex flex-col gap-4 p-5 sm:p-6" onClick={(e) => e.stopPropagation()}>
        <div className="flex flex-col gap-1.5">
          <h2 id="modal-title" className="text-lg font-semibold tracking-[-0.02em]">
            {title}
          </h2>
          {description ? (
            <p id="modal-description" className="text-sm leading-relaxed text-muted">
              {description}
            </p>
          ) : null}
        </div>

        {children}

        {actions ? <div className="flex flex-wrap justify-end gap-2">{actions}</div> : null}
      </div>
    </dialog>
  );
}
