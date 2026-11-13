"use client";

import { useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import type { LearningLanguage } from "@/generated/prisma/enums";
import type { AdminTeacherOverview as TeacherOverview } from "@/lib/admin/teacher-overview";
import { formatYen } from "@/lib/format-money";
import { Button } from "@/components/ui/button";
import { DataList, DataRow } from "@/components/ui/data-row";
import { Field, Select } from "@/components/ui/field";
import { actionLinkClass } from "@/components/ui/inline-link";
import { Section } from "@/components/ui/section";
import { Status } from "@/components/ui/status";

export function AdminTeacherOverview({ overview, saving, onVisibility }: {
  overview: TeacherOverview;
  saving: boolean;
  onVisibility: (language: LearningLanguage, rosterOnly: boolean) => Promise<void>;
}) {
  const t = useTranslations("admin.profileOverview");
  const language = useTranslations("admin.teachingLanguages");
  const tier = useTranslations("admin.teacherTiersPage");
  const locale = useLocale();
  const [draft, setDraft] = useState<Partial<Record<LearningLanguage, boolean>>>({});
  const [visibilityError, setVisibilityError] = useState<LearningLanguage | null>(null);
  const stripeReady = overview.stripe.ready && overview.stripe.policyAccepted && overview.stripe.paymentMethods.length > 0;

  return (
    <>
      <Section title={t("teachingSubjects")}>
        <div className="grid divide-y divide-border border-y border-border lg:grid-cols-2 lg:divide-x lg:divide-y-0">
          {overview.subjects.map((subject) => {
            const key = subject.learningLanguage;
            const offerings = overview.offerings.filter((offering) => offering.learningLanguage === key);
            const nextVisibility = draft[key] ?? subject.rosterOnly;
            return (
              <section key={key} aria-label={language(key)} className="min-w-0 space-y-4 py-5 lg:px-5 lg:first:pl-0 lg:last:pr-0">
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <h3 className="text-lg font-bold">{language(key)}</h3>
                  <Status tone={subject.eligible && !subject.rosterOnly ? "settled" : "open"}>
                    {t(subject.eligible ? (subject.rosterOnly ? "rosterOnly" : "public") : "unavailable")}
                  </Status>
                </div>
                <dl className="space-y-1 text-sm">
                  <div className="flex flex-wrap justify-between gap-x-4"><dt className="text-muted">{t("permission")}</dt>
                    <dd>{t(subject.permitted ? "assigned" : "unassigned")}</dd>
                  </div>
                  <div className="flex flex-wrap justify-between gap-x-4"><dt className="text-muted">{t("availability")}</dt>
                    <dd>{t("availabilityCount", { open: subject.openAvailabilityCount, count: subject.availabilityCount })}</dd>
                  </div>
                </dl>
                {!!subject.blockers.length && <ul className="list-disc space-y-1 pl-4 text-sm text-muted">
                  {subject.blockers.map((blocker) => <li key={blocker}>{t(`blockers.${blocker}`)}</li>)}
                </ul>}
                {subject.permitted && (
                  <form className="flex flex-wrap items-end gap-2" onSubmit={async (event) => {
                    event.preventDefault();
                    setVisibilityError(null);
                    try {
                      await onVisibility(key, nextVisibility);
                      setDraft((previous) => ({ ...previous, [key]: undefined }));
                    } catch {
                      setVisibilityError(key);
                    }
                  }}>
                    <Field label={t("visibilityFor", { language: language(key) })} className="min-w-0 flex-1">
                      {(field) => <Select {...field} value={nextVisibility ? "roster" : "public"} disabled={saving}
                        onChange={(event) => setDraft((previous) => ({ ...previous, [key]: event.target.value === "roster" }))}>
                        <option value="public">{t("public")}</option>
                        <option value="roster">{t("rosterOnly")}</option>
                      </Select>}
                    </Field>
                    <Button type="submit" size="sm" variant="secondary" disabled={saving || nextVisibility === subject.rosterOnly}>{t("saveVisibility")}</Button>
                    {visibilityError === key && <p role="alert" className="w-full text-sm text-destructive">{t("visibilityError")}</p>}
                  </form>
                )}
                <details className="border-t border-border pt-3">
                  <summary className="cursor-pointer text-sm font-medium">{t("classCount", { count: offerings.length })}</summary>
                  {offerings.length === 0 ? <p className="mt-2 text-sm text-muted">{t("noClasses")}</p> : (
                    <DataList className="mt-2">
                      {offerings.map((offering) => (
                        <DataRow key={offering.id}>
                          <p className="text-sm font-semibold">{offering.isFreeTrial ? t("trial") : offeringLabel(offering, locale, t("class"))}</p>
                          <p className="mt-1 text-xs text-muted">{t("classDetails", { minutes: offering.durationMin, rate: formatYen(offering.rateYen, locale) })} · {t(offering.isGroup ? "group" : "private")}</p>
                          <Status tone={offering.active ? "settled" : "spent"}>{t(offering.active ? "active" : "retired")}</Status>
                        </DataRow>
                      ))}
                    </DataList>
                  )}
                </details>
              </section>
            );
          })}
        </div>
      </Section>
      <Section title={t("integrations")}>
        <DataList>
          <DataRow actions={<Status tone={overview.google.calendar ? "settled" : "open"}>{t(overview.google.calendar ? "connected" : "notConnected")}</Status>}>
            <h3 className="font-semibold">{t("google")}</h3>
            <p className="mt-1 text-sm text-muted">{t("googleDetail", { calendar: t(overview.google.calendar ? "connected" : "notConnected"), meet: t(overview.google.meet ? "connected" : "notConnected"), drive: t(overview.google.drive ? "connected" : "notConnected") })}</p>
          </DataRow>
          <DataRow actions={<Status tone={stripeReady ? "settled" : "warn"}>{t(stripeReady ? "ready" : "notReady")}</Status>}>
            <h3 className="font-semibold">Stripe</h3>
            <ul className="mt-1 space-y-1 text-sm text-muted">
              {!overview.stripe.status && <li>{t("noStripe")}</li>}
              {overview.stripe.status && !overview.stripe.chargesEnabled && <li>{t("chargesDisabled")}</li>}
              {overview.stripe.status && !overview.stripe.payoutsEnabled && <li>{t("payoutsDisabled")}</li>}
              {overview.stripe.status && overview.stripe.chargesEnabled && overview.stripe.payoutsEnabled && !overview.stripe.ready && <li>{t("stripeReview")}</li>}
              {!overview.stripe.policyAccepted && <li>{t("paymentPolicyMissing")}</li>}
              {overview.stripe.ready && !overview.stripe.paymentMethods.length && <li>{t("noPaymentMethods")}</li>}
              {stripeReady && <li>{t("paymentEnabled")}</li>}
            </ul>
          </DataRow>
          <DataRow actions={<Link className={`${actionLinkClass} text-sm`} href="/admin/teacher-tiers">{t("manageTiers")}</Link>}>
            <h3 className="font-semibold">{t("tier")}</h3>
            <p className="mt-1 text-sm text-muted">{tier("tierName", { number: overview.tier.replace("TIER_", "") })}</p>
          </DataRow>
        </DataList>
      </Section>
    </>
  );
}

export function offeringLabel(offering: TeacherOverview["offerings"][number], locale: string, fallback: string) {
  return [offering.classLevel, offering.classType].flatMap((item) =>
    item ? [locale === "ja" ? item.labelJa || item.labelEn : item.labelEn] : [],
  ).join(" · ") || fallback;
}
