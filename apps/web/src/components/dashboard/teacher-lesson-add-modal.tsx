"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { Field, Input, Select } from "@/components/ui/field";
import { InlineAlert } from "@/components/ui/inline-alert";
import { Status } from "@/components/ui/status";
import {
  MIN_GROUP_CAPACITY,
  validateGroupOfferingRate,
} from "@/lib/group-lesson-pricing";
import { groupMeetAdvisory } from "@/lib/group-lesson-meet-limits";
import { calculateTaxIncludedInvoiceTotals } from "@/lib/invoice-totals";
import {
  MIN_PUBLIC_LESSON_RATE_YEN,
  validatePublicLessonRateYen,
} from "@/lib/lesson-rate-policy";
import {
  type TeacherLessonRatePriceBasis,
  convertTeacherRateInputBetweenBases,
  ratePriceBasisFromStored,
  storedRatePriceBasis,
  taxIncludedRateFromTeacherInput,
} from "@/lib/teacher-lesson-rate-basis";
import { TeacherLessonRateTaxBreakdown } from "@/components/dashboard/teacher-lesson-rate-tax-breakdown";
import { TeacherLessonRateBasisSwitch } from "@/components/dashboard/teacher-lesson-rate-basis-switch";

const DURATIONS = [30, 40, 60, 90] as const;

export type TaxonomyOption = {
  id: string;
  code: string;
  labelEn: string;
  labelJa: string | null;
};

/** What the endpoint hands back, and what the list needs to show the new row. */
export type AddedOffering = {
  id: string;
  durationMin: number;
  rateYen: number;
  groupTotalRateYen: number | null;
  ratePriceBasis: string;
  isGroup: boolean;
  groupSize: number | null;
  classLevelId: string | null;
  classTypeId: string | null;
};

/**
 * Creates or changes one class, and saves it.
 *
 * Adding used to append a row to the bottom of the list, which on a page with a
 * few classes already on it put the new one below the fold — the button looked
 * like it had done nothing. A dialog puts the new class in front of the person
 * creating it, and gives its six fields room instead of a table row on a phone.
 *
 * It saves on confirm rather than staging a change for a Save button further
 * down the page, because that second step is one most people miss.
 *
 * Editing lives here too. It was inline at first, but a class carries six
 * decisions — level, focus, length, size, price and which figure that price is
 * — and the last of those needs a two-option control that simply does not fit
 * in a table row. Squeezed in, it dominated the row it belonged to. In a dialog
 * everything has room and the list stays a list.
 */
export function TeacherLessonAddModal({
  open,
  kind,
  editing = null,
  classLevels,
  classTypes,
  locale,
  onClose,
  onSaved,
}: {
  open: boolean;
  kind: "individual" | "group";
  /** The class being changed. Absent when adding a new one. */
  editing?: AddedOffering | null;
  classLevels: TaxonomyOption[];
  classTypes: TaxonomyOption[];
  locale: string;
  onClose: () => void;
  onSaved: (offering: AddedOffering) => void;
}) {
  const t = useTranslations("dashboard.profilePage");
  const isGroup = kind === "group";

  const startingBasis = ratePriceBasisFromStored(editing?.ratePriceBasis);
  const [classLevelId, setClassLevelId] = useState(
    editing?.classLevelId ?? classLevels[0]?.id ?? "",
  );
  const [classTypeId, setClassTypeId] = useState(
    editing?.classTypeId ?? classTypes[0]?.id ?? "",
  );
  const [durationMin, setDurationMin] = useState<number>(
    editing?.durationMin ?? (isGroup ? 60 : 30),
  );
  const [groupSize, setGroupSize] = useState(editing?.groupSize ?? MIN_GROUP_CAPACITY);
  const [rateInput, setRateInput] = useState(() => {
    if (!editing) return "";
    // Stored figures are tax-included; show them back the way they were typed.
    const stored = editing.isGroup
      ? editing.groupTotalRateYen ?? editing.rateYen * (editing.groupSize ?? MIN_GROUP_CAPACITY)
      : editing.rateYen;
    return String(
      convertTeacherRateInputBetweenBases(stored, "tax_included", startingBasis),
    );
  });
  const [basis, setBasis] = useState<TeacherLessonRatePriceBasis>(startingBasis);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function pickLabel(option: TaxonomyOption) {
    return locale.toLowerCase().startsWith("ja")
      ? (option.labelJa ?? option.labelEn)
      : option.labelEn;
  }

  const entered = Number.parseInt(rateInput.trim(), 10);
  const hasFigure = !Number.isNaN(entered) && entered > 0;
  const taxIncluded = hasFigure ? taxIncludedRateFromTeacherInput(entered, basis) : 0;

  const groupCheck =
    isGroup && hasFigure
      ? validateGroupOfferingRate({ groupTotalYen: taxIncluded, capacity: groupSize })
      : null;
  const meetLimit = isGroup ? groupMeetAdvisory({ durationMin, capacity: groupSize }) : null;

  // What one student's invoice will say. Derived from the share rather than by
  // dividing the class total's tax, because the share is the figure that is
  // actually charged and rounded.
  const perStudentTax = calculateTaxIncludedInvoiceTotals(
    groupCheck?.ok ? groupCheck.perStudentYen : 0,
  );

  const rateComplaint = !hasFigure
    ? null
    : isGroup
      ? groupCheck && !groupCheck.ok && groupCheck.reason === "BELOW_PUBLIC_MINIMUM"
        ? t("teacherGroupBelowMinimum", {
            perStudent: (groupCheck.perStudentYen ?? 0).toLocaleString(),
            capacity: groupSize,
            minimum: (groupCheck.totalAtFloorYen ?? 0).toLocaleString(),
          })
        : null
      : validatePublicLessonRateYen(taxIncluded).ok
        ? null
        : t("teacherRateBelowMinimum", {
            amount: MIN_PUBLIC_LESSON_RATE_YEN.toLocaleString(),
          });

  const ready =
    hasFigure &&
    Boolean(classLevelId) &&
    Boolean(classTypeId) &&
    rateComplaint === null &&
    (!isGroup || Boolean(groupCheck?.ok));

  const rateLabel = isGroup
    ? basis === "tax_included"
      ? t("teacherGroupTotalLabelTaxIncluded")
      : t("teacherGroupTotalLabelTaxExclusive")
    : basis === "tax_included"
      ? t("teacherRateYenLabelTaxIncluded")
      : t("teacherRateYenLabelTaxExclusive");

  async function onConfirm() {
    if (!ready || saving) return;
    setSaving(true);
    setError(null);
    try {
      const res = await fetch(
        editing
          ? `/api/teacher/lesson-offerings/${editing.id}`
          : "/api/teacher/lesson-offerings",
        {
        method: editing ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          durationMin,
          rateYen: isGroup ? (groupCheck?.ok ? groupCheck.perStudentYen : 0) : taxIncluded,
          groupTotalRateYen: isGroup ? taxIncluded : undefined,
          ratePriceBasis: storedRatePriceBasis(basis),
          isGroup,
          groupSize: isGroup ? groupSize : null,
          classLevelId,
          classTypeId,
        }),
        },
      );
      const data = (await res.json()) as { error?: string; offering?: AddedOffering };
      if (!res.ok || !data.offering) {
        setError(data.error ?? t("teacherAddClassError"));
        return;
      }
      onSaved(data.offering);
      setRateInput("");
      onClose();
    } catch {
      setError(t("teacherAddClassError"));
    } finally {
      setSaving(false);
    }
  }

  const noTaxonomy = classLevels.length === 0 || classTypes.length === 0;

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={
        editing
          ? t("teacherEditClassTitle")
          : isGroup
            ? t("teacherAddClassGroupTitle")
            : t("teacherAddClassIndividualTitle")
      }
      description={t("teacherAddClassSubtitle")}
      actions={
        <>
          <Button variant="secondary" onClick={onClose} disabled={saving}>
            {t("teacherAddClassCancel")}
          </Button>
          <Button onClick={onConfirm} disabled={!ready || noTaxonomy} loading={saving}>
            {saving
              ? editing
                ? t("teacherEditClassWorking")
                : t("teacherAddClassWorking")
              : editing
                ? t("teacherEditClassConfirm")
                : t("teacherAddClassConfirm")}
          </Button>
        </>
      }
    >
      {noTaxonomy ? (
        <InlineAlert variant="warning">{t("teacherAddClassNoTaxonomy")}</InlineAlert>
      ) : (
        <div className="space-y-4">
          <Field label={t("teacherLessonLevelForRate")}>
            {(field) => (
              <Select
                {...field}
                value={classLevelId}
                onChange={(e) => setClassLevelId(e.target.value)}
              >
                {classLevels.map((option) => (
                  <option key={option.id} value={option.id}>
                    {pickLabel(option)}
                  </option>
                ))}
              </Select>
            )}
          </Field>

          <Field label={t("teacherLessonTypeForRate")}>
            {(field) => (
              <Select
                {...field}
                value={classTypeId}
                onChange={(e) => setClassTypeId(e.target.value)}
              >
                {classTypes.map((option) => (
                  <option key={option.id} value={option.id}>
                    {pickLabel(option)}
                  </option>
                ))}
              </Select>
            )}
          </Field>

          <Field label={t("teacherDurationLabel")}>
            {(field) => (
              <Select
                {...field}
                value={String(durationMin)}
                onChange={(e) => setDurationMin(Number(e.target.value))}
              >
                {DURATIONS.map((d) => (
                  <option key={d} value={d}>
                    {d} min
                  </option>
                ))}
              </Select>
            )}
          </Field>

          {isGroup ? (
            <Field label={t("teacherGroupSizeLabel")}>
              {(field) => (
                <Input
                  {...field}
                  type="number"
                  min={MIN_GROUP_CAPACITY}
                  value={groupSize}
                  onChange={(e) =>
                    setGroupSize(
                      Number.parseInt(e.target.value || String(MIN_GROUP_CAPACITY), 10),
                    )
                  }
                />
              )}
            </Field>
          ) : null}

          <Field label={rateLabel} error={rateComplaint}>
            {(field) => (
              <Input
                {...field}
                type="text"
                inputMode="numeric"
                pattern="[0-9]*"
                value={rateInput}
                onChange={(e) => setRateInput(e.target.value.replace(/\D/g, ""))}
                placeholder={isGroup ? "16000" : String(MIN_PUBLIC_LESSON_RATE_YEN)}
              />
            )}
          </Field>

          <div className="space-y-1">
            {groupCheck?.ok ? (
              <>
                <p className="text-xs font-medium leading-snug text-foreground">
                  {t("teacherGroupPerStudentSummary", {
                    perStudent: groupCheck.perStudentYen.toLocaleString(),
                    whenFull: groupCheck.collectedWhenFullYen.toLocaleString(),
                  })}
                </p>
                {/*
                  The tax split describes ONE SEAT, not the class total. Each
                  student is invoiced their own share and the tax is computed on
                  that invoice — so the class total's tax is a figure nobody is
                  ever charged, and it does not even equal the seat taxes added
                  up, because each is rounded separately.
                */}
                <p className="text-xs leading-snug text-muted">
                  {t("teacherGroupPerStudentTax", {
                    perStudent: groupCheck.perStudentYen.toLocaleString(),
                    subtotal: perStudentTax.subtotalYen.toLocaleString(),
                    tax: perStudentTax.taxYen.toLocaleString(),
                  })}
                </p>
              </>
            ) : (
              <TeacherLessonRateTaxBreakdown basis={basis} rateYenInput={rateInput} />
            )}
          </div>

          <TeacherLessonRateBasisSwitch
            basis={basis}
            // The typed figure is the teacher's and stays put; the mode says
            // how to read it. "Enter as ... your fee before tax" with 4,000 in
            // the box means a ¥4,000 fee and a ¥4,400 student price. Rewriting
            // the digits to hold the price fixed answered a question nobody
            // asked, and made the mode look broken.
            onChange={setBasis}
          />

          {meetLimit ? (
            <InlineAlert variant="warning" role="status">
              {meetLimit.kind === "DURATION_OVER_FREE_LIMIT"
                ? t("teacherGroupMeetLimitOver", {
                    limit: meetLimit.limitMin,
                    duration: meetLimit.durationMin,
                  })
                : meetLimit.kind === "DURATION_AT_FREE_LIMIT"
                  ? t("teacherGroupMeetLimitAt", { limit: meetLimit.limitMin })
                  : t("teacherGroupMeetLimitCapacity", {
                      limit: meetLimit.limit,
                      participants: meetLimit.participants,
                    })}
            </InlineAlert>
          ) : null}

          {error ? (
            <p role="alert">
              <Status tone="error">{error}</Status>
            </p>
          ) : null}
        </div>
      )}
    </Modal>
  );
}
