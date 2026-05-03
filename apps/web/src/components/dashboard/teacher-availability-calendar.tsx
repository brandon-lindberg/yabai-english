"use client";

import { useLocale, useTranslations } from "next-intl";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useIsMobile } from "@/hooks/use-is-mobile";
import { buildUpcomingSlotOptions } from "@/lib/availability";
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
import { luxonWeekdayMod7FromDayKey } from "@/lib/availability-editor";
import { placeSlotsOnDayColumn, placeSlotsOnWeekGrid } from "@/lib/time-grid-week";
import { teacherAvailabilitySchema } from "@/lib/teacher-availability";
import type { CalendarViewMode } from "@/lib/calendar-view";

type TeacherAvailabilityRecurrence = "WEEKLY" | "ONE_OFF";

export type TaxonomyOption = {
  id: string;
  code: string;
  labelEn: string;
  labelJa: string | null;
};

export type InitialTeacherAvailabilitySlot = {
  id: string;
  dayOfWeek: number;
  startMin: number;
  endMin: number;
  timezone: string;
  recurrence: TeacherAvailabilityRecurrence;
  startsOn: string | null;
  endsOn: string | null;
  classLevelId: string | null;
  classTypeId: string | null;
  classLevel: TaxonomyOption | null;
  classType: TaxonomyOption | null;
};

export type TeacherCalendarBooking = {
  id: string;
  startsAtIso: string;
  endsAtIso: string;
  studentLabel: string;
};

type Props = {
  initialSlots: InitialTeacherAvailabilitySlot[];
  initialOccurrenceSkips: string[];
  defaultTimezone: string;
  classLevels: TaxonomyOption[];
  classTypes: TaxonomyOption[];
  /** Confirmed (or pending-payment) bookings to overlay on the schedule as "booked" blocks. */
  bookings?: TeacherCalendarBooking[];
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
  classLevels,
  classTypes,
  bookings = [],
}: Props) {
  const locale = useLocale();
  const isMobile = useIsMobile();
  const t = useTranslations("dashboard.teacherAvailability");
  const td = useTranslations("dashboard");
  const isJa = locale.toLowerCase().startsWith("ja");
  const pickLabel = useCallback(
    (opt: TaxonomyOption | null | undefined): string =>
      opt ? (isJa ? (opt.labelJa ?? opt.labelEn) : opt.labelEn) : "",
    [isJa],
  );
  const levelById = useMemo(
    () => new Map(classLevels.map((l) => [l.id, l])),
    [classLevels],
  );
  const typeById = useMemo(
    () => new Map(classTypes.map((t) => [t.id, t])),
    [classTypes],
  );
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
    const metaBySlotId = new Map<string, string>();
    for (const r of rules) {
      const lvl = pickLabel(levelById.get(r.classLevelId ?? ""));
      const ty = pickLabel(typeById.get(r.classTypeId ?? ""));
      metaBySlotId.set(r.id, [lvl, ty].filter(Boolean).join(" · "));
    }
    const expanded = buildUpcomingSlotOptions({
      availabilitySlots: rules.map((r) => ({
        id: r.id,
        dayOfWeek: r.dayOfWeek,
        startMin: r.startMin,
        endMin: r.endMin,
        timezone: r.timezone,
        recurrence: r.recurrence,
        startsOn: r.startsOn,
        endsOn: r.endsOn,
        classLevelId: r.classLevelId,
        classTypeId: r.classTypeId,
      })),
      viewerTimezone: teacherTz,
      horizonDays: 365,
      minimumLeadHours: 0,
      allowPastInstances: true,
      skippedStartsAtIso: skipSet,
      formatLessonMeta: (slot) => metaBySlotId.get(slot.id) ?? "",
    });
    return expanded.map((s) => ({
      startsAtIso: s.startsAtIso,
      endsAtIso: s.endsAtIso,
      label: s.label,
      groupKey: s.slotId,
    }));
  }, [rules, teacherTz, skipSet, levelById, typeById, pickLabel]);

  const anchorDayKey = useMemo(() => dayKeyFromIso(calendarAnchor), [calendarAnchor]);

  const bookingGridInputs = useMemo(
    () =>
      bookings.map((b) => ({
        startsAtIso: b.startsAtIso,
        endsAtIso: b.endsAtIso,
        label: b.studentLabel,
        groupKey: `booking-${b.id}`,
        kind: "booking" as const,
        subtitle: b.studentLabel,
      })),
    [bookings],
  );

  const weekAndDayGridInputs = useMemo(
    () => [...calendarSlots, ...bookingGridInputs],
    [calendarSlots, bookingGridInputs],
  );

  const dayBlocks = useMemo(
    () => placeSlotsOnDayColumn(anchorDayKey, weekAndDayGridInputs),
    [anchorDayKey, weekAndDayGridInputs],
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
        kind: "availability",
      };
      const list = m.get(dk);
      if (list) list.push(chip);
      else m.set(dk, [chip]);
    }
    for (const b of bookings) {
      const dk = dayKeyFromIso(b.startsAtIso);
      const chip: MonthDaySlotChip = {
        startsAtIso: b.startsAtIso,
        endsAtIso: b.endsAtIso,
        label: b.studentLabel,
        groupKey: `booking-${b.id}`,
        kind: "booking",
      };
      const list = m.get(dk);
      if (list) list.push(chip);
      else m.set(dk, [chip]);
    }
    for (const list of m.values()) {
      list.sort((a, b) => a.startsAtIso.localeCompare(b.startsAtIso));
    }
    return m;
  }, [calendarSlots, bookings]);

  const weekDays = useMemo(() => buildWeekDays(calendarAnchor, locale), [calendarAnchor, locale]);

  const blocksByDay = useMemo(
    () => placeSlotsOnWeekGrid(weekDays.map((d) => d.dayKey), weekAndDayGridInputs),
    [weekDays, weekAndDayGridInputs],
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
        reservedBookingLabel={td("slotReserved")}
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
      td,
    ],
  );

  const selectedRule = selectedRuleId ? rules.find((r) => r.id === selectedRuleId) : undefined;

  const invalidSlotRanges = useMemo(
    () => rules.some((r) => r.endMin <= r.startMin),
    [rules],
  );

  const invalidDateRanges = useMemo(
    () => rules.some((r) => Boolean(r.startsOn && r.endsOn && r.startsOn > r.endsOn)),
    [rules],
  );

  const hasInvalidLessonMeta = useMemo(
    () => rules.some((r) => !r.classLevelId || !r.classTypeId),
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
        reservedBookingLabel={td("slotReserved")}
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
      td,
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
        reservedLabel={td("slotReserved")}
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
      td,
    ],
  );

  /* ── Mobile-friendly week view (stacked day cards) ── */
  const mobileWeekView = useMemo(() => {
    const selRing =
      "border-zinc-500 bg-zinc-200 text-zinc-900";
    const idleRing =
      "border-zinc-300 bg-white text-zinc-900 hover:bg-zinc-50";
    return (
      <div className="space-y-3" data-testid="mobile-week-view">
        {weekDays.map((day) => {
          const blocks = blocksByDay.get(day.dayKey) ?? [];
          const dayDate = new Date(`${day.dayKey}T12:00:00`);
          return (
            <div key={day.dayKey} className="rounded-lg border border-border bg-surface p-3">
              <div className="mb-2 flex items-center justify-between">
                <p className="text-sm font-semibold text-foreground">
                  {day.shortLabel} {dayDate.getDate()}
                </p>
                <button
                    type="button"
                    onClick={() => addForDayKey(day.dayKey)}
                    className="rounded border border-border bg-surface px-2 py-0.5 text-xs font-semibold text-foreground hover:bg-[var(--app-hover)]"
                  >
                    {t("addForDay")}
                  </button>
              </div>
              {blocks.length === 0 ? (
                <p className="text-xs text-muted">{t("noAvailabilityYet")}</p>
              ) : (
                <div className="space-y-1.5">
                  {blocks.map((block) => {
                    if (block.kind === "booking") {
                      return (
                        <div
                          key={`booking-${block.startsAtIso}-${block.groupKey ?? ""}`}
                          className="rounded-md border border-amber-200/70 bg-amber-50/50 px-2.5 py-1.5 text-xs text-amber-950/90"
                        >
                          <span className="font-medium">
                            {new Date(block.startsAtIso).toLocaleTimeString(locale, { hour: "numeric", minute: "2-digit" })}
                            {" – "}
                            {new Date(block.endsAtIso).toLocaleTimeString(locale, { hour: "numeric", minute: "2-digit" })}
                          </span>
                          <span className="ml-2 text-amber-900/80">{td("slotReserved")}</span>
                          {block.subtitle ? <span className="ml-1 text-amber-900/65">· {block.subtitle}</span> : null}
                        </div>
                      );
                    }
                    const selected =
                      (selectedRuleId && block.groupKey ? block.groupKey === selectedRuleId : false) ||
                      block.startsAtIso === selectedStartsAtIso;
                    return (
                      <button
                        key={`${block.startsAtIso}-${block.groupKey ?? ""}`}
                        type="button"
                        onClick={() => {
                          setSelectedStartsAtIso(block.startsAtIso);
                          setSelectedRuleId(block.groupKey ?? null);
                          setCalendarAnchor(block.startsAtIso);
                        }}
                        className={`w-full rounded-md border px-2.5 py-1.5 text-left text-xs font-medium transition ${selected ? selRing : idleRing}`}
                        aria-pressed={selected}
                      >
                        {new Date(block.startsAtIso).toLocaleTimeString(locale, { hour: "numeric", minute: "2-digit" })}
                        {" – "}
                        {new Date(block.endsAtIso).toLocaleTimeString(locale, { hour: "numeric", minute: "2-digit" })}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </div>
    );
  }, [weekDays, blocksByDay, locale, selectedStartsAtIso, selectedRuleId, t, td, addForDayKey]);

  /* ── Mobile-friendly month view (agenda list for days with slots) ── */
  const mobileMonthView = useMemo(() => {
    const selRing = "border-zinc-500 bg-zinc-200 text-zinc-900";
    const idleRing = "border-zinc-300 bg-white text-zinc-900 hover:bg-zinc-50";
    const daysWithContent = monthCells.filter(
      (cell) => cell.inCurrentMonth && (slotsByDayForMonth.get(cell.dayKey)?.length ?? 0) > 0,
    );
    return (
      <div className="space-y-3" data-testid="mobile-month-view">
        {daysWithContent.length === 0 ? (
          <p className="rounded-lg border border-dashed border-border bg-surface px-3 py-6 text-center text-sm text-muted">
            {t("noAvailabilityYet")}
          </p>
        ) : (
          daysWithContent.map((cell) => {
            const slots = slotsByDayForMonth.get(cell.dayKey) ?? [];
            const cellDate = new Date(`${cell.dayKey}T12:00:00`);
            const dateLabel = cellDate.toLocaleDateString(locale, {
              weekday: "short",
              month: "short",
              day: "numeric",
            });
            return (
              <div key={cell.dayKey} className="rounded-lg border border-border bg-surface p-3">
                <div className="mb-2 flex items-center justify-between">
                  <button
                    type="button"
                    onClick={() => {
                      setCalendarAnchor(`${cell.dayKey}T00:00:00.000Z`);
                      setCalendarView("day");
                    }}
                    className="text-sm font-semibold text-foreground hover:underline"
                  >
                    {dateLabel}
                  </button>
                  <button
                      type="button"
                      onClick={() => addForDayKey(cell.dayKey)}
                      className="rounded border border-border bg-surface px-2 py-0.5 text-xs font-semibold text-foreground hover:bg-[var(--app-hover)]"
                    >
                      {t("addForDay")}
                    </button>
                </div>
                <div className="space-y-1.5">
                  {slots.map((slot) => {
                    if (slot.kind === "booking") {
                      return (
                        <div
                          key={`booking-${slot.startsAtIso}-${slot.groupKey ?? ""}`}
                          className="rounded-md border border-amber-200/70 bg-amber-50/50 px-2.5 py-1.5 text-xs text-amber-950/90"
                        >
                          <span className="font-medium">
                            {new Date(slot.startsAtIso).toLocaleTimeString(locale, { hour: "numeric", minute: "2-digit" })}
                            {" – "}
                            {new Date(slot.endsAtIso).toLocaleTimeString(locale, { hour: "numeric", minute: "2-digit" })}
                          </span>
                          <span className="ml-2 text-amber-900/80">{td("slotReserved")}</span>
                          {slot.label ? <span className="ml-1 text-amber-900/65">· {slot.label}</span> : null}
                        </div>
                      );
                    }
                    const selected =
                      (selectedRuleId && slot.groupKey ? slot.groupKey === selectedRuleId : false) ||
                      slot.startsAtIso === selectedStartsAtIso;
                    return (
                      <button
                        key={`${slot.startsAtIso}-${slot.groupKey ?? ""}`}
                        type="button"
                        onClick={() => {
                          setSelectedStartsAtIso(slot.startsAtIso);
                          setSelectedRuleId(slot.groupKey ?? null);
                          setCalendarAnchor(slot.startsAtIso);
                        }}
                        className={`w-full rounded-md border px-2.5 py-1.5 text-left text-xs font-medium transition ${selected ? selRing : idleRing}`}
                        aria-pressed={selected}
                      >
                        {new Date(slot.startsAtIso).toLocaleTimeString(locale, { hour: "numeric", minute: "2-digit" })}
                        {" – "}
                        {new Date(slot.endsAtIso).toLocaleTimeString(locale, { hour: "numeric", minute: "2-digit" })}
                      </button>
                    );
                  })}
                </div>
              </div>
            );
          })
        )}
      </div>
    );
  }, [monthCells, slotsByDayForMonth, locale, selectedStartsAtIso, selectedRuleId, t, td, addForDayKey]);

  function patchSelected(
    patch: Partial<
      Pick<
        InitialTeacherAvailabilitySlot,
        | "dayOfWeek"
        | "startMin"
        | "endMin"
        | "timezone"
        | "recurrence"
        | "startsOn"
        | "endsOn"
        | "classLevelId"
        | "classTypeId"
      >
    >,
  ) {
    if (!selectedRuleId) return;
    setRules((prev) =>
      prev.map((r) => {
        if (r.id !== selectedRuleId) return r;
        const next: InitialTeacherAvailabilitySlot = { ...r, ...patch };
        if (patch.classLevelId !== undefined) {
          next.classLevel = patch.classLevelId
            ? (levelById.get(patch.classLevelId) ?? null)
            : null;
        }
        if (patch.classTypeId !== undefined) {
          next.classType = patch.classTypeId
            ? (typeById.get(patch.classTypeId) ?? null)
            : null;
        }
        return next;
      }),
    );
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
    if (invalidDateRanges) {
      setStatus("error");
      setSaveErrorMessage(t("invalidDateRange"));
      return;
    }
    const payload = rules.map((r) => {
      const slot: Record<string, unknown> = {
        dayOfWeek: r.dayOfWeek,
        startMin: r.startMin,
        endMin: r.endMin,
        timezone: r.timezone,
        recurrence: r.recurrence,
        classLevelId: r.classLevelId ?? "",
        classTypeId: r.classTypeId ?? "",
      };
      if (r.startsOn) slot.startsOn = r.startsOn;
      if (r.endsOn) slot.endsOn = r.endsOn;
      return slot;
    });
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
        weekViewReplacement={isMobile ? mobileWeekView : weekTimeGrid}
        dayViewReplacement={dayTimeGrid}
        monthViewReplacement={isMobile ? mobileMonthView : monthGoogle}
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
        classLevels={classLevels}
        classTypes={classTypes}
        onClose={() => setMonthAddDayKey(null)}
        onConfirm={(draft) => {
          setRules((prev) => [
            ...prev,
            {
              id: newRuleId(),
              dayOfWeek: draft.dayOfWeek,
              startMin: draft.startMin,
              endMin: draft.endMin,
              timezone: draft.timezone,
              recurrence: draft.recurrence,
              startsOn: draft.startsOn,
              endsOn: draft.endsOn,
              classLevelId: draft.classLevelId,
              classTypeId: draft.classTypeId,
              classLevel: levelById.get(draft.classLevelId) ?? null,
              classType: typeById.get(draft.classTypeId) ?? null,
            },
          ]);
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
          {selectedRule.recurrence === "ONE_OFF" ? (
            <label className="block text-xs text-muted">
              {t("date")}
              <input
                type="date"
                value={selectedRule.startsOn ?? ""}
                onChange={(e) => {
                  const startsOn = e.target.value;
                  patchSelected({
                    startsOn,
                    dayOfWeek: startsOn
                      ? luxonWeekdayMod7FromDayKey(startsOn, selectedRule.timezone)
                      : selectedRule.dayOfWeek,
                  });
                }}
                className="mt-1 w-full rounded-lg border border-border bg-background px-2 py-1 text-sm text-foreground sm:max-w-xs"
              />
            </label>
          ) : (
            <>
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
              <div className="grid gap-3 sm:grid-cols-2">
                <label className="text-xs text-muted">
                  {t("fromDate")}
                  <input
                    type="date"
                    value={selectedRule.startsOn ?? ""}
                    onChange={(e) => {
                      const startsOn = e.target.value;
                      patchSelected({
                        startsOn,
                        dayOfWeek: startsOn
                          ? luxonWeekdayMod7FromDayKey(startsOn, selectedRule.timezone)
                          : selectedRule.dayOfWeek,
                      });
                    }}
                    className="mt-1 w-full rounded-lg border border-border bg-background px-2 py-1 text-sm text-foreground"
                  />
                </label>
                <label className="text-xs text-muted">
                  {t("untilDate")}
                  <input
                    type="date"
                    value={selectedRule.endsOn ?? ""}
                    onChange={(e) => patchSelected({ endsOn: e.target.value || null })}
                    className={`mt-1 w-full rounded-lg border bg-background px-2 py-1 text-sm text-foreground ${
                      selectedRule.startsOn &&
                      selectedRule.endsOn &&
                      selectedRule.startsOn > selectedRule.endsOn
                        ? "border-destructive"
                        : "border-border"
                    }`}
                  />
                </label>
              </div>
              <p className="text-xs text-muted">{t("weeklyDateRangeHint")}</p>
              {selectedRule.startsOn &&
              selectedRule.endsOn &&
              selectedRule.startsOn > selectedRule.endsOn ? (
                <p className="text-sm text-destructive">{t("invalidDateRange")}</p>
              ) : null}
            </>
          )}
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
              value={selectedRule.classLevelId ?? ""}
              onChange={(e) => patchSelected({ classLevelId: e.target.value })}
              required
              className="mt-1 w-full rounded-lg border border-border bg-background px-2 py-1 text-sm text-foreground sm:max-w-xs"
            >
              {!selectedRule.classLevelId ? <option value="">—</option> : null}
              {classLevels.map((opt) => (
                <option key={opt.id} value={opt.id}>
                  {pickLabel(opt)}
                </option>
              ))}
            </select>
          </label>
          <label className="block text-xs text-muted">
            {t("lessonType")}
            <select
              value={selectedRule.classTypeId ?? ""}
              onChange={(e) => patchSelected({ classTypeId: e.target.value })}
              required
              className="mt-1 w-full rounded-lg border border-border bg-background px-2 py-1 text-sm text-foreground sm:max-w-xs"
            >
              {!selectedRule.classTypeId ? <option value="">—</option> : null}
              {classTypes.map((opt) => (
                <option key={opt.id} value={opt.id}>
                  {pickLabel(opt)}
                </option>
              ))}
            </select>
          </label>
          {!selectedRule.classLevelId || !selectedRule.classTypeId ? (
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
          disabled={status === "saving" || invalidSlotRanges || invalidDateRanges || hasInvalidLessonMeta}
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
        canRemoveThisOccurrence={Boolean(
          selectedRuleId && selectedStartsAtIso && selectedRule?.recurrence === "WEEKLY",
        )}
        busy={removeBusy}
        error={removeError}
        title={t("removeDialogTitle")}
        description={
          selectedRule?.recurrence === "WEEKLY"
            ? t("removeDialogDescriptionWeekly")
            : t("removeDialogDescriptionOneOff")
        }
        thisOccurrenceLabel={t("removeThisOccurrence")}
        allSeriesLabel={
          selectedRule?.recurrence === "WEEKLY"
            ? t("removeAllSeries")
            : t("removeOneOff")
        }
        cancelLabel={t("removeDialogCancel")}
        onThisOccurrence={() => void removeThisOccurrenceOnly()}
        onAllSeries={removeEntireWeeklyRule}
      />
    </section>
  );
}
