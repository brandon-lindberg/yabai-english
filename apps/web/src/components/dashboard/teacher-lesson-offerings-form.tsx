"use client";

import { useLocale, useTranslations } from "next-intl";
import { useState } from "react";
import {
  type TeacherLessonRatePriceBasis,
  convertTeacherRateInputBetweenBases,
  ratePriceBasisFromStored,
  storedRatePriceBasis,
  taxIncludedRateFromTeacherInput,
} from "@/lib/teacher-lesson-rate-basis";
import {
  MIN_PUBLIC_LESSON_RATE_YEN,
  validatePublicLessonRateYen,
} from "@/lib/lesson-rate-policy";
import { FormStatus } from "@/components/ui/form-status";
import { CheckRow } from "@/components/ui/check-row";
import {
  TeacherLessonOfferRow,
  RATE_FIELD_LABEL_ROW,
  RATE_CONTROL_HEIGHT,
} from "./teacher-lesson-offer-row";
import { partitionOfferingsByTeacherEditable } from "@/lib/teacher-offering-permissions";
import {
  TeacherLessonAddModal,
  type AddedOffering,
} from "@/components/dashboard/teacher-lesson-add-modal";
import { InlineAlert } from "@/components/ui/inline-alert";
import {
  MIN_GROUP_CAPACITY,
  validateGroupOfferingRate,
} from "@/lib/group-lesson-pricing";
import {
  groupMeetAdvisory,
  type GroupMeetAdvisory,
} from "@/lib/group-lesson-meet-limits";

const INDIVIDUAL_DURATIONS = [30, 40, 60, 90] as const;

export type TaxonomyOption = {
  id: string;
  code: string;
  labelEn: string;
  labelJa: string | null;
};


type LessonOfferingRow = {
  clientId: string;
  durationMin: number;
  classLevelId: string;
  classTypeId: string;
  rateYenInput: string;
  /** Which figure `rateYenInput` is, for THIS class alone. */
  ratePriceBasis: TeacherLessonRatePriceBasis;
};

type GroupOfferingRow = LessonOfferingRow & {
  groupSize: number;
};

type Props = {
  initialOffersFreeTrial: boolean;
  initialLessonOfferings: Array<{
    id: string;
    durationMin: number;
    rateYen: number;
    groupTotalRateYen?: number | null;
    /** How this class was priced last time. Absent means the list price. */
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

function pickLabel(opt: TaxonomyOption, locale: string): string {
  return locale.toLowerCase().startsWith("ja")
    ? (opt.labelJa ?? opt.labelEn)
    : opt.labelEn;
}

/**
 * Google's group-call limit, in the teacher's language. The rule itself lives
 * in `group-lesson-meet-limits`; this only chooses the sentence.
 */
function meetAdvisoryMessage(
  advisory: GroupMeetAdvisory,
  t: (key: string, values?: Record<string, string | number>) => string,
): string {
  switch (advisory.kind) {
    case "DURATION_OVER_FREE_LIMIT":
      return t("teacherGroupMeetLimitOver", {
        limit: advisory.limitMin,
        duration: advisory.durationMin,
      });
    case "DURATION_AT_FREE_LIMIT":
      return t("teacherGroupMeetLimitAt", { limit: advisory.limitMin });
    case "CAPACITY_OVER_MEET_LIMIT":
      return t("teacherGroupMeetLimitCapacity", {
        limit: advisory.limit,
        participants: advisory.participants,
      });
  }
}

/**
 * Restates one row's figure in the other basis, leaving every other row alone.
 *
 * The whole point of the per-row control: switching a class from a list price
 * to a pre-tax fee must not touch the class beside it.
 */
function convertRowToBasis<T extends { rateYenInput: string; ratePriceBasis: TeacherLessonRatePriceBasis }>(
  row: T,
  next: TeacherLessonRatePriceBasis,
): T {
  if (next === row.ratePriceBasis) return row;
  const n = Number.parseInt(row.rateYenInput.trim(), 10);
  if (Number.isNaN(n) || n <= 0) return { ...row, ratePriceBasis: next };
  return {
    ...row,
    ratePriceBasis: next,
    rateYenInput: String(convertTeacherRateInputBetweenBases(n, row.ratePriceBasis, next)),
  };
}

function makeRowId() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

/** Aligns multi-line rate labels with single-line taxonomy labels; pairs with `RATE_CONTROL_HEIGHT`. */

export function TeacherLessonOfferingsForm({
  initialOffersFreeTrial,
  initialLessonOfferings,
  classLevels,
  classTypes,
}: Props) {
  const t = useTranslations("dashboard.profilePage");
  const locale = useLocale();
  const defaultClassLevelId = classLevels[0]?.id ?? "";
  const defaultClassTypeId = classTypes[0]?.id ?? "";
  // The free trial and any admin-granted below-minimum class share this table
  // but are not the teacher's to price, so they never become editable rows.
  const editableOfferings = partitionOfferingsByTeacherEditable(initialLessonOfferings).editable;
  const [individualOffers, setIndividualOffers] = useState<LessonOfferingRow[]>(() => {
    const rows = editableOfferings
      .filter((o) => !o.isGroup)
      .map((o) => ({
        clientId: o.id || makeRowId(),
        durationMin: o.durationMin,
        classLevelId: o.classLevelId ?? defaultClassLevelId,
        classTypeId: o.classTypeId ?? defaultClassTypeId,
        ratePriceBasis: ratePriceBasisFromStored(o.ratePriceBasis),
        rateYenInput: String(
          convertTeacherRateInputBetweenBases(
            o.rateYen,
            "tax_included",
            ratePriceBasisFromStored(o.ratePriceBasis),
          ),
        ),
      }));
    return rows;
  });
  const [groupOffers, setGroupOffers] = useState<GroupOfferingRow[]>(
    editableOfferings
      .filter((o) => o.isGroup && o.groupSize)
      .map((o) => ({
        clientId: o.id || makeRowId(),
        durationMin: o.durationMin,
        groupSize: o.groupSize ?? 2,
        classLevelId: o.classLevelId ?? defaultClassLevelId,
        classTypeId: o.classTypeId ?? defaultClassTypeId,
        ratePriceBasis: ratePriceBasisFromStored(o.ratePriceBasis),
        // The field holds the class total. Rows written before the total was
        // stored only know the share, so the total is rebuilt from it.
        rateYenInput: String(
          convertTeacherRateInputBetweenBases(
            o.groupTotalRateYen ?? o.rateYen * (o.groupSize ?? 2),
            "tax_included",
            ratePriceBasisFromStored(o.ratePriceBasis),
          ),
        ),
      })),
  );
  const [offersFreeTrial, setOffersFreeTrial] = useState(initialOffersFreeTrial);
  const [status, setStatus] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [addingKind, setAddingKind] = useState<"individual" | "group" | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);

  /**
   * Every control here saves itself. There is no Save button, because the one
   * that used to sit at the bottom saved by deleting the teacher's whole set of
   * classes and recreating it — which nulled `teacherLessonOfferingId` on every
   * published availability slot, silently, on every save.
   */
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

  /** The class as the endpoint wants it, from a row as the form holds it. */
  function rowToPayload(row: LessonOfferingRow | GroupOfferingRow) {
    const entered = Number.parseInt(row.rateYenInput.trim(), 10);
    if (Number.isNaN(entered) || entered <= 0) return null;
    const taxIncluded = taxIncludedRateFromTeacherInput(entered, row.ratePriceBasis);
    const shared = {
      durationMin: row.durationMin,
      ratePriceBasis: storedRatePriceBasis(row.ratePriceBasis),
      classLevelId: row.classLevelId,
      classTypeId: row.classTypeId,
    };
    if ("groupSize" in row) {
      const check = validateGroupOfferingRate({
        groupTotalYen: taxIncluded,
        capacity: row.groupSize,
      });
      if (!check.ok) return null;
      return {
        ...shared,
        rateYen: check.perStudentYen,
        groupTotalRateYen: taxIncluded,
        isGroup: true,
        groupSize: row.groupSize,
      };
    }
    if (!validatePublicLessonRateYen(taxIncluded).ok) return null;
    return { ...shared, rateYen: taxIncluded, isGroup: false, groupSize: null };
  }

  /** Writes one row, once the teacher has finished with the field. */
  function commitRow(row: LessonOfferingRow | GroupOfferingRow) {
    const payload = rowToPayload(row);
    // An incomplete or refused figure is not saved; the row already says why.
    if (!payload) return;
    void persist(() =>
      fetch(`/api/teacher/lesson-offerings/${row.clientId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      }),
    );
  }

  async function removeRow(
    clientId: string,
    drop: () => void,
  ) {
    if (!window.confirm(t("teacherRemoveClassConfirm"))) return;
    const ok = await persist(() =>
      fetch(`/api/teacher/lesson-offerings/${clientId}`, { method: "DELETE" }),
    );
    if (ok) drop();
  }

  /**
   * The complaint for a typed rate, or null when it is acceptable. Judges the
   * tax-included price rather than the number typed, because that is what the
   * student pays and what the minimum is defined against.
   */
  function rateErrorFor(
    rateYenInput: string,
    basis: TeacherLessonRatePriceBasis,
  ): string | null {
    const entered = Number.parseInt(rateYenInput.trim(), 10);
    if (Number.isNaN(entered)) return null; // an empty field is not yet wrong
    const taxIncluded = taxIncludedRateFromTeacherInput(entered, basis);
    if (validatePublicLessonRateYen(taxIncluded).ok) return null;
    return t("teacherRateBelowMinimum", {
      amount: MIN_PUBLIC_LESSON_RATE_YEN.toLocaleString(),
    });
  }

  /**
   * What a group row is worth, once the teacher's total is divided up. Null
   * while the field is empty, so an untouched row is not yet wrong.
   */
  function groupRateFor(row: GroupOfferingRow) {
    const entered = Number.parseInt(row.rateYenInput.trim(), 10);
    if (Number.isNaN(entered) || entered <= 0) return null;
    return validateGroupOfferingRate({
      groupTotalYen: taxIncludedRateFromTeacherInput(entered, row.ratePriceBasis),
      capacity: row.groupSize,
    });
  }

  /** The complaint under a group row, or null when the class is publishable. */
  function groupRateErrorFor(row: GroupOfferingRow): string | null {
    const result = groupRateFor(row);
    if (!result || result.ok) return null;
    if (result.reason !== "BELOW_PUBLIC_MINIMUM") return null;
    return t("teacherGroupBelowMinimum", {
      perStudent: (result.perStudentYen ?? 0).toLocaleString(),
      capacity: row.groupSize,
      minimum: (result.totalAtFloorYen ?? 0).toLocaleString(),
    });
  }



  /** A class the dialog has already saved joins the list without a reload. */
  function absorbAddedOffering(offering: AddedOffering) {
    const basis = ratePriceBasisFromStored(offering.ratePriceBasis);
    const shared = {
      clientId: offering.id,
      durationMin: offering.durationMin,
      classLevelId: offering.classLevelId ?? defaultClassLevelId,
      classTypeId: offering.classTypeId ?? defaultClassTypeId,
      ratePriceBasis: basis,
    };
    if (offering.isGroup) {
      setGroupOffers((prev) => [
        ...prev,
        {
          ...shared,
          groupSize: offering.groupSize ?? MIN_GROUP_CAPACITY,
          rateYenInput: String(
            convertTeacherRateInputBetweenBases(
              offering.groupTotalRateYen ??
                offering.rateYen * (offering.groupSize ?? MIN_GROUP_CAPACITY),
              "tax_included",
              basis,
            ),
          ),
        },
      ]);
      return;
    }
    setIndividualOffers((prev) => [
      ...prev,
      {
        ...shared,
        rateYenInput: String(
          convertTeacherRateInputBetweenBases(offering.rateYen, "tax_included", basis),
        ),
      },
    ]);
  }

  return (
    <>
      {/* Mounted only while open, and outside the form: a closed dialog left in
          the tree still contributes its fields to this form and to anything
          looking for a control by its label. */}
      {addingKind ? (
        <TeacherLessonAddModal
          open
          kind={addingKind}
          classLevels={classLevels}
          classTypes={classTypes}
          locale={locale}
          onClose={() => setAddingKind(null)}
          onAdded={absorbAddedOffering}
        />
      ) : null}
    <form onSubmit={(e) => e.preventDefault()} className="space-y-6">
      <section className="space-y-3 border-t border-border pt-6">
        <div className="flex items-center justify-between gap-2">
          <h3 className="text-base font-bold tracking-[-0.02em] text-foreground">{t("teacherRatesByDurationTitle")}</h3>
          <button
            type="button"
            onClick={() => setAddingKind("individual")}
            className="rounded-full border border-border px-3 py-1 text-xs font-semibold text-foreground hover:bg-[var(--app-hover)]"
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
        <p className="text-xs text-muted">{t("teacherLessonTypeForRateHelp")}</p>


        {individualOffers.length === 0 ? (
          <p className="text-xs text-muted">{t("teacherIndividualRatesEmpty")}</p>
        ) : (
          <div className="space-y-3">
            {individualOffers.map((row, index) => (
              <TeacherLessonOfferRow
                key={row.clientId}
                value={row}
                onChange={(patch) =>
                  setIndividualOffers((prev) =>
                    prev.map((r, i) => (i === index ? { ...r, ...patch } : r)),
                  )
                }
                onCommit={() => commitRow(row)}
                onRemove={() =>
                  removeRow(row.clientId, () =>
                    setIndividualOffers((prev) => prev.filter((_, i) => i !== index)),
                  )
                }
                classLevels={classLevels}
                classTypes={classTypes}
                durations={INDIVIDUAL_DURATIONS}
                pickLabel={(opt) => pickLabel(opt, locale)}
                ratePriceBasis={row.ratePriceBasis}
                onRatePriceBasisChange={(next) => {
                  const converted = convertRowToBasis(row, next);
                  setIndividualOffers((prev) =>
                    prev.map((r, i) => (i === index ? converted : r)),
                  );
                  commitRow(converted);
                }}
                ratePlaceholder={String(MIN_PUBLIC_LESSON_RATE_YEN)}
                rateError={rateErrorFor(row.rateYenInput, row.ratePriceBasis)}
                labels={{
                  level: t("teacherLessonLevelForRate"),
                  type: t("teacherLessonTypeForRate"),
                  duration: t("teacherDurationLabel"),
                  rate:
                    row.ratePriceBasis === "tax_included"
                      ? t("teacherRateYenLabelTaxIncluded")
                      : t("teacherRateYenLabelTaxExclusive"),
                  remove: t("teacherIndividualRatesRemove"),
                }}
              />
            ))}
          </div>
        )}
      </section>

      <section className="space-y-3 border-t border-border pt-6">
        <div className="flex items-center justify-between gap-2">
          <h3 className="text-base font-bold tracking-[-0.02em] text-foreground">{t("teacherGroupRatesTitle")}</h3>
          <button
            type="button"
            onClick={() => setAddingKind("group")}
            className="rounded-full border border-border px-3 py-1 text-xs font-semibold text-foreground hover:bg-[var(--app-hover)]"
          >
            {t("teacherGroupRatesAdd")}
          </button>
        </div>
        <p className="text-xs text-muted">{t("teacherGroupRatesHelp")}</p>
        {groupOffers.length === 0 ? (
          <p className="text-xs text-muted">{t("teacherGroupRatesEmpty")}</p>
        ) : (
          <div className="space-y-2">
            {groupOffers.map((group, index) => {
              const meetLimit = groupMeetAdvisory({
                durationMin: group.durationMin,
                capacity: group.groupSize,
              });
              const groupShare = groupRateFor(group);
              return (
              <div key={group.clientId} className="space-y-2">
              <TeacherLessonOfferRow
                value={group}
                onChange={(patch) =>
                  setGroupOffers((prev) =>
                    prev.map((row, i) => (i === index ? { ...row, ...patch } : row)),
                  )
                }
                onCommit={() => commitRow(group)}
                onRemove={() =>
                  removeRow(group.clientId, () =>
                    setGroupOffers((prev) => prev.filter((_, i) => i !== index)),
                  )
                }
                classLevels={classLevels}
                classTypes={classTypes}
                durations={INDIVIDUAL_DURATIONS}
                pickLabel={(opt) => pickLabel(opt, locale)}
                ratePriceBasis={group.ratePriceBasis}
                onRatePriceBasisChange={(next) => {
                  const converted = convertRowToBasis(group, next);
                  setGroupOffers((prev) =>
                    prev.map((r, i) => (i === index ? converted : r)),
                  );
                  commitRow(converted);
                }}
                ratePlaceholder="8000"
                rateError={groupRateErrorFor(group)}
                rateNote={
                  groupShare?.ok
                    ? t("teacherGroupPerStudentSummary", {
                        perStudent: groupShare.perStudentYen.toLocaleString(),
                        whenFull: groupShare.collectedWhenFullYen.toLocaleString(),
                      })
                    : null
                }
                labels={{
                  level: t("teacherLessonLevelForRate"),
                  type: t("teacherLessonTypeForRate"),
                  duration: t("teacherDurationLabel"),
                  rate:
                    group.ratePriceBasis === "tax_included"
                      ? t("teacherGroupTotalLabelTaxIncluded")
                      : t("teacherGroupTotalLabelTaxExclusive"),
                  remove: t("teacherGroupRatesRemove"),
                }}
                leading={
                  <label className="flex w-full flex-col gap-1.5 sm:w-20 sm:flex-none">
                    <span className={RATE_FIELD_LABEL_ROW}>{t("teacherGroupSizeLabel")}</span>
                    <input
                      type="number"
                      min={MIN_GROUP_CAPACITY}
                      value={group.groupSize}
                      onChange={(e) =>
                        setGroupOffers((prev) =>
                          prev.map((row, i) =>
                            i === index
                              ? {
                                  ...row,
                                  groupSize: Number.parseInt(
                                    e.target.value || String(MIN_GROUP_CAPACITY),
                                    10,
                                  ),
                                }
                              : row,
                          ),
                        )
                      }
                      onBlur={() => commitRow(group)
                      }
                      className={`${RATE_CONTROL_HEIGHT} w-full border-border bg-surface`}
                    />
                  </label>
                }
              />
              {meetLimit ? (
                <InlineAlert variant="warning" role="status">
                  {meetAdvisoryMessage(meetLimit, t)}
                </InlineAlert>
              ) : null}
              </div>
              );
            })}
          </div>
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
        <span className="font-medium text-foreground">{t("teacherOffersFreeTrialLabel")}</span>
      </CheckRow>

      {/* No Save button: every control on this page writes itself. The one that
          used to live here saved by deleting the teacher's whole set of classes
          and recreating it, which unlinked every published availability slot. */}
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
    </form>
    </>
  );
}
