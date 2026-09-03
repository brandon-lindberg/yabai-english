"use client";

import { useLocale, useTranslations } from "next-intl";
import { useState } from "react";
import { MIN_PUBLIC_LESSON_RATE_YEN } from "@/lib/lesson-rate-policy";
import { FormStatus } from "@/components/ui/form-status";
import { CheckRow } from "@/components/ui/check-row";
import { DataList } from "@/components/ui/data-row";
import { partitionOfferingsByTeacherEditable } from "@/lib/teacher-offering-permissions";
import {
  TeacherLessonAddModal,
  type AddedOffering,
} from "@/components/dashboard/teacher-lesson-add-modal";
import { TeacherLessonSummaryRow } from "@/components/dashboard/teacher-lesson-summary-row";

export type TaxonomyOption = {
  id: string;
  code: string;
  labelEn: string;
  labelJa: string | null;
};

type Props = {
  initialOffersFreeTrial: boolean;
  initialLessonOfferings: Array<{
    id: string;
    durationMin: number;
    rateYen: number;
    groupTotalRateYen?: number | null;
    ratePriceBasis?: string | null;
    isGroup: boolean;
    groupSize: number | null;
    isFreeTrial?: boolean | null;
    adminRateOverrideByUserId?: string | null;
    classLevelId?: string | null;
    classTypeId?: string | null;
  }>;
  classLevels: TaxonomyOption[];
  classTypes: TaxonomyOption[];
};

/** What the dialog needs to prefill, and the row needs to display. */
function toOffering(o: Props["initialLessonOfferings"][number]): AddedOffering {
  return {
    id: o.id,
    durationMin: o.durationMin,
    rateYen: o.rateYen,
    groupTotalRateYen: o.groupTotalRateYen ?? null,
    ratePriceBasis: o.ratePriceBasis ?? "TAX_INCLUDED",
    isGroup: o.isGroup,
    groupSize: o.groupSize,
    classLevelId: o.classLevelId ?? null,
    classTypeId: o.classTypeId ?? null,
  };
}

/**
 * A teacher's classes, and what each costs.
 *
 * The list reads; the dialog writes. Editing was inline at first, but a class
 * carries six decisions and the last of them — which figure the price is —
 * needs a control showing both options at once. At the size that takes, it
 * dominated the row it was describing. Moving it into the dialog gives it room
 * and leaves every line of the list the same shape.
 *
 * Each change saves itself. There is no Save button, because the one that used
 * to sit at the bottom saved by deleting the teacher's whole set of classes and
 * recreating them, which silently unlinked every published availability slot
 * from the class it belonged to.
 */
export function TeacherLessonOfferingsForm({
  initialOffersFreeTrial,
  initialLessonOfferings,
  classLevels,
  classTypes,
}: Props) {
  const t = useTranslations("dashboard.profilePage");
  const locale = useLocale();

  // The free trial and any admin-granted below-minimum class share this table
  // but are not the teacher's to price, so they never appear here.
  const [offerings, setOfferings] = useState<AddedOffering[]>(() =>
    partitionOfferingsByTeacherEditable(initialLessonOfferings).editable.map(toOffering),
  );
  const [offersFreeTrial, setOffersFreeTrial] = useState(initialOffersFreeTrial);
  const [dialog, setDialog] = useState<
    { kind: "individual" | "group"; editing: AddedOffering | null } | null
  >(null);
  const [status, setStatus] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [saveError, setSaveError] = useState<string | null>(null);
  const [removingId, setRemovingId] = useState<string | null>(null);

  const individual = offerings.filter((o) => !o.isGroup);
  const groups = offerings.filter((o) => o.isGroup && o.groupSize);

  async function persist(request: () => Promise<Response>) {
    setStatus("saving");
    setSaveError(null);
    try {
      const res = await request();
      const data = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) {
        setStatus("error");
        setSaveError(data.error ?? null);
        return false;
      }
      setStatus("saved");
      setTimeout(() => setStatus("idle"), 2000);
      return true;
    } catch {
      setStatus("error");
      return false;
    }
  }

  /** The dialog has already written it; the list catches up without a reload. */
  function absorb(saved: AddedOffering) {
    setOfferings((prev) => {
      const existing = prev.findIndex((o) => o.id === saved.id);
      if (existing === -1) return [...prev, saved];
      return prev.map((o, i) => (i === existing ? saved : o));
    });
  }

  async function remove(offering: AddedOffering) {
    if (!window.confirm(t("teacherRemoveClassConfirm"))) return;
    setRemovingId(offering.id);
    const ok = await persist(() =>
      fetch(`/api/teacher/lesson-offerings/${offering.id}`, { method: "DELETE" }),
    );
    setRemovingId(null);
    if (ok) setOfferings((prev) => prev.filter((o) => o.id !== offering.id));
  }

  function rowsFor(list: AddedOffering[]) {
    return (
      <DataList>
        {list.map((offering) => (
          <TeacherLessonSummaryRow
            key={offering.id}
            offering={offering}
            classLevels={classLevels}
            classTypes={classTypes}
            locale={locale}
            removing={removingId === offering.id}
            onEdit={() =>
              setDialog({
                kind: offering.isGroup ? "group" : "individual",
                editing: offering,
              })
            }
            onRemove={() => remove(offering)}
          />
        ))}
      </DataList>
    );
  }

  const addButtonClass =
    "rounded-full border border-border px-3 py-1 text-xs font-semibold text-foreground hover:bg-[var(--app-hover)]";

  return (
    <>
      {/* Mounted only while open, so a closed dialog does not leave its fields
          on the page. Keyed so reopening it on another class starts fresh. */}
      {dialog ? (
        <TeacherLessonAddModal
          key={dialog.editing?.id ?? `new-${dialog.kind}`}
          open
          kind={dialog.kind}
          editing={dialog.editing}
          classLevels={classLevels}
          classTypes={classTypes}
          locale={locale}
          onClose={() => setDialog(null)}
          onSaved={absorb}
        />
      ) : null}

      <div className="space-y-6">
        <section className="space-y-3 border-t border-border pt-6">
          <div className="flex items-center justify-between gap-2">
            <h3 className="text-base font-bold tracking-[-0.02em] text-foreground">
              {t("teacherRatesByDurationTitle")}
            </h3>
            <button
              type="button"
              onClick={() => setDialog({ kind: "individual", editing: null })}
              className={addButtonClass}
            >
              {t("teacherIndividualRatesAdd")}
            </button>
          </div>
          <p className="text-xs text-muted">{t("teacherRatesByDurationHelp")}</p>
          <p className="text-xs text-muted">
            {t("teacherMinimumRateHelp", {
              amount: MIN_PUBLIC_LESSON_RATE_YEN.toLocaleString(),
            })}
          </p>
          {individual.length === 0 ? (
            <p className="text-xs text-muted">{t("teacherIndividualRatesEmpty")}</p>
          ) : (
            rowsFor(individual)
          )}
        </section>

        <section className="space-y-3 border-t border-border pt-6">
          <div className="flex items-center justify-between gap-2">
            <h3 className="text-base font-bold tracking-[-0.02em] text-foreground">
              {t("teacherGroupRatesTitle")}
            </h3>
            <button
              type="button"
              onClick={() => setDialog({ kind: "group", editing: null })}
              className={addButtonClass}
            >
              {t("teacherGroupRatesAdd")}
            </button>
          </div>
          <p className="text-xs text-muted">{t("teacherGroupRatesHelp")}</p>
          {groups.length === 0 ? (
            <p className="text-xs text-muted">{t("teacherGroupRatesEmpty")}</p>
          ) : (
            rowsFor(groups)
          )}
        </section>

        <CheckRow
          checked={offersFreeTrial}
          onChange={(next) => {
            setOffersFreeTrial(next);
            void persist(() =>
              fetch("/api/teacher/profile", {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ offersFreeTrial: next }),
              }),
            );
          }}
          description={t("teacherOffersFreeTrialHelp")}
        >
          <span className="font-medium text-foreground">
            {t("teacherOffersFreeTrialLabel")}
          </span>
        </CheckRow>

        <div className="flex flex-col gap-1">
          <FormStatus
            state={status}
            savingLabel={t("saving")}
            savedLabel={t("saved")}
            errorLabel={saveError ?? t("error")}
          />
          {status === "idle" ? (
            <p className="text-xs text-muted">{t("teacherRatesAutosaveNote")}</p>
          ) : null}
        </div>
      </div>
    </>
  );
}
