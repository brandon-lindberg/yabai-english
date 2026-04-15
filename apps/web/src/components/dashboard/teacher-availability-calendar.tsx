"use client";

import { useLocale, useTranslations } from "next-intl";
import { useCallback, useEffect, useMemo, useState } from "react";
import { buildUpcomingSlotOptions } from "@/lib/availability";
import {
  AVAILABILITY_LESSON_LEVELS,
  AVAILABILITY_LESSON_TYPES,
  formatAvailabilitySlotMeta,
} from "@/lib/availability-slot-lesson-meta";
import { weekdayLabel } from "@/lib/weekdays";
import { TeacherAvailabilityAddModal } from "@/components/dashboard/teacher-availability-add-modal";
import { TeacherAvailabilityRemoveModal } from "@/components/dashboard/teacher-availability-remove-modal";
import {
  TeacherAvailabilityGoogleMonth,
  type MonthDaySlotChip,
} from "@/components/dashboard/teacher-availability-google-month";
import { TeacherAvailabilityTimeGridDay } from "@/components/dashboard/teacher-availability-time-grid-day";
import { TeacherAvailabilityTimeGridWeek } from "@/components/dashboard/teacher-availability-time-grid-week";
import { SlotSelectionCalendar } from "@/components/slot-selection-calendar";
import {
  buildMonthCells,
  buildWeekdayColumnHeaders,
  buildWeekDays,
  dayKeyFromIso,
  hasSlotMatchingAnchorDay,
} from "@/lib/slot-calendar";
import { placeSlotsOnDayColumn, placeSlotsOnWeekGrid } from "@/lib/time-grid-week";
import { teacherAvailabilitySchema } from "@/lib/teacher-availability";
import type { CalendarViewMode } from "@/lib/calendar-view";

export type InitialTeacherAvailabilitySlot = {
  id: string;
  dayOfWeek: number;
  startMin: number;
  endMin: number;
  timezone: string;
  lessonLevel: string;
  lessonType: string;
  lessonTypeCustom: string | null;
};

type Props = {
  initialSlots: InitialTeacherAvailabilitySlot[];
  initialOccurrenceSkips: string[];
  defaultTimezone: string;
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

function newRuleId() {
  return `new_${Math.random().toString(36).slice(2, 11)}`;
}

export function TeacherAvailabilityCalendar({
  initialSlots,
  initialOccurrenceSkips,
  defaultTimezone,
}: Props) {
  const locale = useLocale();
  const t = useTranslations("dashboard.teacherAvailability");
  const td = useTranslations("dashboard");
  const tSlotMeta = useTranslations("lessonSlotMeta");
  const [rules, setRules] = useState<InitialTeacherAvailabilitySlot[]>(initialSlots);
  const [occurrenceSkips, setOccurrenceSkips] = useState<string[]>(initialOccurrenceSkips);
  const [calendarView, setCalendarView] = useState<CalendarViewMode>("month");
  const [calendarAnchor, setCalendarAnchor] = useState(new Date().toISOString());
  const [selectedRuleId, setSelectedRuleId] = useState<string | null>(null);
  const [selectedStartsAtIso, setSelectedStartsAtIso] = useState<string | null>(null);
  const [status, setStatus] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [monthAddDayKey, setMonthAddDayKey] = useState<string | null>(null);
  const [removeOpen, setRemoveOpen] = useState(false);
  const [removeBusy, setRemoveBusy] = useState(false);
  const [removeError, setRemoveError] = useState<string | null>(null);
  const [saveErrorMessage, setSaveErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    setOccurrenceSkips(initialOccurrenceSkips);
  }, [initialOccurrenceSkips]);

  const teacherTz = rules[0]?.timezone ?? defaultTimezone;

  const skipSet = useMemo(() => new Set(occurrenceSkips), [occurrenceSkips]);

  const addForDayKey = useCallback((dayKey: string) => {
    setMonthAddDayKey(dayKey);
  }, []);

  const calendarSlots = useMemo(() => {
    const expanded = buildUpcomingSlotOptions({
      availabilitySlots: rules.map((r) => ({
        id: r.id,
        dayOfWeek: r.dayOfWeek,
        startMin: r.startMin,
        endMin: r.endMin,
        timezone: r.timezone,
        lessonLevel: r.lessonLevel,
        lessonType: r.lessonType,
        lessonTypeCustom: r.lessonTypeCustom,
      })),
      viewerTimezone: teacherTz,
      horizonDays: 365,
      minimumLeadHours: 0,
      allowPastInstances: true,
      skippedStartsAtIso: skipSet,
      formatLessonMeta: (slot) =>
        formatAvailabilitySlotMeta(
          slot,
          (k) => tSlotMeta(`levels.${k}`),
          (k) => tSlotMeta(`types.${k}`),
        ),
    });
    return expanded.map((s) => ({
      startsAtIso: s.startsAtIso,
      endsAtIso: s.endsAtIso,
      label: s.label,
      groupKey: s.slotId,
    }));
  }, [rules, teacherTz, skipSet, tSlotMeta]);

  const anchorDayKey = useMemo(() => dayKeyFromIso(calendarAnchor), [calendarAnchor]);

  const dayBlocks = useMemo(
    () => placeSlotsOnDayColumn(anchorDayKey, calendarSlots),
    [anchorDayKey, calendarSlots],
  );

  const monthCells = useMemo(() => buildMonthCells(calendarAnchor, locale), [calendarAnchor, locale]);
  const monthWeekdayHeaders = useMemo(() => buildWeekdayColumnHeaders(locale), [locale]);

  const slotsByDayForMonth = useMemo(() => {
    const m = new Map<string, MonthDaySlotChip[]>();
    for (const s of calendarSlots) {
      const dk = dayKeyFromIso(s.startsAtIso);
      const chip: MonthDaySlotChip = {
        startsAtIso: s.startsAtIso,
        endsAtIso: s.endsAtIso,
        label: s.label,
        groupKey: s.groupKey,
      };
      const list = m.get(dk);
      if (list) list.push(chip);
      else m.set(dk, [chip]);
    }
    for (const list of m.values()) {
      list.sort((a, b) => a.startsAtIso.localeCompare(b.startsAtIso));
    }
    return m;
  }, [calendarSlots]);

  const weekDays = useMemo(() => buildWeekDays(calendarAnchor, locale), [calendarAnchor, locale]);

  const blocksByDay = useMemo(
    () => placeSlotsOnWeekGrid(weekDays.map((d) => d.dayKey), calendarSlots),
    [weekDays, calendarSlots],
  );

  const weekTimeGrid = useMemo(
    () => (
      <TeacherAvailabilityTimeGridWeek
        locale={locale}
        weekDays={weekDays}
        blocksByDay={blocksByDay}
        selectedStartsAtIso={selectedStartsAtIso}
        selectedGroupKey={selectedRuleId}
        onSelectSlot={(iso, groupKey) => {
          setSelectedStartsAtIso(iso);
          setSelectedRuleId(groupKey ?? null);
        }}
        onCalendarAnchorChange={setCalendarAnchor}
        weekColumnAddLabel={t("addForDay")}
        onAddForDayKey={addForDayKey}
        selectionStyle="neutral"
      />
    ),
    [
      locale,
      weekDays,
      blocksByDay,
      selectedStartsAtIso,
      selectedRuleId,
      t,
      addForDayKey,
    ],
  );

  const selectedRule = selectedRuleId ? rules.find((r) => r.id === selectedRuleId) : undefined;

  const invalidSlotRanges = useMemo(
    () => rules.some((r) => r.endMin <= r.startMin),
    [rules],
  );

  const hasInvalidLessonMeta = useMemo(
    () =>
      rules.some(
        (r) => r.lessonType === "custom" && !(r.lessonTypeCustom ?? "").trim(),
      ),
    [rules],
  );

  const hasSlotsOnFocusDay = useMemo(
    () => hasSlotMatchingAnchorDay(calendarSlots, calendarAnchor),
    [calendarSlots, calendarAnchor],
  );

  const focusDateLabel = useMemo(() => {
    const dk = dayKeyFromIso(calendarAnchor);
    return new Date(`${dk}T12:00:00`).toLocaleDateString(locale, {
      weekday: "long",
      month: "long",
      day: "numeric",
      year: "numeric",
    });
  }, [calendarAnchor, locale]);

  const focusedMonthDayKey = useMemo(
    () =>
      selectedStartsAtIso ? dayKeyFromIso(selectedStartsAtIso) : dayKeyFromIso(calendarAnchor),
    [selectedStartsAtIso, calendarAnchor],
  );

  const dayTimeGrid = useMemo(
    () => (
      <TeacherAvailabilityTimeGridDay
        locale={locale}
        dayKey={anchorDayKey}
        dayHeading={focusDateLabel}
        blocks={dayBlocks}
        selectedStartsAtIso={selectedStartsAtIso}
        selectedGroupKey={selectedRuleId}
        onSelectSlot={(iso, groupKey) => {
          setSelectedStartsAtIso(iso);
          setSelectedRuleId(groupKey ?? null);
        }}
        onCalendarAnchorChange={setCalendarAnchor}
        weekColumnAddLabel={t("addForDay")}
        onAddForDayKey={addForDayKey}
        selectionStyle="neutral"
        emptyLabel={t("noAvailabilityYet")}
        footer={
          <button
            type="button"
            onClick={() => setMonthAddDayKey(anchorDayKey)}
            className="w-full rounded-full border border-border bg-white px-4 py-2 text-sm font-semibold text-foreground hover:bg-zinc-100"
          >
            {t("addForThisDay")}
          </button>
        }
      />
    ),
    [
      locale,
      anchorDayKey,
      focusDateLabel,
      dayBlocks,
      selectedStartsAtIso,
      selectedRuleId,
      t,
      addForDayKey,
    ],
  );

  const monthGoogle = useMemo(
    () => (
      <TeacherAvailabilityGoogleMonth
        locale={locale}
        monthWeekdayHeaders={monthWeekdayHeaders}
        monthCells={monthCells}
        slotsByDay={slotsByDayForMonth}
        focusedDayKey={focusedMonthDayKey}
        selectedStartsAtIso={selectedStartsAtIso}
        selectedGroupKey={selectedRuleId}
        onOpenDay={(dk) => {
          setCalendarAnchor(`${dk}T00:00:00.000Z`);
          setCalendarView("day");
        }}
        onAddForDayKey={addForDayKey}
        addLabel={t("addForDay")}
        onSelectSlot={(iso, groupKey) => {
          setSelectedStartsAtIso(iso);
          setSelectedRuleId(groupKey ?? null);
        }}
        onCalendarAnchorChange={setCalendarAnchor}
        selectionStyle="neutral"
      />
    ),
    [
      locale,
      monthWeekdayHeaders,
      monthCells,
      slotsByDayForMonth,
      focusedMonthDayKey,
      selectedStartsAtIso,
      selectedRuleId,
      t,
      addForDayKey,
    ],
  );

  function patchSelected(
    patch: Partial<
      Pick<
        InitialTeacherAvailabilitySlot,
        | "dayOfWeek"
        | "startMin"
        | "endMin"
        | "timezone"
        | "lessonLevel"
        | "lessonType"
        | "lessonTypeCustom"
      >
    >,
  ) {
    if (!selectedRuleId) return;
    setRules((prev) => prev.map((r) => (r.id === selectedRuleId ? { ...r, ...patch } : r)));
  }

  function removeEntireWeeklyRule() {
    if (!selectedRuleId) return;
    setRules((prev) => prev.filter((r) => r.id !== selectedRuleId));
    setSelectedRuleId(null);
    setSelectedStartsAtIso(null);
  }

  async function removeThisOccurrenceOnly() {
    if (!selectedRuleId || !selectedStartsAtIso) return;
    setRemoveBusy(true);
    setRemoveError(null);
    try {
      const res = await fetch("/api/teacher/availability/occurrence-skips", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ slotId: selectedRuleId, startsAtIso: selectedStartsAtIso }),
      });
      if (!res.ok) {
        setRemoveError(t("removeOccurrenceFailed"));
        return;
      }
      setOccurrenceSkips((prev) =>
        prev.includes(selectedStartsAtIso) ? prev : [...prev, selectedStartsAtIso],
      );
      setRemoveOpen(false);
      setSelectedRuleId(null);
      setSelectedStartsAtIso(null);
    } finally {
      setRemoveBusy(false);
    }
  }

  async function save() {
    setSaveErrorMessage(null);
    if (invalidSlotRanges) {
      setStatus("error");
      setSaveErrorMessage(t("invalidTimeRange"));
      return;
    }
    if (hasInvalidLessonMeta) {
      setStatus("error");
      setSaveErrorMessage(t("invalidLessonMeta"));
      return;
    }
    const payload = rules.map((r) => ({
      dayOfWeek: r.dayOfWeek,
      startMin: r.startMin,
      endMin: r.endMin,
      timezone: r.timezone,
      lessonLevel: r.lessonLevel,
      lessonType: r.lessonType,
      lessonTypeCustom: r.lessonType === "custom" ? r.lessonTypeCustom : null,
    }));
    const parsed = teacherAvailabilitySchema.safeParse(payload);
    if (!parsed.success) {
      setStatus("error");
      setSaveErrorMessage(t("invalidLessonMeta"));
      return;
    }

    setStatus("saving");
    const response = await fetch("/api/teacher/availability", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    if (!response.ok) {
      setStatus("error");
      setSaveErrorMessage(t("error"));
      return;
    }
    setStatus("saved");
    setSaveErrorMessage(null);
    setTimeout(() => setStatus("idle"), 2000);
  }

  return (
    <section className="space-y-4 rounded-2xl border border-border bg-surface p-4">
      <h2 className="text-lg font-semibold text-foreground">{t("sectionTitle")}</h2>

      {hasSlotsOnFocusDay ? (
        <div className="rounded-lg border border-border bg-muted/20 px-3 py-3">
          <h3 className="text-sm font-semibold text-foreground">
            {t("currentAvailabilityForDate", { date: focusDateLabel })}
          </h3>
          <p className="mt-1 text-sm text-muted">
            {selectedRule && selectedStartsAtIso
              ? t("editingOccurrence", {
                  time: new Date(selectedStartsAtIso).toLocaleString(locale, {
                    weekday: "short",
                    month: "short",
                    day: "numeric",
                    hour: "2-digit",
                    minute: "2-digit",
                  }),
                })
              : t("currentAvailabilityPickHint")}
          </p>
        </div>
      ) : null}

      <SlotSelectionCalendar
        variant="embedded"
        weekViewReplacement={weekTimeGrid}
        dayViewReplacement={dayTimeGrid}
        monthViewReplacement={monthGoogle}
        locale={locale}
        copy={{
          noAvailabilityYet: t("noAvailabilityYet"),
          unavailableShort: t("emptyDay"),
          calendarDay: td("calendarDay"),
          calendarWeek: td("calendarWeek"),
          calendarMonth: td("calendarMonth"),
          previous: td("previous"),
          next: td("next"),
        }}
        slots={calendarSlots}
        calendarView={calendarView}
        onCalendarViewChange={setCalendarView}
        calendarAnchor={calendarAnchor}
        onCalendarAnchorChange={setCalendarAnchor}
        selectedStartsAtIso={selectedStartsAtIso}
        selectedGroupKey={selectedRuleId}
        onSelectSlot={(iso, groupKey) => {
          setSelectedStartsAtIso(iso);
          setSelectedRuleId(groupKey ?? null);
        }}
        selectionStyle="neutral"
        weekColumnAddLabel={t("addForDay")}
        onAddForDayKey={addForDayKey}
      />

      <TeacherAvailabilityAddModal
        open={monthAddDayKey !== null}
        dayKey={monthAddDayKey}
        locale={locale}
        initialTimezone={teacherTz}
        onClose={() => setMonthAddDayKey(null)}
        onConfirm={(draft) => {
          setRules((prev) => [...prev, { id: newRuleId(), ...draft }]);
          setSelectedRuleId(null);
          setSelectedStartsAtIso(null);
        }}
        title={t("monthAddModalTitle")}
        subtitle={
          monthAddDayKey
            ? t("monthAddModalSubtitle", {
                date: new Date(`${monthAddDayKey}T12:00:00`).toLocaleDateString(locale, {
                  weekday: "long",
                  month: "long",
                  day: "numeric",
                  year: "numeric",
                }),
              })
            : ""
        }
        cancelLabel={t("monthAddModalCancel")}
        confirmLabel={t("monthAddModalConfirm")}
        dayOfWeekLabel={t("dayOfWeek")}
        startLabel={t("start")}
        endLabel={t("end")}
        timezoneLabel={t("timezone")}
      />

      {selectedRule ? (
        <div className="space-y-3 rounded-xl border border-border bg-background p-3">
          <label className="block text-xs text-muted">
            {t("dayOfWeek")}
            <select
              value={selectedRule.dayOfWeek}
              onChange={(e) => patchSelected({ dayOfWeek: Number(e.target.value) })}
              className="mt-1 w-full rounded-lg border border-border bg-background px-2 py-1 text-sm text-foreground sm:max-w-xs"
            >
              {Array.from({ length: 7 }, (_, i) => (
                <option key={i} value={i}>
                  {weekdayLabel(i, locale)}
                </option>
              ))}
            </select>
          </label>
          <div className="grid gap-3 sm:grid-cols-3">
          <label className="text-xs text-muted">
            {t("start")}
            <input
              type="time"
              value={toTime(selectedRule.startMin)}
              onChange={(e) => patchSelected({ startMin: parseTime(e.target.value) })}
              className="mt-1 w-full rounded-lg border border-border bg-background px-2 py-1 text-sm text-foreground"
            />
          </label>
          <label className="text-xs text-muted">
            {t("end")}
            <input
              type="time"
              value={toTime(selectedRule.endMin)}
              onChange={(e) => patchSelected({ endMin: parseTime(e.target.value) })}
              className={`mt-1 w-full rounded-lg border bg-background px-2 py-1 text-sm text-foreground ${
                selectedRule.endMin <= selectedRule.startMin
                  ? "border-destructive"
                  : "border-border"
              }`}
            />
          </label>
          <label className="text-xs text-muted">
            {t("timezone")}
            <input
              value={selectedRule.timezone}
              onChange={(e) => patchSelected({ timezone: e.target.value })}
              className="mt-1 w-full rounded-lg border border-border bg-background px-2 py-1 text-sm text-foreground"
            />
          </label>
          </div>
          {selectedRule.endMin <= selectedRule.startMin ? (
            <p className="text-sm text-destructive">{t("invalidTimeRange")}</p>
          ) : null}
          <label className="block text-xs text-muted">
            {t("lessonLevel")}
            <select
              value={selectedRule.lessonLevel}
              onChange={(e) => patchSelected({ lessonLevel: e.target.value })}
              className="mt-1 w-full rounded-lg border border-border bg-background px-2 py-1 text-sm text-foreground sm:max-w-xs"
            >
              {AVAILABILITY_LESSON_LEVELS.map((key) => (
                <option key={key} value={key}>
                  {tSlotMeta(`levels.${key}`)}
                </option>
              ))}
            </select>
          </label>
          <label className="block text-xs text-muted">
            {t("lessonType")}
            <select
              value={selectedRule.lessonType}
              onChange={(e) => {
                const lessonType = e.target.value;
                patchSelected({
                  lessonType,
                  lessonTypeCustom: lessonType === "custom" ? selectedRule.lessonTypeCustom : null,
                });
              }}
              className="mt-1 w-full rounded-lg border border-border bg-background px-2 py-1 text-sm text-foreground sm:max-w-xs"
            >
              {AVAILABILITY_LESSON_TYPES.map((key) => (
                <option key={key} value={key}>
                  {tSlotMeta(`types.${key}`)}
                </option>
              ))}
            </select>
          </label>
          {selectedRule.lessonType === "custom" ? (
            <label className="block text-xs text-muted">
              {t("customLessonType")}
              <input
                value={selectedRule.lessonTypeCustom ?? ""}
                onChange={(e) =>
                  patchSelected({ lessonTypeCustom: e.target.value || null })
                }
                placeholder={t("customLessonTypePlaceholder")}
                className="mt-1 w-full rounded-lg border border-border bg-background px-2 py-1 text-sm text-foreground"
              />
            </label>
          ) : null}
          {selectedRule.lessonType === "custom" && !(selectedRule.lessonTypeCustom ?? "").trim() ? (
            <p className="text-sm text-destructive">{t("invalidLessonMeta")}</p>
          ) : null}
        </div>
      ) : null}

      <div className="flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={() => {
            setRemoveError(null);
            setRemoveOpen(true);
          }}
          disabled={!selectedRuleId}
          className="rounded-full border border-destructive/40 px-4 py-2 text-sm font-semibold text-destructive hover:bg-destructive/5 disabled:opacity-40"
        >
          {t("removeRule")}
        </button>
        <button
          type="button"
          onClick={() => void save()}
          disabled={status === "saving" || invalidSlotRanges || hasInvalidLessonMeta}
          className="rounded-full bg-foreground px-4 py-2 text-sm font-semibold text-background hover:opacity-90 disabled:opacity-50"
        >
          {status === "saving" ? t("saving") : t("save")}
        </button>
        {status === "saved" ? (
          <span className="text-sm text-green-600 dark:text-green-400">{t("saved")}</span>
        ) : null}
        {status === "error" ? (
          <span className="text-sm text-destructive">{saveErrorMessage ?? t("error")}</span>
        ) : null}
      </div>

      <TeacherAvailabilityRemoveModal
        open={removeOpen}
        onClose={() => {
          setRemoveOpen(false);
          setRemoveError(null);
        }}
        canRemoveThisOccurrence={Boolean(selectedRuleId && selectedStartsAtIso)}
        busy={removeBusy}
        error={removeError}
        title={t("removeDialogTitle")}
        description={t("removeDialogDescription")}
        thisOccurrenceLabel={t("removeThisOccurrence")}
        allSeriesLabel={t("removeAllSeries")}
        cancelLabel={t("removeDialogCancel")}
        onThisOccurrence={() => void removeThisOccurrenceOnly()}
        onAllSeries={removeEntireWeeklyRule}
      />
    </section>
  );
}
