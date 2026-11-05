"use client";

import { useId } from "react";
import { useTranslations } from "next-intl";
import { CheckRow } from "@/components/ui/check-row";
import { LearningLanguage } from "@/generated/prisma/enums";

/** One permission editor for creation and role assignment. */
export function TeachingLanguagesField({ value, onChange }: {
  value: LearningLanguage[];
  onChange: (languages: LearningLanguage[]) => void;
}) {
  const t = useTranslations("admin.teachingLanguages");
  const helpId = useId();
  return (
    <fieldset aria-describedby={helpId} className="space-y-1">
      <legend className="text-sm font-medium text-foreground">{t("label")}</legend>
      <p id={helpId} className="text-sm text-muted">{t("help")}</p>
      <div className="flex flex-wrap gap-x-8">
        {Object.values(LearningLanguage).map((language) => (
          <CheckRow key={language} checked={value.includes(language)} onChange={(checked) =>
            onChange(checked ? [...value, language] : value.filter((item) => item !== language))
          }>{t(language)}</CheckRow>
        ))}
      </div>
    </fieldset>
  );
}
