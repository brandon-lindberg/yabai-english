"use client";

import { useId, useState, type ReactNode } from "react";

/**
 * A titled section that opens and closes, with the count of what it holds.
 *
 * A teacher's history nests two of these — the student, and a year inside them
 * — and both want identical chrome. The heading wraps the button rather than
 * sitting beside it, so the accessible name of the heading and of the control
 * are the same string and either can be used to find the section.
 */

function Chevron({ open }: { open: boolean }) {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 12 12"
      className={`h-3 w-3 shrink-0 text-muted transition-transform duration-150 motion-reduce:transition-none ${
        open ? "rotate-90" : ""
      }`}
    >
      <path
        d="M4 2l4 4-4 4"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

type Props = {
  label: string;
  /** Rendered muted beside the label, e.g. "10 lessons". */
  count: string;
  defaultOpen?: boolean;
  /** `student` is the outer level, `year` the inner one. */
  level?: "student" | "year";
  children: ReactNode;
};

export function CollapsibleSection({
  label,
  count,
  defaultOpen = false,
  level = "student",
  children,
}: Props) {
  const id = useId();
  const [open, setOpen] = useState(defaultOpen);
  const panelId = `${id}-panel`;

  const isStudent = level === "student";
  const Heading = isStudent ? "h3" : "h4";

  return (
    <section>
      <Heading
        className={
          isStudent
            ? "border-b border-border text-lg font-bold tracking-[-0.02em] text-foreground"
            : "text-sm font-semibold text-foreground"
        }
      >
        <button
          type="button"
          aria-expanded={open}
          aria-controls={panelId}
          onClick={() => setOpen((v) => !v)}
          className={`flex w-full items-center gap-2 text-left transition-colors hover:bg-[var(--app-hover)] ${
            isStudent ? "pb-2" : "py-2"
          }`}
        >
          <Chevron open={open} />
          <span className="min-w-0 flex-1 truncate">{label}</span>
          <span className="shrink-0 text-sm font-medium tabular-nums text-muted">{count}</span>
        </button>
      </Heading>
      {open ? <div id={panelId}>{children}</div> : null}
    </section>
  );
}
