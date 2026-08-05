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
      <label
        htmlFor={id}
        className={
          hideLabel
            ? "sr-only"
            : "text-sm font-medium text-foreground"
        }
      >
        {label}
        {required ? (
          <span className="ml-1 text-[var(--app-danger)]" aria-hidden="true">
            *
          </span>
        ) : null}
      </label>

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
