"use client";

import { useId, useState } from "react";
import type { ReactNode } from "react";
import { Button, buttonClasses } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/field";
import { Status } from "@/components/ui/status";

/**
 * Delete something, once you have typed its name.
 *
 * Two admin screens asked for the same confirmation and answered it twice. The
 * organization view built an inline panel with its own buttons and input; the
 * user detail form called `window.prompt`, which is unstyled, unthemed, gives a
 * screen reader nothing to work with, and on a phone is a system dialog with no
 * relationship to the page behind it.
 *
 * The typing requirement is the point — this is the one control in the app that
 * should be hard to operate by accident — so it stays, with the expected value
 * shown and matched case-insensitively on trimmed input. Getting it wrong
 * disables the button rather than failing after the fact, which is the
 * difference between a guard and a trap.
 */
export function ConfirmDelete({
  triggerLabel,
  prompt,
  expected,
  confirmLabel,
  cancelLabel,
  busy = false,
  busyLabel,
  error,
  onConfirm,
}: {
  triggerLabel: string;
  /** What is about to happen, and what to type. */
  prompt: ReactNode;
  expected: string;
  confirmLabel: string;
  cancelLabel: string;
  busy?: boolean;
  busyLabel: string;
  error?: string | null;
  onConfirm: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [typed, setTyped] = useState("");
  const promptId = useId();

  const matches =
    typed.trim().toLowerCase() === expected.trim().toLowerCase() && expected.length > 0;

  /*
    The trigger is `sm`. On a page with one dangerous control among several
    ordinary ones it can afford full weight, but a list gets one of these per
    row, and a hue repeated down a page stops reading as a warning and starts
    reading as decoration. The panel below is where the danger is announced,
    and the typed confirmation is what actually guards it.
  */
  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={buttonClasses({ variant: "destructive", size: "sm" })}
      >
        {triggerLabel}
      </button>
    );
  }

  return (
    <div
      role="group"
      aria-labelledby={promptId}
      className="w-full rounded-xl border border-[var(--app-danger)] p-4"
    >
      <p id={promptId} className="text-sm text-foreground">
        {prompt}
      </p>

      <Field label={triggerLabel} hideLabel className="mt-3">
        {(field) => (
          <Input
            {...field}
            autoFocus
            value={typed}
            onChange={(e) => setTyped(e.target.value)}
            placeholder={expected}
          />
        )}
      </Field>

      {error ? (
        <p role="alert" className="mt-2">
          <Status tone="error">{error}</Status>
        </p>
      ) : null}

      <div className="mt-4 flex flex-wrap gap-2">
        <Button
          variant="destructive"
          disabled={!matches}
          loading={busy}
          onClick={onConfirm}
        >
          {busy ? busyLabel : confirmLabel}
        </Button>
        <Button
          variant="secondary"
          disabled={busy}
          onClick={() => {
            setOpen(false);
            setTyped("");
          }}
        >
          {cancelLabel}
        </Button>
      </div>
    </div>
  );
}
