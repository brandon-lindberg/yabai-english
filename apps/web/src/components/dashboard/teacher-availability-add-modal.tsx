"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { luxonWeekdayMod7FromDayKey } from "@/lib/availability-editor";
import { weekdayLabel } from "@/lib/weekdays";

export type TaxonomyOption = {
  id: string;
  code: string;
  labelEn: string;
  labelJa: string | null;
};

export type TeacherAvailabilityAddModalDraft = {
  dayOfWeek: number;
  startMin: number;
  endMin: number;
  timezone: string;
  recurrence: "WEEKLY" | "ONE_OFF";
  startsOn: string | null;
  endsOn: string | null;
  classLevelId: string;
  classTypeId: string;
  teacherLessonOfferingId: string;
};

export type TeacherLessonOfferingOption = {
  id: string;
  durationMin: number;
  rateYen: number;
  isGroup: boolean;
  groupSize: number | null;
  classLevelId: string | null;
  classTypeId: string | null;
  classLevel: TaxonomyOption | null;
  classType: TaxonomyOption | null;
};

type Props = {
  open: boolean;
  dayKey: string | null;
  locale: string;
  initialTimezone: string;
  onClose: () => void;
  onConfirm: (draft: TeacherAvailabilityAddModalDraft) => void;
  title: string;
  subtitle: string;
  cancelLabel: string;
  confirmLabel: string;
  dayOfWeekLabel: string;
  startLabel: string;
  endLabel: string;
  timezoneLabel: string;
  classLevels: TaxonomyOption[];
  classTypes: TaxonomyOption[];
  lessonOfferings: TeacherLessonOfferingOption[];
};

function toTime(min: number) {
  const h = String(Math.floor(min / 60)).padStart(2, "0");
  const m = String(min % 60).padStart(2, "0");
  return `${h}:${m}`;
}

function parseTime(value: string) {
  const [h, m] = value.split(":").map((v) => Number(v));
  if (!Number.isFinite(h) || !Number.isFinite(m)) return 0;
  return h * 60 + m;
}

function pickLabel(opt: TaxonomyOption | null | undefined, locale: string): string {
  if (!opt) return "";
  return locale.toLowerCase().startsWith("ja")
    ? (opt.labelJa ?? opt.labelEn)
    : opt.labelEn;
}

type InnerProps = Omit<Props, "open"> & { dayKey: string };

function TeacherAvailabilityAddModalInner({
  dayKey,
  locale,
  initialTimezone,
  onClose,
  onConfirm,
  title,
  subtitle,
  cancelLabel,
  confirmLabel,
  dayOfWeekLabel,
  startLabel,
  endLabel,
  timezoneLabel,
  classLevels,
  classTypes,
  lessonOfferings,
}: InnerProps) {
  const tModal = useTranslations("dashboard.teacherAvailability");
  const defaultOffering = lessonOfferings[0];
  const [weeklyOnCalendarDay, setWeeklyOnCalendarDay] = useState(false);
  const [draft, setDraft] = useState<TeacherAvailabilityAddModalDraft>(() => ({
    dayOfWeek: luxonWeekdayMod7FromDayKey(dayKey, initialTimezone),
    startMin: 9 * 60,
    endMin: 9 * 60 + (defaultOffering?.durationMin ?? 60),
    timezone: initialTimezone,
    recurrence: "ONE_OFF",
    startsOn: dayKey,
    endsOn: null,
    classLevelId: defaultOffering?.classLevelId ?? classLevels[0]?.id ?? "",
    classTypeId: defaultOffering?.classTypeId ?? classTypes[0]?.id ?? "",
    teacherLessonOfferingId: defaultOffering?.id ?? "",
  }));

  const noTaxonomy = classLevels.length === 0 || classTypes.length === 0 || lessonOfferings.length === 0;
  const invalidDateRange = Boolean(draft.startsOn && draft.endsOn && draft.startsOn > draft.endsOn);
  const offerById = new Map(lessonOfferings.map((offer) => [offer.id, offer]));
  const formatOfferingLabel = (offer: TeacherLessonOfferingOption) => {
    const level = offer.classLevel ? pickLabel(offer.classLevel, locale) : "";
    const type = offer.classType ? pickLabel(offer.classType, locale) : "";
    const size = offer.isGroup && offer.groupSize ? `, group ${offer.groupSize}` : "";
    return `${level} / ${type} (${offer.durationMin} min, ¥${offer.rateYen.toLocaleString()}${size})`;
  };

  return (
    <>
      <h3 id="teacher-availability-add-title" className="text-lg font-semibold text-foreground">
        {title}
      </h3>
      <p className="mt-1 text-sm text-muted">{subtitle}</p>

        <div className="mt-4 flex items-start justify-between gap-3 border-b border-border pb-3">
          <div className="min-w-0 flex-1">
            <p id="weekly-recurring-label" className="text-sm font-medium text-foreground">
              {tModal("repeatWeeklyLabel")}
            </p>
            <p className="mt-0.5 text-xs text-muted">{tModal("repeatWeeklyHint")}</p>
          </div>
          <button
            type="button"
            role="switch"
            aria-checked={weeklyOnCalendarDay}
            aria-labelledby="weekly-recurring-label"
            onClick={() => {
              setWeeklyOnCalendarDay((on) => {
                const next = !on;
                setDraft((d) => ({
                  ...d,
                  recurrence: next ? "WEEKLY" : "ONE_OFF",
                  startsOn: dayKey,
                  endsOn: next ? d.endsOn : null,
                  dayOfWeek: luxonWeekdayMod7FromDayKey(dayKey, d.timezone),
                }));
                return next;
              });
            }}
            className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border border-transparent transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary ${
              weeklyOnCalendarDay ? "bg-primary" : "bg-zinc-300 dark:bg-zinc-600"
            }`}
          >
            <span
              className={`pointer-events-none absolute top-0.5 left-0.5 h-4 w-4 rounded-full bg-white shadow transition-transform ${
                weeklyOnCalendarDay ? "translate-x-[1.125rem]" : "translate-x-0"
              }`}
              aria-hidden
            />
          </button>
        </div>

        <div className="mt-4 space-y-3">
          {weeklyOnCalendarDay ? (
            <>
              <label className="block text-xs text-muted">
                {dayOfWeekLabel}
                <select
                  value={draft.dayOfWeek}
                  disabled
                  className="mt-1 w-full rounded-lg border border-border bg-background px-2 py-2 text-sm text-foreground disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {Array.from({ length: 7 }, (_, i) => (
                    <option key={i} value={i}>
                      {weekdayLabel(i, locale)}
                    </option>
                  ))}
                </select>
              </label>
              <div className="grid gap-3 sm:grid-cols-2">
                <label className="text-xs text-muted">
                  {tModal("fromDate")}
                  <input
                    type="date"
                    value={draft.startsOn ?? dayKey}
                    onChange={(e) => {
                      const startsOn = e.target.value;
                      setDraft((d) => ({
                        ...d,
                        startsOn,
                        dayOfWeek: startsOn
                          ? luxonWeekdayMod7FromDayKey(startsOn, d.timezone)
                          : d.dayOfWeek,
                      }));
                    }}
                    className="mt-1 w-full rounded-lg border border-border bg-background px-2 py-2 text-sm text-foreground"
                  />
                </label>
                <label className="text-xs text-muted">
                  {tModal("untilDate")}
                  <input
                    type="date"
                    value={draft.endsOn ?? ""}
                    onChange={(e) =>
                      setDraft((d) => ({ ...d, endsOn: e.target.value || null }))
                    }
                    className={`mt-1 w-full rounded-lg border bg-background px-2 py-2 text-sm text-foreground ${
                      invalidDateRange ? "border-destructive" : "border-border"
                    }`}
                  />
                </label>
              </div>
              <p className="text-xs text-muted">{tModal("weeklyDateRangeHint")}</p>
              {invalidDateRange ? (
                <p className="text-sm text-destructive">{tModal("invalidDateRange")}</p>
              ) : null}
            </>
          ) : (
            <label className="block text-xs text-muted">
              {tModal("date")}
              <input
                type="date"
                value={draft.startsOn ?? dayKey}
                onChange={(e) => {
                  const startsOn = e.target.value;
                  setDraft((d) => ({
                    ...d,
                    startsOn,
                    dayOfWeek: startsOn
                      ? luxonWeekdayMod7FromDayKey(startsOn, d.timezone)
                      : d.dayOfWeek,
                  }));
                }}
                className="mt-1 w-full rounded-lg border border-border bg-background px-2 py-2 text-sm text-foreground"
              />
            </label>
          )}
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="text-xs text-muted">
              {startLabel}
              <input
                type="time"
                value={toTime(draft.startMin)}
                onChange={(e) =>
                  setDraft((d) => {
                    const startMin = parseTime(e.target.value);
                    const offer = offerById.get(d.teacherLessonOfferingId);
                    return {
                      ...d,
                      startMin,
                      endMin: offer ? startMin + offer.durationMin : d.endMin,
                    };
                  })
                }
                className="mt-1 w-full rounded-lg border border-border bg-background px-2 py-2 text-sm text-foreground"
              />
            </label>
            <label className="text-xs text-muted">
              {endLabel}
              <input
                type="time"
                value={toTime(draft.endMin)}
                readOnly
                className={`mt-1 w-full rounded-lg border bg-background px-2 py-2 text-sm text-foreground ${
                  draft.endMin <= draft.startMin ? "border-destructive" : "border-border"
                }`}
              />
            </label>
          </div>
          <p className="text-xs text-muted">{tModal("endTimeHint")}</p>
          {draft.endMin <= draft.startMin ? (
            <p className="text-sm text-destructive">{tModal("invalidTimeRange")}</p>
          ) : null}
          {noTaxonomy ? (
            <p className="rounded-lg border border-[var(--app-warning,#d97706)]/40 bg-[var(--app-warning,#d97706)]/10 px-3 py-2 text-xs text-foreground">
              {tModal("taxonomyMissingWarning")}
            </p>
          ) : null}
          <label className="block text-xs text-muted">
            Class offer
            <select
              value={draft.teacherLessonOfferingId}
              onChange={(e) => {
                const offer = offerById.get(e.target.value);
                setDraft((d) => ({
                  ...d,
                  teacherLessonOfferingId: e.target.value,
                  classLevelId: offer?.classLevelId ?? "",
                  classTypeId: offer?.classTypeId ?? "",
                  endMin: offer ? d.startMin + offer.durationMin : d.endMin,
                }));
              }}
              required
              className="mt-1 w-full rounded-lg border border-border bg-background px-2 py-2 text-sm text-foreground"
            >
              {lessonOfferings.length === 0 ? (
                <option value="">—</option>
              ) : null}
              {lessonOfferings.map((offer) => (
                <option key={offer.id} value={offer.id}>
                  {formatOfferingLabel(offer)}
                </option>
              ))}
            </select>
          </label>
          <label className="block text-xs text-muted">
            {tModal("lessonLevel")}
            <input
              value={
                offerById.get(draft.teacherLessonOfferingId)?.classLevel
                  ? pickLabel(offerById.get(draft.teacherLessonOfferingId)?.classLevel ?? null, locale)
                  : ""
              }
              readOnly
              className="mt-1 w-full rounded-lg border border-border bg-background px-2 py-2 text-sm text-muted"
            />
          </label>
          <label className="block text-xs text-muted">
            {tModal("lessonType")}
            <input
              value={
                offerById.get(draft.teacherLessonOfferingId)?.classType
                  ? pickLabel(offerById.get(draft.teacherLessonOfferingId)?.classType ?? null, locale)
                  : ""
              }
              readOnly
              className="mt-1 w-full rounded-lg border border-border bg-background px-2 py-2 text-sm text-muted"
            />
          </label>
          <label className="block text-xs text-muted">
            {timezoneLabel}
            <input
              value={draft.timezone}
              onChange={(e) => {
                const tz = e.target.value;
                setDraft((d) => ({
                  ...d,
                  timezone: tz,
                  ...(tz.trim()
                    ? { dayOfWeek: luxonWeekdayMod7FromDayKey(d.startsOn ?? dayKey, tz) }
                    : {}),
                }));
              }}
              className="mt-1 w-full rounded-lg border border-border bg-background px-2 py-2 text-sm text-foreground"
            />
          </label>
        </div>

        <div className="mt-6 flex flex-wrap justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="rounded-full border border-border px-4 py-2 text-sm font-semibold text-foreground hover:bg-[var(--app-hover)]"
          >
            {cancelLabel}
          </button>
          <button
            type="button"
            disabled={
              draft.endMin <= draft.startMin ||
              invalidDateRange ||
              !draft.classLevelId ||
              !draft.classTypeId ||
              !draft.teacherLessonOfferingId
            }
            onClick={() => {
              onConfirm(draft);
              onClose();
            }}
            className="rounded-full bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:opacity-90 disabled:opacity-40"
          >
            {confirmLabel}
          </button>
        </div>
    </>
  );
}

export function TeacherAvailabilityAddModal(props: Props) {
  useEffect(() => {
    if (!props.open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") props.onClose();
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [props]);

  if (!props.open || !props.dayKey) return null;

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="teacher-availability-add-title"
    >
      <button
        type="button"
        className="absolute inset-0 bg-black/40"
        aria-label={props.cancelLabel}
        onClick={props.onClose}
      />
      <div className="relative z-[101] w-full max-w-md rounded-2xl border border-border bg-surface p-5 shadow-xl">
        <TeacherAvailabilityAddModalInner {...props} dayKey={props.dayKey} />
      </div>
    </div>
  );
}
