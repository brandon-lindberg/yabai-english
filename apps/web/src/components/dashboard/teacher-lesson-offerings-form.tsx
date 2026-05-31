"use client";

import { useLocale, useTranslations } from "next-intl";
import { useState } from "react";
import {
  type TeacherLessonRatePriceBasis,
  convertTeacherRateInputBetweenBases,
  taxIncludedRateFromTeacherInput,
} from "@/lib/teacher-lesson-rate-basis";
import {
  MIN_PUBLIC_LESSON_RATE_YEN,
  validatePublicLessonRateYen,
} from "@/lib/lesson-rate-policy";
import { TeacherLessonRateBasisToggle } from "./teacher-lesson-rate-basis-toggle";
import { TeacherLessonRateTaxBreakdown } from "./teacher-lesson-rate-tax-breakdown";

const INDIVIDUAL_DURATIONS = [30, 40, 60, 90] as const;

export type TaxonomyOption = {
  id: string;
  code: string;
  labelEn: string;
  labelJa: string | null;
};

type LessonOfferingInput = {
  durationMin: number;
  rateYen: number;
  isGroup: boolean;
  groupSize: number | null;
  classLevelId: string;
  classTypeId: string | null;
};

type LessonOfferingRow = {
  clientId: string;
  durationMin: number;
  classLevelId: string;
  classTypeId: string;
  rateYenInput: string;
};

type GroupOfferingRow = LessonOfferingRow & {
  groupSize: number;
};

type Props = {
  initialRateYen: number | null;
  initialOffersFreeTrial: boolean;
  initialLessonOfferings: Array<{
    id: string;
    durationMin: number;
    rateYen: number;
    isGroup: boolean;
    groupSize: number | null;
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

function makeRowId() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

/** Aligns multi-line rate labels with single-line taxonomy labels; pairs with `RATE_CONTROL_HEIGHT`. */
const RATE_FIELD_LABEL_ROW = "flex min-h-[3rem] items-end text-xs leading-snug text-muted";
const RATE_CONTROL_HEIGHT =
  "h-10 min-h-[2.5rem] rounded-xl border border-border px-3 py-2 text-sm text-foreground outline-none focus-visible:ring-2 focus-visible:ring-foreground/25";
const RATE_BREAKDOWN_SLOT = "min-h-[2.75rem] text-xs leading-snug text-muted";

export function TeacherLessonOfferingsForm({
  initialRateYen,
  initialOffersFreeTrial,
  initialLessonOfferings,
  classLevels,
  classTypes,
}: Props) {
  const t = useTranslations("dashboard.profilePage");
  const locale = useLocale();
  const defaultClassLevelId = classLevels[0]?.id ?? "";
  const defaultClassTypeId = classTypes[0]?.id ?? "";
  const [individualOffers, setIndividualOffers] = useState<LessonOfferingRow[]>(() => {
    const rows = initialLessonOfferings
      .filter((o) => !o.isGroup)
      .map((o) => ({
        clientId: o.id || makeRowId(),
        durationMin: o.durationMin,
        classLevelId: o.classLevelId ?? defaultClassLevelId,
        classTypeId: o.classTypeId ?? defaultClassTypeId,
        rateYenInput: String(o.rateYen),
      }));
    if (rows.length > 0) return rows;
    if (initialRateYen != null) {
      return [
        {
          clientId: makeRowId(),
          durationMin: 30,
          classLevelId: defaultClassLevelId,
          classTypeId: defaultClassTypeId,
          rateYenInput: String(initialRateYen),
        },
      ];
    }
    return [];
  });
  const [groupOffers, setGroupOffers] = useState<GroupOfferingRow[]>(
    initialLessonOfferings
      .filter((o) => o.isGroup && o.groupSize)
      .map((o) => ({
        clientId: o.id || makeRowId(),
        durationMin: o.durationMin,
        groupSize: o.groupSize ?? 2,
        classLevelId: o.classLevelId ?? defaultClassLevelId,
        classTypeId: o.classTypeId ?? defaultClassTypeId,
        rateYenInput: String(o.rateYen),
      })),
  );
  const [offersFreeTrial, setOffersFreeTrial] = useState(initialOffersFreeTrial);
  const [status, setStatus] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [ratePriceBasis, setRatePriceBasis] = useState<TeacherLessonRatePriceBasis>("tax_included");

  function handleRatePriceBasisChange(next: TeacherLessonRatePriceBasis) {
    if (next === ratePriceBasis) return;
    setIndividualOffers((prev) =>
      prev.map((row) => {
        const n = Number.parseInt(row.rateYenInput.trim(), 10);
        if (Number.isNaN(n) || n <= 0) return row;
        return {
          ...row,
          rateYenInput: String(convertTeacherRateInputBetweenBases(n, ratePriceBasis, next)),
        };
      }),
    );
    setGroupOffers((prev) =>
      prev.map((row) => {
        const n = Number.parseInt(row.rateYenInput.trim(), 10);
        if (Number.isNaN(n) || n <= 0) return row;
        return {
          ...row,
          rateYenInput: String(convertTeacherRateInputBetweenBases(n, ratePriceBasis, next)),
        };
      }),
    );
    setRatePriceBasis(next);
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setStatus("saving");
    const lessonOfferings: LessonOfferingInput[] = [];

    for (const row of individualOffers) {
      const entered = Number.parseInt(row.rateYenInput.trim(), 10);
      if (Number.isNaN(entered) || entered <= 0 || !row.classLevelId || !row.classTypeId) {
        setStatus("error");
        return;
      }
      const rate = taxIncludedRateFromTeacherInput(entered, ratePriceBasis);
      if (!validatePublicLessonRateYen(rate).ok) {
        setStatus("error");
        return;
      }
      lessonOfferings.push({
        durationMin: row.durationMin,
        rateYen: rate,
        isGroup: false,
        groupSize: null,
        classLevelId: row.classLevelId,
        classTypeId: row.classTypeId,
      });
    }

    for (const group of groupOffers) {
      const entered = Number.parseInt(group.rateYenInput.trim(), 10);
      if (
        Number.isNaN(entered) ||
        entered <= 0 ||
        group.groupSize < 2 ||
        !group.classLevelId ||
        !group.classTypeId
      ) {
        setStatus("error");
        return;
      }
      const rate = taxIncludedRateFromTeacherInput(entered, ratePriceBasis);
      if (!validatePublicLessonRateYen(rate).ok) {
        setStatus("error");
        return;
      }
      lessonOfferings.push({
        durationMin: group.durationMin,
        rateYen: rate,
        isGroup: true,
        groupSize: group.groupSize,
        classLevelId: group.classLevelId,
        classTypeId: group.classTypeId,
      });
    }

    const fallbackRate = lessonOfferings.find((o) => !o.isGroup)?.rateYen ?? null;
    const response = await fetch("/api/teacher/profile", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        rateYen: fallbackRate,
        offersFreeTrial,
        lessonOfferings,
      }),
    });

    if (!response.ok) {
      setStatus("error");
      return;
    }
    setStatus("saved");
    setTimeout(() => setStatus("idle"), 2000);
  }

  return (
    <form onSubmit={onSubmit} className="space-y-6">
      <section className="space-y-3 rounded-xl border border-border bg-background p-4">
        <div className="flex items-center justify-between gap-2">
          <h3 className="text-sm font-semibold text-foreground">{t("teacherRatesByDurationTitle")}</h3>
          <button
            type="button"
            onClick={() =>
              setIndividualOffers((prev) => [
                ...prev,
                {
                  clientId: makeRowId(),
                  durationMin: 30,
                  classLevelId: defaultClassLevelId,
                  classTypeId: defaultClassTypeId,
                  rateYenInput: "",
                },
              ])
            }
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

        <TeacherLessonRateBasisToggle basis={ratePriceBasis} onBasisChange={handleRatePriceBasisChange} />

        {individualOffers.length === 0 ? (
          <p className="text-xs text-muted">{t("teacherIndividualRatesEmpty")}</p>
        ) : (
          <div className="space-y-3">
            {individualOffers.map((row, index) => (
              <div
                key={row.clientId}
                className="flex flex-col gap-3 rounded-xl border border-border/80 bg-surface/60 p-3 sm:flex-row sm:items-start sm:gap-3"
              >
                <label className="flex min-w-0 flex-1 flex-col gap-1.5">
                  <span className={RATE_FIELD_LABEL_ROW}>{t("teacherLessonLevelForRate")}</span>
                  <select
                    value={row.classLevelId}
                    onChange={(e) =>
                      setIndividualOffers((prev) =>
                        prev.map((r, i) =>
                          i === index ? { ...r, classLevelId: e.target.value } : r,
                        ),
                      )
                    }
                    className={`${RATE_CONTROL_HEIGHT} w-full border-border bg-background`}
                  >
                    {classLevels.map((opt) => (
                      <option key={opt.id} value={opt.id}>
                        {pickLabel(opt, locale)}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="flex min-w-0 flex-1 flex-col gap-1.5">
                  <span className={RATE_FIELD_LABEL_ROW}>{t("teacherLessonTypeForRate")}</span>
                  <select
                    value={row.classTypeId}
                    onChange={(e) =>
                      setIndividualOffers((prev) =>
                        prev.map((r, i) =>
                          i === index ? { ...r, classTypeId: e.target.value } : r,
                        ),
                      )
                    }
                    className={`${RATE_CONTROL_HEIGHT} w-full border-border bg-background`}
                  >
                    {classTypes.map((opt) => (
                      <option key={opt.id} value={opt.id}>
                        {pickLabel(opt, locale)}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="flex w-full flex-col gap-1.5 sm:w-[7.5rem] sm:flex-none">
                  <span className={RATE_FIELD_LABEL_ROW}>{t("teacherDurationLabel")}</span>
                  <select
                    value={row.durationMin}
                    onChange={(e) =>
                      setIndividualOffers((prev) =>
                        prev.map((r, i) =>
                          i === index
                            ? { ...r, durationMin: Number.parseInt(e.target.value, 10) }
                            : r,
                        ),
                      )
                    }
                    className={`${RATE_CONTROL_HEIGHT} w-full border-border bg-background`}
                  >
                    {INDIVIDUAL_DURATIONS.map((d) => (
                      <option key={d} value={d}>
                        {d} min
                      </option>
                    ))}
                  </select>
                </label>
                <div className="flex min-w-0 flex-1 flex-col gap-1.5 sm:min-w-[11rem] sm:max-w-sm">
                  <span className={RATE_FIELD_LABEL_ROW}>
                    {ratePriceBasis === "tax_included"
                      ? t("teacherRateYenLabelTaxIncluded")
                      : t("teacherRateYenLabelTaxExclusive")}
                  </span>
                  <input
                    type="text"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    value={row.rateYenInput}
                    onChange={(e) =>
                      setIndividualOffers((prev) =>
                        prev.map((r, i) =>
                          i === index
                            ? { ...r, rateYenInput: e.target.value.replace(/\D/g, "") }
                            : r,
                        ),
                      )
                    }
                    placeholder="3500"
                    className={`${RATE_CONTROL_HEIGHT} w-full max-w-full border-border bg-surface sm:max-w-none`}
                  />
                  <div className={RATE_BREAKDOWN_SLOT}>
                    <TeacherLessonRateTaxBreakdown basis={ratePriceBasis} rateYenInput={row.rateYenInput} />
                  </div>
                </div>
                <div className="flex flex-col gap-1.5 sm:shrink-0">
                  <span className={`${RATE_FIELD_LABEL_ROW} hidden sm:flex`} aria-hidden />
                  <button
                    type="button"
                    onClick={() =>
                      setIndividualOffers((prev) => prev.filter((_, i) => i !== index))
                    }
                    className="inline-flex h-10 min-h-[2.5rem] w-full shrink-0 items-center justify-center rounded-full border border-border px-3 text-xs font-semibold text-foreground hover:bg-[var(--app-hover)] sm:w-auto"
                  >
                    {t("teacherIndividualRatesRemove")}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      <section className="space-y-3 rounded-xl border border-border bg-background p-4">
        <div className="flex items-center justify-between gap-2">
          <h3 className="text-sm font-semibold text-foreground">{t("teacherGroupRatesTitle")}</h3>
          <button
            type="button"
            onClick={() =>
              setGroupOffers((prev) => [
                ...prev,
                {
                  clientId: makeRowId(),
                  durationMin: 60,
                  groupSize: 2,
                  classLevelId: defaultClassLevelId,
                  classTypeId: defaultClassTypeId,
                  rateYenInput: "",
                },
              ])
            }
            className="rounded-full border border-border px-3 py-1 text-xs font-semibold text-foreground hover:bg-[var(--app-hover)]"
          >
            {t("teacherGroupRatesAdd")}
          </button>
        </div>
        <p className="text-xs text-muted">{t("teacherGroupRatesHelp")}</p>
        <p className="text-xs text-muted">{t("teacherRatePriceBasisAppliesToGroupNote")}</p>
        {groupOffers.length === 0 ? (
          <p className="text-xs text-muted">{t("teacherGroupRatesEmpty")}</p>
        ) : (
          <div className="space-y-2">
            {groupOffers.map((group, index) => (
              <div
                key={group.clientId}
                className="flex flex-col gap-3 rounded-xl border border-border/80 bg-surface/60 p-3 sm:flex-row sm:items-start sm:gap-3"
              >
                <label className="flex w-full flex-col gap-1.5 sm:w-20 sm:flex-none">
                  <span className={RATE_FIELD_LABEL_ROW}>{t("teacherGroupSizeLabel")}</span>
                  <input
                    type="number"
                    min={2}
                    value={group.groupSize}
                    onChange={(e) =>
                      setGroupOffers((prev) =>
                        prev.map((row, i) =>
                          i === index
                            ? { ...row, groupSize: Number.parseInt(e.target.value || "2", 10) }
                            : row,
                        ),
                      )
                    }
                    className={`${RATE_CONTROL_HEIGHT} w-full border-border bg-surface`}
                  />
                </label>
                <label className="flex min-w-0 flex-1 flex-col gap-1.5">
                  <span className={RATE_FIELD_LABEL_ROW}>{t("teacherLessonLevelForRate")}</span>
                  <select
                    value={group.classLevelId}
                    onChange={(e) =>
                      setGroupOffers((prev) =>
                        prev.map((row, i) =>
                          i === index ? { ...row, classLevelId: e.target.value } : row,
                        ),
                      )
                    }
                    className={`${RATE_CONTROL_HEIGHT} w-full border-border bg-surface`}
                  >
                    {classLevels.map((opt) => (
                      <option key={opt.id} value={opt.id}>
                        {pickLabel(opt, locale)}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="flex min-w-0 flex-1 flex-col gap-1.5">
                  <span className={RATE_FIELD_LABEL_ROW}>{t("teacherLessonTypeForRate")}</span>
                  <select
                    value={group.classTypeId}
                    onChange={(e) =>
                      setGroupOffers((prev) =>
                        prev.map((row, i) =>
                          i === index ? { ...row, classTypeId: e.target.value } : row,
                        ),
                      )
                    }
                    className={`${RATE_CONTROL_HEIGHT} w-full border-border bg-surface`}
                  >
                    {classTypes.map((opt) => (
                      <option key={opt.id} value={opt.id}>
                        {pickLabel(opt, locale)}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="flex w-full flex-col gap-1.5 sm:w-[7.5rem] sm:flex-none">
                  <span className={RATE_FIELD_LABEL_ROW}>{t("teacherDurationLabel")}</span>
                  <select
                    value={group.durationMin}
                    onChange={(e) =>
                      setGroupOffers((prev) =>
                        prev.map((row, i) =>
                          i === index
                            ? { ...row, durationMin: Number.parseInt(e.target.value, 10) }
                            : row,
                        ),
                      )
                    }
                    className={`${RATE_CONTROL_HEIGHT} w-full border-border bg-surface`}
                  >
                    {INDIVIDUAL_DURATIONS.map((d) => (
                      <option key={d} value={d}>
                        {d} min
                      </option>
                    ))}
                  </select>
                </label>
                <div className="flex min-w-0 flex-1 flex-col gap-1.5 sm:min-w-[11rem] sm:max-w-sm">
                  <span className={RATE_FIELD_LABEL_ROW}>
                    {ratePriceBasis === "tax_included"
                      ? t("teacherRateYenLabelTaxIncluded")
                      : t("teacherRateYenLabelTaxExclusive")}
                  </span>
                  <input
                    type="text"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    value={group.rateYenInput}
                    onChange={(e) =>
                      setGroupOffers((prev) =>
                        prev.map((row, i) =>
                          i === index
                            ? { ...row, rateYenInput: e.target.value.replace(/\D/g, "") }
                            : row,
                        ),
                      )
                    }
                    placeholder="8000"
                    className={`${RATE_CONTROL_HEIGHT} w-full border-border bg-surface sm:max-w-none`}
                  />
                  <div className={RATE_BREAKDOWN_SLOT}>
                    <TeacherLessonRateTaxBreakdown basis={ratePriceBasis} rateYenInput={group.rateYenInput} />
                  </div>
                </div>
                <div className="flex flex-col gap-1.5 sm:shrink-0">
                  <span className={`${RATE_FIELD_LABEL_ROW} hidden sm:flex`} aria-hidden />
                  <button
                    type="button"
                    onClick={() => setGroupOffers((prev) => prev.filter((_, i) => i !== index))}
                    className="inline-flex h-10 min-h-[2.5rem] w-full shrink-0 items-center justify-center rounded-full border border-border px-3 text-xs font-semibold text-foreground hover:bg-[var(--app-hover)] sm:w-auto"
                  >
                    {t("teacherGroupRatesRemove")}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      <label className="flex items-start gap-2 rounded-xl border border-border bg-background px-3 py-2 text-sm text-foreground">
        <input
          type="checkbox"
          checked={offersFreeTrial}
          onChange={(e) => setOffersFreeTrial(e.target.checked)}
          className="mt-0.5"
        />
        <span>
          <span className="font-medium text-foreground">{t("teacherOffersFreeTrialLabel")}</span>
          <span className="mt-0.5 block text-xs text-muted">{t("teacherOffersFreeTrialHelp")}</span>
        </span>
      </label>

      <div className="flex items-center gap-3">
        <button
          type="submit"
          disabled={status === "saving"}
          className="rounded-full bg-foreground px-5 py-2 text-sm font-semibold text-background hover:opacity-90 disabled:opacity-50"
        >
          {status === "saving" ? t("saving") : t("save")}
        </button>
        {status === "saved" ? (
          <span className="text-sm text-green-600 dark:text-green-400">{t("saved")}</span>
        ) : null}
        {status === "error" ? <span className="text-sm text-destructive">{t("error")}</span> : null}
      </div>
    </form>
  );
}
