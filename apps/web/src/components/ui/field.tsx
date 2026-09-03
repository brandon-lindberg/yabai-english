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
 *
 * For prose — a bio, a description, lesson notes, a review note — reach for
 * `MarkdownField` rather than `Textarea`. `Textarea` is for text that is not
 * prose: a pasted credential, an answer being graded.
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
  /**
   * `notice` for a hint that reports something unusual about this particular
   * field — a rule that applies here and not on a normal day. Muted grey reads
   * as boilerplate and gets skipped, which is exactly wrong for those.
   */
  hintTone?: "muted" | "notice";
  error?: string | null;
  required?: boolean;
  /** Visually hides the label while leaving it available to screen readers. */
  hideLabel?: boolean;
  /**
   * `"control"` labels one labelable element with `<label for>`.
   *
   * `"group"` is for controls `<label>` cannot attach to — a rich-text
   * editor's contenteditable, chiefly. The label becomes a plain `<span id>`
   * and the callback gets `labelId` to hang `aria-labelledby` on a wrapper
   * carrying `role="group"`. Same copy, same hint and error wiring, one
   * implementation.
   */
  as?: "control" | "group";
  className?: string;
  /**
   * `control` is a pure attribute bag: every call site spreads it straight onto
   * a DOM element, so nothing that is not a real attribute may go in it.
   * Group-mode extras travel in the second argument instead.
   */
  children: (
    control: {
      id: string;
      "aria-describedby": string | undefined;
      "aria-invalid": boolean | undefined;
    },
    group: { labelId: string },
  ) => ReactNode;
};

export function Field({
  label,
  hint,
  hintTone = "muted",
  error,
  required = false,
  hideLabel = false,
  as = "control",
  className = "",
  children,
}: FieldProps) {
  const id = useId();
  const hintId = `${id}-hint`;
  const errorId = `${id}-error`;
  const labelId = `${id}-label`;
  const describedBy = error ? errorId : hint ? hintId : undefined;
  const isGroup = as === "group";

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
        <Label isGroup={isGroup} id={id} labelId={labelId} className="sr-only">
          {label}
        </Label>
      ) : (
        // `text-sm` sits on the row, not just the label: the marker used to
        // inherit the 16px body size, and its taller line box grew this
        // baseline-aligned row by ~4px. Only required fields grew, so a
        // required field beside an optional one in a grid sat lower than its
        // neighbour — visible on every two-column form in the app.
        <span className="flex items-baseline gap-1 text-sm">
          <Label
            isGroup={isGroup}
            id={id}
            labelId={labelId}
            className="font-medium text-foreground"
          >
            {label}
          </Label>
          {required ? (
            <span className="text-[var(--app-danger)]" aria-hidden="true">
              *
            </span>
          ) : null}
        </span>
      )}

      {children(
        {
          id,
          "aria-describedby": describedBy,
          "aria-invalid": error ? true : undefined,
        },
        { labelId },
      )}

      {error ? (
        <p id={errorId} role="alert" className="text-sm text-[var(--app-danger)]">
          {error}
        </p>
      ) : hint ? (
        <p
          id={hintId}
          className={
            hintTone === "notice"
              ? "text-sm font-semibold text-foreground"
              : "text-sm text-muted"
          }
        >
          {hint}
        </p>
      ) : null}
    </div>
  );
}

/**
 * A `<label for>` only associates with a labelable element. Group mode has
 * none, so it names its control by id instead — emitting a `<label>` there
 * would claim an association assistive tech cannot resolve.
 */
function Label({
  isGroup,
  id,
  labelId,
  className,
  children,
}: {
  isGroup: boolean;
  id: string;
  labelId: string;
  className: string;
  children: ReactNode;
}) {
  if (isGroup) {
    return (
      <span id={labelId} className={className}>
        {children}
      </span>
    );
  }
  return (
    <label htmlFor={id} className={className}>
      {children}
    </label>
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
 * - **Radio groups** — `booking-form`'s
 *   payment method. A radio group's name belongs on a `<fieldset>`/`<legend>`,
 *   not on each input; `Field` labels one control, which is the wrong shape.
 * - **The grid rate rows** — the group-size
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
