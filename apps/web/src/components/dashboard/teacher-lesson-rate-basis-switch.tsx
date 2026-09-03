"use client";

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
 * Deliberately quiet: it sits under the field it governs, beside the figures it
 * explains, and states the current mode before offering the other one. The full
 * radio group it replaces was a page-level block with two paragraphs of
 * explanation, which is far too much to repeat once per class.
 */
export function TeacherLessonRateBasisSwitch({
  basis,
  onChange,
  describedFieldLabel,
}: {
  basis: TeacherLessonRatePriceBasis;
  onChange: (next: TeacherLessonRatePriceBasis) => void;
  /** Names the field this governs, so the control makes sense out of context. */
  describedFieldLabel: string;
}) {
  const t = useTranslations("dashboard.profilePage");
  const included = basis === "tax_included";

  return (
    <p className="m-0 text-xs leading-snug text-muted">
      <span>
        {included
          ? t("teacherRateBasisRowTaxIncluded")
          : t("teacherRateBasisRowTaxExclusive")}
      </span>{" "}
      <button
        type="button"
        onClick={() => onChange(included ? "tax_exclusive" : "tax_included")}
        aria-label={`${describedFieldLabel}: ${
          included
            ? t("teacherRateBasisRowSwitchToExclusive")
            : t("teacherRateBasisRowSwitchToIncluded")
        }`}
        className="underline decoration-1 underline-offset-2 hover:text-foreground"
      >
        {included
          ? t("teacherRateBasisRowSwitchToExclusive")
          : t("teacherRateBasisRowSwitchToIncluded")}
      </button>
    </p>
  );
}
