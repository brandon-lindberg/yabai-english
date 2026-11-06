"use client";

import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { BookingStatus, LearningLanguage } from "@/generated/prisma/enums";
import type { AdminLessonQuery } from "@/lib/admin/lesson-search";
import { useBrowserTimezone } from "@/hooks/use-browser-timezone";
import { bookingStatusKey } from "@/lib/booking-status";
import { Button } from "@/components/ui/button";
import { Field, Input, Select } from "@/components/ui/field";
import { actionLinkClass } from "@/components/ui/inline-link";

const views = ["all", "upcoming", "history", "reschedules"] as const;

export function AdminLessonFilters({ query, personName, hasFilters }: { query: AdminLessonQuery; personName?: string; hasFilters: boolean }) {
  const t = useTranslations("admin.bookingsPanel");
  const dashboard = useTranslations("dashboard");
  const language = useTranslations("admin.teachingLanguages");
  const zone = useBrowserTimezone() ?? query.zone;

  return (
    <form method="get" aria-label={t("filters")} className="space-y-4 border-b border-border pb-5">
      {query.person && <input type="hidden" name="person" value={query.person} />}
      {zone && <input type="hidden" name="zone" value={zone} />}
      {personName && <p className="break-words text-sm text-muted">{t("personFilter", { name: personName })}</p>}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Field label={t("searchLabel")} className="sm:col-span-2">
          {(field) => <Input {...field} type="search" name="q" defaultValue={query.q} placeholder={t("searchPlaceholder")} maxLength={200} />}
        </Field>
        <Field label={t("viewLabel")}>
          {(field) => <Select {...field} name="view" defaultValue={query.view}>
            {views.map((view) => <option key={view} value={view}>{t(`views.${view}`)}</option>)}
          </Select>}
        </Field>
        <Field label={t("subject")}>
          {(field) => <Select {...field} name="subject" defaultValue={query.subject ?? ""}>
            <option value="">{t("allSubjects")}</option>
            {Object.values(LearningLanguage).map((item) => <option key={item} value={item}>{language(item)}</option>)}
          </Select>}
        </Field>
        <Field label={t("statusLabel")}>
          {(field) => <Select {...field} name="status" defaultValue={query.status ?? ""}>
            <option value="">{t("statusAll")}</option>
            {Object.values(BookingStatus).map((item) => <option key={item} value={item}>{dashboard(bookingStatusKey(item))}</option>)}
          </Select>}
        </Field>
        <Field label={t("dateFrom")}>
          {(field) => <Input {...field} type="date" name="from" defaultValue={query.from} />}
        </Field>
        <Field label={t("dateTo")}>
          {(field) => <Input {...field} type="date" name="to" defaultValue={query.to} />}
        </Field>
      </div>
      <div className="flex flex-wrap items-center gap-4">
        <Button type="submit">{t("apply")}</Button>
        {hasFilters && <Link href="/admin/lessons" className={`${actionLinkClass} text-sm`}>{t("reset")}</Link>}
      </div>
    </form>
  );
}
