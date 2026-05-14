"use client";

import { useTranslations } from "next-intl";
import type { TeacherLessonRatePriceBasis } from "@/lib/teacher-lesson-rate-basis";

type Props = {
  basis: TeacherLessonRatePriceBasis;
  onBasisChange: (next: TeacherLessonRatePriceBasis) => void;
};

export function TeacherLessonRateBasisToggle({ basis, onBasisChange }: Props) {
  const t = useTranslations("dashboard.profilePage");

  return (
    <fieldset className="space-y-2 rounded-xl border-2 border-border bg-surface/60 p-3 shadow-sm">
      <legend className="text-sm font-semibold text-foreground">{t("teacherRatePriceBasisTitle")}</legend>
      <p className="text-xs leading-snug text-muted">{t("teacherRatePriceBasisIntro")}</p>
      <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:gap-6">
        <label className="flex cursor-pointer items-start gap-2 text-sm text-foreground">
          <input
            type="radio"
            name="teacher-lesson-rate-basis"
            className="mt-1"
            checked={basis === "tax_included"}
            onChange={() => onBasisChange("tax_included")}
          />
          <span>
            <span className="font-medium">{t("teacherRatePriceBasisTaxIncluded")}</span>
            <span className="mt-0.5 block text-xs text-muted">{t("teacherRatePriceBasisTaxIncludedHelp")}</span>
          </span>
        </label>
        <label className="flex cursor-pointer items-start gap-2 text-sm text-foreground">
          <input
            type="radio"
            name="teacher-lesson-rate-basis"
            className="mt-1"
            checked={basis === "tax_exclusive"}
            onChange={() => onBasisChange("tax_exclusive")}
          />
          <span>
            <span className="font-medium">{t("teacherRatePriceBasisTaxExclusive")}</span>
            <span className="mt-0.5 block text-xs text-muted">{t("teacherRatePriceBasisTaxExclusiveHelp")}</span>
          </span>
        </label>
      </div>
    </fieldset>
  );
}
