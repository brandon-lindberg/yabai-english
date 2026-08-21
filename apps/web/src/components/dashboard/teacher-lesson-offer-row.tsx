"use client";

import type { ReactNode } from "react";
import { TeacherLessonRateTaxBreakdown } from "@/components/dashboard/teacher-lesson-rate-tax-breakdown";

/**
 * One priced lesson offering.
 *
 * The individual-rate editor and the group-rate editor were the same eighty-four
 * lines of markup twice — the largest single clone in the repository. They
 * differed only in which state setter they closed over, what the remove button
 * said, and the placeholder amount. They had also already drifted: the selects
 * were `bg-background` on one side and `bg-surface` on the other, which nobody
 * decided.
 *
 * Group rates add a party-size field and nothing else, so that is a slot.
 */

export const RATE_FIELD_LABEL_ROW =
  "flex min-h-[3rem] items-end text-xs leading-snug text-muted";
export const RATE_CONTROL_HEIGHT =
  "h-10 min-h-[2.5rem] rounded-xl border px-3 text-sm text-foreground";
export const RATE_BREAKDOWN_SLOT = "min-h-[2.75rem] text-xs leading-snug text-muted";

const CONTROL = `${RATE_CONTROL_HEIGHT} w-full border-border bg-surface`;

export type OfferRowValue = {
  classLevelId: string;
  classTypeId: string;
  durationMin: number;
  rateYenInput: string;
};

/**
 * Generic over the caller's taxonomy type: this row only needs an `id` to key
 * the option, and defers the label to `pickLabel`. Declaring a second
 * `TaxonomyOption` here would have been the same duplication one level down.
 */
export function TeacherLessonOfferRow<Option extends { id: string }>({
  value,
  onChange,
  onRemove,
  classLevels,
  classTypes,
  durations,
  pickLabel,
  ratePriceBasis,
  ratePlaceholder,
  rateError = null,
  labels,
  leading,
}: {
  value: OfferRowValue;
  /** Receives only the changed keys. */
  onChange: (patch: Partial<OfferRowValue>) => void;
  onRemove: () => void;
  classLevels: Option[];
  classTypes: Option[];
  durations: readonly number[];
  pickLabel: (option: Option) => string;
  ratePriceBasis: "tax_included" | "tax_exclusive";
  ratePlaceholder: string;
  /** Shown under the rate instead of the tax breakdown when set. */
  rateError?: string | null;
  labels: {
    level: string;
    type: string;
    duration: string;
    rate: string;
    remove: string;
  };
  /** Rendered before the level field — the group editor's party size. */
  leading?: ReactNode;
}) {
  return (
    <div className="flex flex-col gap-3 border-b border-border pb-4 sm:flex-row sm:items-start sm:gap-3">
      {leading}

      <label className="flex min-w-0 flex-1 flex-col gap-1.5">
        <span className={RATE_FIELD_LABEL_ROW}>{labels.level}</span>
        <select
          value={value.classLevelId}
          onChange={(e) => onChange({ classLevelId: e.target.value })}
          className={CONTROL}
        >
          {classLevels.map((opt) => (
            <option key={opt.id} value={opt.id}>
              {pickLabel(opt)}
            </option>
          ))}
        </select>
      </label>

      <label className="flex min-w-0 flex-1 flex-col gap-1.5">
        <span className={RATE_FIELD_LABEL_ROW}>{labels.type}</span>
        <select
          value={value.classTypeId}
          onChange={(e) => onChange({ classTypeId: e.target.value })}
          className={CONTROL}
        >
          {classTypes.map((opt) => (
            <option key={opt.id} value={opt.id}>
              {pickLabel(opt)}
            </option>
          ))}
        </select>
      </label>

      <label className="flex w-full flex-col gap-1.5 sm:w-[7.5rem] sm:flex-none">
        <span className={RATE_FIELD_LABEL_ROW}>{labels.duration}</span>
        <select
          value={value.durationMin}
          onChange={(e) => onChange({ durationMin: Number.parseInt(e.target.value, 10) })}
          className={CONTROL}
        >
          {durations.map((d) => (
            <option key={d} value={d}>
              {d} min
            </option>
          ))}
        </select>
      </label>

      <div className="flex min-w-0 flex-1 flex-col gap-1.5 sm:min-w-[11rem] sm:max-w-sm">
        <span className={RATE_FIELD_LABEL_ROW}>{labels.rate}</span>
        <input
          type="text"
          inputMode="numeric"
          pattern="[0-9]*"
          value={value.rateYenInput}
          onChange={(e) => onChange({ rateYenInput: e.target.value.replace(/\D/g, "") })}
          placeholder={ratePlaceholder}
          aria-invalid={rateError ? true : undefined}
          className={`${CONTROL} max-w-full sm:max-w-none ${
            rateError ? "border-[var(--app-danger)] focus:border-[var(--app-danger)]" : ""
          }`}
        />
        {/* One slot: the breakdown explains an acceptable rate, the error
            replaces it when there is nothing worth breaking down. */}
        <div className={RATE_BREAKDOWN_SLOT}>
          {rateError ? (
            <p className="text-xs text-destructive">{rateError}</p>
          ) : (
            <TeacherLessonRateTaxBreakdown
              basis={ratePriceBasis}
              rateYenInput={value.rateYenInput}
            />
          )}
        </div>
      </div>

      <div className="flex flex-col gap-1.5 sm:shrink-0">
        <span className={`${RATE_FIELD_LABEL_ROW} hidden sm:flex`} aria-hidden />
        <button
          type="button"
          onClick={onRemove}
          className="inline-flex h-10 min-h-[2.5rem] w-full shrink-0 items-center justify-center rounded-full border border-border px-3 text-xs font-semibold text-foreground hover:bg-[var(--app-hover)] sm:w-auto"
        >
          {labels.remove}
        </button>
      </div>
    </div>
  );
}
