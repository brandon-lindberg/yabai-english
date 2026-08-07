"use client";

import type { ReactNode } from "react";

/**
 * The one answer choice in the app.
 *
 * Five surfaces asked the learner to pick an answer — the placement quiz, the
 * lesson exercise runner, the flashcard session's multiple choice, the study
 * assessment, and the placement bank's review card — and each had built its own
 * option row. They had already drifted: three different paddings, two different
 * radii, three different hover treatments, and only one of them said anything
 * about being right or wrong beyond colour.
 *
 * Two input modes, because the difference is real: `button` answers on click
 * (one question at a time), `radio` holds the answer until the form is
 * submitted (a page of questions). Everything else is shared.
 *
 * State is never carried by hue alone — WCAG 1.4.1. A judged choice gets a mark
 * and a screen-reader label as well as its value: correct condenses to solid
 * ink, the world's "settled" state; wrong is the one place a hue is allowed,
 * because failure is an interruption to the ladder rather than a step on it.
 */

export type ChoiceState = "idle" | "selected" | "correct" | "wrong";

const stateClass: Record<ChoiceState, string> = {
  idle: "border-border text-foreground hover:border-foreground hover:bg-[var(--app-hover)]",
  selected: "border-foreground text-foreground ring-2 ring-foreground",
  correct: "border-foreground bg-foreground text-[var(--app-canvas)]",
  wrong: "border-[var(--app-danger)] text-[var(--app-danger)]",
};

/** A shape as well as a value, so the state survives greyscale and colour blindness. */
const stateMark: Record<ChoiceState, string | null> = {
  idle: null,
  selected: null,
  correct: "✓",
  wrong: "✕",
};

const base =
  "flex w-full min-h-12 items-center gap-3 rounded-xl border px-4 py-3 text-left text-sm " +
  "transition-colors duration-150 disabled:cursor-not-allowed disabled:opacity-50";

export function ChoiceList({
  columns = 1,
  children,
  className = "",
}: {
  /** `auto` lets short options pair up on wide screens; long prose stays single file. */
  columns?: 1 | 2 | 3;
  children: ReactNode;
  className?: string;
}) {
  const cols =
    columns === 3
      ? "grid-cols-1 sm:grid-cols-3"
      : columns === 2
        ? "grid-cols-1 sm:grid-cols-2"
        : "grid-cols-1";
  return (
    <ul className={["grid list-none gap-2 p-0", cols, className].filter(Boolean).join(" ")}>
      {children}
    </ul>
  );
}

type CommonProps = {
  state?: ChoiceState;
  disabled?: boolean;
  children: ReactNode;
  /** Announced with the mark, e.g. "Correct". Required whenever state is judged. */
  stateLabel?: string;
};

export function Choice({
  state = "idle",
  disabled = false,
  toggle = false,
  onSelect,
  stateLabel,
  children,
}: CommonProps & {
  onSelect: () => void;
  /**
   * Announce as a two-state toggle rather than a one-shot answer. An answer
   * button is an action, so an unpicked one is not "unpressed" — but a
   * multi-select (onboarding's learning goals) must say so in both states.
   */
  toggle?: boolean;
}) {
  const mark = stateMark[state];
  return (
    <li>
      <button
        type="button"
        disabled={disabled}
        onClick={onSelect}
        aria-pressed={toggle || state === "selected" ? state === "selected" : undefined}
        className={`${base} ${stateClass[state]}`}
      >
        {mark ? (
          <span aria-hidden="true" className="shrink-0 font-bold">
            {mark}
          </span>
        ) : null}
        <span className="min-w-0 flex-1">{children}</span>
        {mark && stateLabel ? <span className="sr-only">{stateLabel}</span> : null}
      </button>
    </li>
  );
}

export function ChoiceRadio({
  state = "idle",
  disabled = false,
  name,
  checked,
  onSelect,
  children,
}: CommonProps & {
  name: string;
  checked: boolean;
  onSelect: () => void;
}) {
  return (
    <li>
      <label className={`${base} cursor-pointer ${stateClass[state]}`}>
        <input
          type="radio"
          name={name}
          checked={checked}
          disabled={disabled}
          onChange={onSelect}
          className="h-5 w-5 shrink-0 accent-[var(--app-primary)] sm:h-4 sm:w-4"
        />
        <span className="min-w-0 flex-1">{children}</span>
      </label>
    </li>
  );
}
