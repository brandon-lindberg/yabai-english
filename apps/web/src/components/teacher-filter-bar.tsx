"use client";

import { usePathname, useRouter } from "@/i18n/navigation";
import { useTranslations } from "next-intl";
import { Field, Input } from "@/components/ui/field";

type Props = {
  specialty: string;
  language: string;
};

/**
 * Signed-in students only.
 *
 * This used to carry a guest mode that rendered the same two fields to a
 * signed-out visitor and redirected them to sign-in on blur — a form that
 * looked live and could not narrow anything, because `/book` strips a guest's
 * filter params before it queries. Guests get `TeacherBrowseControls`' one-line
 * notice instead, which makes that branch unreachable rather than merely
 * unused, so it is gone.
 */
export function TeacherFilterBar({ specialty, language }: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const t = useTranslations("booking");

  function update(next: { specialty?: string; language?: string }) {
    const params = new URLSearchParams();
    const s = (next.specialty ?? specialty).trim();
    const l = (next.language ?? language).trim().toUpperCase();
    if (s) params.set("specialty", s);
    if (l) params.set("language", l);
    const query = params.toString();

    router.replace(query ? `${pathname}?${query}` : pathname);
  }

  /*
    Both labels and both placeholders were hard-coded English in a product whose
    audience reads Japanese — the only untranslated strings left on this screen.
    The specialty label reuses `booking.teacherSpecialties`, already used on the
    teacher profile for exactly this word.

    No card: two fields above a list do not need a tray around them, and the
    box was competing with the rows it filters.
  */
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <Field label={t("teacherSpecialties")}>
        {(field) => (
          <Input
            {...field}
            defaultValue={specialty}
            placeholder={t("filterSpecialtyPlaceholder")}
            onBlur={(e) => update({ specialty: e.target.value })}
          />
        )}
      </Field>
      <Field label={t("filterLanguageLabel")}>
        {(field) => (
          <Input
            {...field}
            defaultValue={language}
            placeholder={t("filterLanguagePlaceholder")}
            /* Uppercase the value the filter actually sends, not the hint
               telling you what to type. */
            className="uppercase placeholder:normal-case"
            onBlur={(e) => update({ language: e.target.value })}
          />
        )}
      </Field>
    </div>
  );
}
