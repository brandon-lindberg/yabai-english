"use client";

import { useId } from "react";
import { useTranslations } from "next-intl";
import type { TeacherLessonRatePriceBasis } from "@/lib/teacher-lesson-rate-basis";

/**
 * Which figure this one class is priced in.
 *
 * Per row, not per page. A single form-wide setting rewrote the typed number in
 * every row whenever it changed — including classes the teacher was not editing
 * — and because both tax conversions floor, toggling out and back moved roughly
 * one price in eleven by a yen. A published price must not change because
 * somebody looked at a different class.
 *
 * Both options are on screen with the current one filled, rather than a link
 * offering the other one. A link states the mode you are *not* in as its only
 * affordance, which reads as a footnote and is easy to skim past — and this
 * decides whether a typed number means ¥20,000 or ¥22,000.
 *
 * Real radios, so arrow keys, labels and the group semantics come from the
 * platform. The name is scoped with `useId` because the rates page renders one
 * of these per class, and a shared name would make every row's control fight
 * for the same selection.
 */
export function TeacherLessonRateBasisSwitch({
  basis,
  onChange,
}: {
  basis: TeacherLessonRatePriceBasis;
  onChange: (next: TeacherLessonRatePriceBasis) => void;
}) {
  const t = useTranslations("dashboard.profilePage");
  const name = useId();

  const options = [
    { value: "tax_included" as const, label: t("teacherRateBasisOptionIncluded") },
    { value: "tax_exclusive" as const, label: t("teacherRateBasisOptionExclusive") },
  ];

  /*
    No `m-0`/`p-0`/`border-0` on the fieldset: preflight already zeroes all
    three on every element. Worse than redundant — Tailwind v4 builds
    `space-y-*` from a zero-specificity `:where()` selector, so an `m-0` here
    beat the parent's spacing and pinned this control against whatever
    followed it.
  */
  return (
    <fieldset className="flex flex-wrap items-center gap-x-3 gap-y-2">
      {/*
        Its own sentence rather than the price field's label: that field is now
        called "Tax included", which is also one of the options here, and a
        group named after one of its own choices tells a screen reader nothing.
      */}
      <legend className="sr-only">{t("teacherRateBasisLegend")}</legend>
      <span aria-hidden="true" className="text-xs font-medium text-muted">
        {t("teacherRateBasisEnterAs")}
      </span>
      {/* One border around both, so they read as two halves of one control
          rather than two loose buttons. */}
      <span className="inline-flex overflow-hidden rounded-full border border-border">
        {options.map((option) => {
          const selected = basis === option.value;
          return (
            <label
              key={option.value}
              className={[
                "cursor-pointer px-3 py-1.5 text-xs font-semibold transition-colors",
                // Settled ink for the chosen one, per the DESIGN.md ladder —
                // the difference is value, not hue, so it survives both themes.
                selected
                  ? "bg-primary text-primary-foreground"
                  : "bg-surface text-muted hover:bg-[var(--app-hover)] hover:text-foreground",
                "focus-within:outline focus-within:outline-2 focus-within:outline-offset-[-2px] focus-within:outline-[var(--app-text)]",
              ].join(" ")}
            >
              <input
                type="radio"
                name={name}
                value={option.value}
                checked={selected}
                onChange={() => onChange(option.value)}
                className="sr-only"
              />
              {option.label}
            </label>
          );
        })}
      </span>
    </fieldset>
  );
}
