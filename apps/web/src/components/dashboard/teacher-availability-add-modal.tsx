"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { luxonWeekdayMod7FromDayKey } from "@/lib/availability-editor";
import { weekdayLabel } from "@/lib/weekdays";
import { buttonClasses } from "@/components/ui/button";
import { Field, Input, Select } from "@/components/ui/field";
import { InlineAlert } from "@/components/ui/inline-alert";
import { ModalShell } from "@/components/ui/modal-shell";
import {
  availabilityWindowEndDayKey,
  isBelowBookingLeadTime,
  todayDayKey,
} from "@/lib/availability-window";

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
  /** Reserves the slot for one student; null means open to everyone. */
  assignedStudentId: string | null;
};

export type AssignableStudentOption = { id: string; label: string };

export type TeacherLessonOfferingOption = {
  id: string;
  durationMin: number;
  rateYen: number;
  isGroup: boolean;
  groupSize: number | null;
  isFreeTrial?: boolean;
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
  /**
   * Seeds the form from an existing slot. Absent means a new one, which is the
   * only difference between adding and editing — the fields are the same, and
   * were once written out a second time below the calendar to say so.
   */
  initialDraft?: TeacherAvailabilityAddModalDraft | null;
  /** Offered only when editing; the calendar owns what removal means. */
  onRemove?: (() => void) | null;
  removeLabel?: string;
  title: string;
  subtitle: string;
  cancelLabel: string;
  confirmLabel: string;
  dayOfWeekLabel: string;
  startLabel: string;
  endLabel: string;
  timezoneLabel: string;
  classLevels: TaxonomyOption[];
  /** The teacher's own students, for reserving a slot. */
  assignableStudents?: AssignableStudentOption[];
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
  initialDraft = null,
  onRemove = null,
  removeLabel,
  title,
  subtitle,
  cancelLabel,
  confirmLabel,
  dayOfWeekLabel,
  startLabel,
  endLabel,
  timezoneLabel,
  classLevels,
  assignableStudents = [],
  classTypes,
  lessonOfferings,
}: InnerProps) {
  const tModal = useTranslations("dashboard.teacherAvailability");
  const defaultOffering = lessonOfferings[0];
  const [weeklyOnCalendarDay, setWeeklyOnCalendarDay] = useState(
    initialDraft?.recurrence === "WEEKLY",
  );
  const [draft, setDraft] = useState<TeacherAvailabilityAddModalDraft>(() => initialDraft ?? ({
    dayOfWeek: luxonWeekdayMod7FromDayKey(dayKey, initialTimezone),
    startMin: 9 * 60,
    endMin: 9 * 60 + (defaultOffering?.durationMin ?? 60),
    timezone: initialTimezone,
    recurrence: "ONE_OFF",
    startsOn: dayKey,
    endsOn: null,
    assignedStudentId: null,
    classLevelId: defaultOffering?.classLevelId ?? classLevels[0]?.id ?? "",
    classTypeId: defaultOffering?.classTypeId ?? classTypes[0]?.id ?? "",
    teacherLessonOfferingId: defaultOffering?.id ?? "",
  }));

  const noTaxonomy = classLevels.length === 0 || classTypes.length === 0 || lessonOfferings.length === 0;
  const invalidDateRange = Boolean(draft.startsOn && draft.endsOn && draft.startsOn > draft.endsOn);
  // The same ceiling the API enforces, so the picker cannot offer a date the
  // save would then reject.
  const windowEndDayKey = availabilityWindowEndDayKey(new Date(), draft.timezone);
  const earliestDayKey = todayDayKey(new Date(), draft.timezone);
  // A day inside the booking lead time is still worth publishing — a teacher can
  // book it for a student who called — so it is flagged, not blocked.
  const belowLeadTime = isBelowBookingLeadTime(
    draft.startsOn ?? dayKey,
    new Date(),
    draft.timezone,
  );
  const windowHint = tModal("availabilityWindowHint", { date: windowEndDayKey });
  const dateHint = belowLeadTime ? tModal("belowLeadTimeHint") : windowHint;
  const offerById = new Map(lessonOfferings.map((offer) => [offer.id, offer]));
  const formatOfferingLabel = (offer: TeacherLessonOfferingOption) => {
    // A trial is its own kind of slot, not a class at a price of zero — naming
    // the level and type here would read as a discounted conversation lesson.
    if (offer.isFreeTrial) {
      return `${tModal("freeTrialOffering")} (${offer.durationMin} min)`;
    }
    const level = offer.classLevel ? pickLabel(offer.classLevel, locale) : "";
    const type = offer.classType ? pickLabel(offer.classType, locale) : "";
    // rateYen is what one student pays, for a group class as much as a private
    // one — so a group offer names the seat price and the seat count, not a
    // figure that could be read as the price of the whole class.
    const rate = `¥${offer.rateYen.toLocaleString()}`;
    const price =
      offer.isGroup && offer.groupSize
        ? `${rate}/student, max ${offer.groupSize}`
        : rate;
    return `${level} / ${type} (${offer.durationMin} min, ${price})`;
  };

  return (
    <>
      <h3 id="teacher-availability-add-title" className="text-lg font-semibold text-foreground">
        {title}
      </h3>
      <p className="mt-1 text-sm text-muted">{subtitle}</p>

        <div className="mt-4 space-y-2 border-b border-border pb-3">
          <div className="flex items-center gap-3">
            <p id="weekly-recurring-label" className="text-sm font-medium text-foreground">
              {tModal("repeatWeeklyLabel")}
            </p>
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
              className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border border-transparent leading-none transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary ${
                weeklyOnCalendarDay ? "bg-primary" : "bg-border"
              }`}
            >
              <span
                className={`pointer-events-none absolute left-0.5 top-1/2 h-4 w-4 -translate-y-1/2 rounded-full bg-surface shadow transition-transform ${
                  weeklyOnCalendarDay ? "translate-x-[1.125rem]" : "translate-x-0"
                }`}
                aria-hidden
              />
            </button>
          </div>
          <p className="text-xs text-muted">{tModal("repeatWeeklyHint")}</p>
        </div>

        {/*
          Ten controls, each a `<label className="text-xs text-muted">` wrapping
          its input with a hand-written class string — a smaller, lighter label
          than every other form in the app, and one of them ("Class offer") was
          still hardcoded English. The read-only mirrors of the chosen offer are
          `disabled`, not `readOnly`: they are derived, never editable, so they
          should not be tab stops either.
        */}
        <div className="mt-4 space-y-4">
          {weeklyOnCalendarDay ? (
            <>
              <Field label={dayOfWeekLabel}>
                {(field) => (
                  <Select {...field} value={draft.dayOfWeek} disabled>
                    {Array.from({ length: 7 }, (_, i) => (
                      <option key={i} value={i}>
                        {weekdayLabel(i, locale)}
                      </option>
                    ))}
                  </Select>
                )}
              </Field>
              <div className="grid gap-4 sm:grid-cols-2">
                <Field
                  label={tModal("fromDate")}
                  hint={dateHint}
                  hintTone={belowLeadTime ? "notice" : "muted"}
                >
                  {(field) => (
                    <Input
                      {...field}
                      type="date"
                      min={earliestDayKey}
                      max={windowEndDayKey}
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
                    />
                  )}
                </Field>
                <Field
                  label={tModal("untilDate")}
                  hint={tModal("weeklyDateRangeHint")}
                  error={invalidDateRange ? tModal("invalidDateRange") : null}
                >
                  {(field) => (
                    <Input
                      {...field}
                      type="date"
                      min={earliestDayKey}
                      max={windowEndDayKey}
                      value={draft.endsOn ?? ""}
                      onChange={(e) =>
                        setDraft((d) => ({ ...d, endsOn: e.target.value || null }))
                      }
                    />
                  )}
                </Field>
              </div>
            </>
          ) : (
            <Field
              label={tModal("date")}
              hint={dateHint}
              hintTone={belowLeadTime ? "notice" : "muted"}
            >
              {(field) => (
                <Input
                  {...field}
                  type="date"
                  min={earliestDayKey}
                  max={windowEndDayKey}
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
                />
              )}
            </Field>
          )}

          {assignableStudents.length > 0 ? (
            <Field label={tModal("reservedForLabel")} hint={tModal("reservedForHint")}>
              {(field) => (
                <Select
                  {...field}
                  value={draft.assignedStudentId ?? ""}
                  onChange={(e) =>
                    setDraft((d) => ({ ...d, assignedStudentId: e.target.value || null }))
                  }
                >
                  <option value="">{tModal("reservedForEveryone")}</option>
                  {assignableStudents.map((student) => (
                    <option key={student.id} value={student.id}>
                      {student.label}
                    </option>
                  ))}
                </Select>
              )}
            </Field>
          ) : null}

          <div className="grid gap-4 sm:grid-cols-2">
            <Field label={startLabel}>
              {(field) => (
                <Input
                  {...field}
                  type="time"
                  value={toTime(draft.startMin)}
                  onChange={(e) =>
                    setDraft((d) => {
                      const startMin = parseTime(e.target.value);
                      const offer = offerById.get(d.teacherLessonOfferingId);
                      return {
                        ...d,
                        startMin,
                        endMin: startMin + (offer?.durationMin ?? d.endMin - d.startMin),
                      };
                    })
                  }
                />
              )}
            </Field>
            <Field
              label={endLabel}
              hint={tModal("endTimeHint")}
              error={draft.endMin <= draft.startMin ? tModal("invalidTimeRange") : null}
            >
              {(field) => (
                <Input {...field} type="time" value={toTime(draft.endMin)} readOnly />
              )}
            </Field>
          </div>

          {/* `var(--app-warning, #d97706)` is not a token — only
              `--app-warning-bg/border/text` exist — so this always fell through
              to a hardcoded hue. It is an alert, and there is one of those. */}
          {noTaxonomy ? (
            <InlineAlert variant="warning">{tModal("taxonomyMissingWarning")}</InlineAlert>
          ) : null}

          <Field label={tModal("classOffer")}>
            {(field) => (
              <Select
                {...field}
                required
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
              >
                {lessonOfferings.length === 0 ? <option value="">—</option> : null}
                {lessonOfferings.map((offer) => (
                  <option key={offer.id} value={offer.id}>
                    {formatOfferingLabel(offer)}
                  </option>
                ))}
              </Select>
            )}
          </Field>

          <div className="grid gap-4 sm:grid-cols-2">
            <Field label={tModal("lessonLevel")}>
              {(field) => (
                <Input
                  {...field}
                  disabled
                  value={pickLabel(
                    offerById.get(draft.teacherLessonOfferingId)?.classLevel ?? null,
                    locale,
                  )}
                />
              )}
            </Field>
            <Field label={tModal("lessonType")}>
              {(field) => (
                <Input
                  {...field}
                  disabled
                  value={pickLabel(
                    offerById.get(draft.teacherLessonOfferingId)?.classType ?? null,
                    locale,
                  )}
                />
              )}
            </Field>
          </div>

          <Field label={timezoneLabel}>
            {(field) => (
              <Input
                {...field}
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
              />
            )}
          </Field>
        </div>

        <div className="mt-6 flex flex-wrap items-center gap-2">
          {onRemove ? (
            <button
              type="button"
              onClick={() => {
                onRemove();
                onClose();
              }}
              className={buttonClasses({ variant: "destructive" })}
            >
              {removeLabel}
            </button>
          ) : null}
          <button
            type="button"
            onClick={onClose}
            className={buttonClasses({ variant: "secondary", className: "ml-auto" })}
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
            className={buttonClasses({ size: "md" })}
          >
            {confirmLabel}
          </button>
        </div>
    </>
  );
}

export function TeacherAvailabilityAddModal(props: Props) {
  if (!props.dayKey) return null;

  return (
    <ModalShell
      open={props.open}
      onClose={props.onClose}
      labelledBy="teacher-availability-add-title"
      dismissLabel={props.cancelLabel}
    >
      <TeacherAvailabilityAddModalInner {...props} dayKey={props.dayKey} />
    </ModalShell>
  );
}
