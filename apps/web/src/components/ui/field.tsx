"use client";

import { useId } from "react";
import type {
  InputHTMLAttributes,
  ReactNode,
  SelectHTMLAttributes,
  TextareaHTMLAttributes,
} from "react";

/**
 * Form primitives for Alphabet Storm.
 *
 * `Field` owns the accessibility wiring that was previously hand-repeated: it
 * generates the id, links the label, and points `aria-describedby` at whichever
 * of hint/error is actually present, marking `aria-invalid` when it errors.
 *
 * Controls stay at 16px on narrow viewports via the rule in globals.css, which
 * is what stops iOS Safari zooming on focus — do not override it with `text-sm`.
 */

const controlBase =
  "w-full rounded-xl border bg-surface px-3 py-2.5 text-foreground placeholder:text-muted " +
  "transition-colors duration-150 disabled:cursor-not-allowed disabled:opacity-40";

function controlClasses(invalid: boolean, className: string) {
  return [
    controlBase,
    invalid
      ? "border-[var(--app-danger)] focus:border-[var(--app-danger)]"
      : "border-border focus:border-foreground",
    className,
  ]
    .filter(Boolean)
    .join(" ");
}

/**
 * The control look, for the few places that cannot use `Input`/`Select` —
 * a control inside a table cell, or one whose label is supplied by a column
 * header rather than a `Field`.
 *
 * Six components had each declared their own `inputCn` string, all subtly
 * different and all drifting from the primitives. Prefer `Field` + `Input`;
 * reach for this only when there is genuinely no label to attach.
 */
export function controlClass(className = "") {
  return controlClasses(false, className);
}

type FieldProps = {
  label: string;
  /** Rendered below the control unless an error replaces it. */
  hint?: string | null;
  error?: string | null;
  required?: boolean;
  /** Visually hides the label while leaving it available to screen readers. */
  hideLabel?: boolean;
  className?: string;
  children: (props: {
    id: string;
    "aria-describedby": string | undefined;
    "aria-invalid": boolean | undefined;
  }) => ReactNode;
};

export function Field({
  label,
  hint,
  error,
  required = false,
  hideLabel = false,
  className = "",
  children,
}: FieldProps) {
  const id = useId();
  const hintId = `${id}-hint`;
  const errorId = `${id}-error`;
  const describedBy = error ? errorId : hint ? hintId : undefined;

  return (
    <div className={["flex flex-col gap-1.5", className].filter(Boolean).join(" ")}>
      {/*
        The required marker sits beside the label, not inside it. It is
        decorative — `required` on the control is what carries the meaning — so
        it is `aria-hidden`, and the accessible name is the label alone either
        way. But a `*` inside the element puts it in the label's textContent,
        which is what `getByLabelText` matches on, so every required field in
        the app became unfindable by its own label. Outside, both agree.
      */}
      {hideLabel ? (
        <label htmlFor={id} className="sr-only">
          {label}
        </label>
      ) : (
        <span className="flex items-baseline gap-1">
          <label htmlFor={id} className="text-sm font-medium text-foreground">
            {label}
          </label>
          {required ? (
            <span className="text-[var(--app-danger)]" aria-hidden="true">
              *
            </span>
          ) : null}
        </span>
      )}

      {children({
        id,
        "aria-describedby": describedBy,
        "aria-invalid": error ? true : undefined,
      })}

      {error ? (
        <p id={errorId} role="alert" className="text-sm text-[var(--app-danger)]">
          {error}
        </p>
      ) : hint ? (
        <p id={hintId} className="text-sm text-muted">
          {hint}
        </p>
      ) : null}
    </div>
  );
}

export function Input({
  className = "",
  ...rest
}: InputHTMLAttributes<HTMLInputElement>) {
  return <input {...rest} className={controlClasses(rest["aria-invalid"] === true, className)} />;
}

export function Textarea({
  className = "",
  rows = 4,
  ...rest
}: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea
      {...rest}
      rows={rows}
      className={controlClasses(rest["aria-invalid"] === true, className)}
    />
  );
}

export function Select({
  className = "",
  children,
  ...rest
}: SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select {...rest} className={controlClasses(rest["aria-invalid"] === true, className)}>
      {children}
    </select>
  );
}

/**
 * Raw controls that deliberately stay raw.
 *
 * After the sweep, fourteen `<input>`/`<select>`/`<textarea>` remain outside
 * these primitives. Each is here on purpose:
 *
 * - **Radio groups** — `teacher-lesson-rate-basis-toggle`, `booking-form`'s
 *   payment method. A radio group's name belongs on a `<fieldset>`/`<legend>`,
 *   not on each input; `Field` labels one control, which is the wrong shape.
 * - **The grid rate rows** — `teacher-lesson-offer-row`, and the group-size
 *   field that lines up beside them. `RATE_FIELD_LABEL_ROW` bottom-aligns
 *   labels across a row so controls stay level however the text wraps. `Field`
 *   stacks each label against its own control and would break that alignment.
 * - **The checklist mark** — `onboarding-checklist`. The checkbox *is* the
 *   status mark inside a rich row, sized and positioned to match the read-only
 *   circle it replaces, and named from the row's title.
 * - **The chat composers and admin search** — `chat-panel`. Placeholder-and-send
 *   controls in a dense panel, now carrying `aria-label`.
 *
 * Everything else goes through `Field`. Reach for `controlClass` only when
 * there is genuinely no label to attach.
 */
