"use client";

import { useLocale, useTranslations } from "next-intl";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useIsMobile } from "@/hooks/use-is-mobile";
import { buildUpcomingSlotOptions } from "@/lib/availability";
import {
  TeacherAvailabilityAddModal,
  type AssignableStudentOption,
  type TeacherAvailabilityAddModalDraft,
  type TeacherLessonOfferingOption,
} from "@/components/dashboard/teacher-availability-add-modal";
import { TeacherAvailabilityScopeModal } from "@/components/dashboard/teacher-availability-scope-modal";
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
  dayKeyToIsoAtNoon,
  dayKeyFromIso,
  formatDayKeyLabel,
} from "@/lib/slot-calendar";
import { luxonWeekdayMod7FromDayKey } from "@/lib/availability-editor";
import {
  buildOccurrenceSkipIndex,
  type OccurrenceSkip,
} from "@/lib/availability-occurrence-skips";
import { filterAvailabilityOverlappingBookings } from "@/lib/teacher-availability-display";
import { placeSlotsOnDayColumn, placeSlotsOnWeekGrid } from "@/lib/time-grid-week";
import { teacherAvailabilitySchema } from "@/lib/teacher-availability";
import { offeringCanBackAvailabilitySlot } from "@/lib/availability-offering-match";
import type { CalendarViewMode } from "@/lib/calendar-view";
import { SLOT_BOOKED, SLOT_FIGURE, slotClasses } from "@/components/ui/slot-state";
import type { BookingDisplayStatus } from "@/lib/booking-status";
import { BookingDetailModal } from "@/components/booking/booking-detail-modal";
import { bookingChipWho } from "@/lib/booking-chip-label";
import {
  availabilityWindowEndDayKey,
  canAdvanceCalendarWithinWindow,
  isAvailabilityDaySelectable,
} from "@/lib/availability-window";

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
  teacherLessonOfferingId: string | null;
  /** Reserved for one student; null means open to everyone. */
  assignedStudentId: string | null;
  /**
   * Only ever populated for the teacher who owns the availability. Lessons are
   * private: nobody else learns who a slot is reserved for.
   */
  assignedStudentName?: string | null;
  classLevel: TaxonomyOption | null;
  classType: TaxonomyOption | null;
};

/**
 * Re-exported rather than redeclared: this was a second copy of the modal's
 * type, which is how `isFreeTrial` could have reached one and not the other.
 */
export type { TeacherLessonOfferingOption };

export type TeacherCalendarBooking = {
  id: string;
  startsAtIso: string;
  endsAtIso: string;
  studentLabel: string;
  lessonLabel: string;
  durationMin: number;
  priceYen: number | null;
  status: BookingDisplayStatus;
  meetUrl: string | null;
  /** Present only for a seat in a group class. */
  groupSeats?: { capacity: number; taken: number } | null;
  /** Everyone holding a seat in that class. */
  classmates?: string[];
};

type Props = {
  initialSlots: InitialTeacherAvailabilitySlot[];
  initialOccurrenceSkips: OccurrenceSkip[];
  defaultTimezone: string;
  classLevels: TaxonomyOption[];
  /** The teacher's own students, offered when reserving a slot. */
  assignableStudents?: AssignableStudentOption[];
  classTypes: TaxonomyOption[];
  lessonOfferings: TeacherLessonOfferingOption[];
  /** Confirmed (or pending-payment) bookings to overlay on the schedule as "booked" blocks. */
  bookings?: TeacherCalendarBooking[];
};

/**
 * Why this set of rules cannot be saved, as the message key naming it — or null.
 * Confirming the modal is the save, so this is what stops a bad set going out.
 */
function unsaveableReason(rules: InitialTeacherAvailabilitySlot[]) {
  if (rules.some((r) => r.endMin <= r.startMin)) return "invalidTimeRange" as const;
  if (rules.some((r) => !r.classLevelId || !r.classTypeId || !r.teacherLessonOfferingId)) {
    return "invalidLessonMeta" as const;
  }
  if (rules.some((r) => Boolean(r.startsOn && r.endsOn && r.startsOn > r.endsOn))) {
    return "invalidDateRange" as const;
  }
  return null;
}

function newRuleId() {
  return `new_${Math.random().toString(36).slice(2, 11)}`;
}

function findBestOfferingForSlot(
  slot: InitialTeacherAvailabilitySlot,
  lessonOfferings: TeacherLessonOfferingOption[],
) {
  const existing = slot.teacherLessonOfferingId
    ? lessonOfferings.find((offer) => offer.id === slot.teacherLessonOfferingId)
    : undefined;
  if (existing) return existing;

  // An offering the save route could never accept is no candidate at all: the
  // later fallbacks below ignore taxonomy, so without this an incomplete
  // offering gets paired anyway and the server rejects the entire save.
  const candidates = lessonOfferings.filter(offeringCanBackAvailabilitySlot);

  const durationMin = slot.endMin - slot.startMin;
  const matchesKnownTaxonomy = (offer: TeacherLessonOfferingOption) =>
    (!slot.classLevelId || offer.classLevelId === slot.classLevelId) &&
    (!slot.classTypeId || offer.classTypeId === slot.classTypeId);

  return (
    candidates.find(
      (offer) => offer.durationMin === durationMin && matchesKnownTaxonomy(offer),
    ) ??
    candidates.find(matchesKnownTaxonomy) ??
    candidates.find((offer) => offer.durationMin === durationMin) ??
    candidates[0] ??
    null
  );
}

function normalizeLegacyAvailabilitySlots(
  slots: InitialTeacherAvailabilitySlot[],
  lessonOfferings: TeacherLessonOfferingOption[],
): InitialTeacherAvailabilitySlot[] {
  return slots.map((slot) => {
    const offer = findBestOfferingForSlot(slot, lessonOfferings);
    if (!offer) return slot;

    return {
      ...slot,
      endMin: slot.startMin + offer.durationMin,
      // Adopted outright, not merged with the slot's own values: the route
      // requires the pair to be equal, and a leftover value from the slot is
      // exactly what made them unequal.
      classLevelId: offer.classLevelId,
      classTypeId: offer.classTypeId,
      teacherLessonOfferingId: offer.id,
      classLevel: offer.classLevel,
      classType: offer.classType,
    };
  });
}

export function TeacherAvailabilityCalendar({
  initialSlots,
  initialOccurrenceSkips,
  defaultTimezone,
  classLevels,
  assignableStudents = [],
  classTypes,
  lessonOfferings,
  bookings = [],
}: Props) {
  const locale = useLocale();
  const isMobile = useIsMobile();
  const t = useTranslations("dashboard.teacherAvailability");
  const td = useTranslations("dashboard");
  const tb = useTranslations("booking");
  const groupSeatsLabel = useCallback(
    (seats: { capacity: number; taken: number }) =>
      tb("slotGroupSeats", { taken: seats.taken, capacity: seats.capacity }),
    [tb],
  );
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
  const [rules, setRules] = useState<InitialTeacherAvailabilitySlot[]>(() =>
    normalizeLegacyAvailabilitySlots(initialSlots, lessonOfferings),
  );
  const [occurrenceSkips, setOccurrenceSkips] = useState<OccurrenceSkip[]>(initialOccurrenceSkips);
  const [calendarView, setCalendarView] = useState<CalendarViewMode>("month");
  const [calendarAnchor, setCalendarAnchor] = useState(new Date().toISOString());
  const [selectedRuleId, setSelectedRuleId] = useState<string | null>(null);
  const [selectedStartsAtIso, setSelectedStartsAtIso] = useState<string | null>(null);
  /**
   * The slot the modal is editing. Separate from `selectedRuleId` so closing
   * the modal leaves the slot selected — the calendar still highlights it, and
   * removing an occurrence still knows which one.
   */
  const [editRuleId, setEditRuleId] = useState<string | null>(null);
  const [status, setStatus] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [monthAddDayKey, setMonthAddDayKey] = useState<string | null>(null);
  /** An update waiting on the teacher's choice of scope. */
  const [pendingUpdate, setPendingUpdate] = useState<{
    ruleId: string;
    startsAtIso: string;
    draft: TeacherAvailabilityAddModalDraft;
  } | null>(null);
  const [updateBusy, setUpdateBusy] = useState(false);
  const [updateError, setUpdateError] = useState<string | null>(null);
  const [removeOpen, setRemoveOpen] = useState(false);
  const [removeBusy, setRemoveBusy] = useState(false);
  const [removeError, setRemoveError] = useState<string | null>(null);
  const [saveErrorMessage, setSaveErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    setOccurrenceSkips(initialOccurrenceSkips);
  }, [initialOccurrenceSkips]);

  const teacherTz = rules[0]?.timezone ?? defaultTimezone;
  const formatCalendarTime = useCallback(
    (iso: string) =>
      new Date(iso).toLocaleTimeString(locale, {
        hour: "numeric",
        minute: "2-digit",
        timeZone: teacherTz,
      }),
    [locale, teacherTz],
  );

  const skipIndex = useMemo(() => buildOccurrenceSkipIndex(occurrenceSkips), [occurrenceSkips]);

  const canAddForDayKey = useCallback(
    (dayKey: string) => isAvailabilityDaySelectable(dayKey, new Date(), teacherTz),
    [teacherTz],
  );

  const addForDayKey = useCallback((dayKey: string) => {
    setMonthAddDayKey(dayKey);
  }, []);

  /**
   * The modal's draft and a stored rule are the same nine fields in two
   * shapes. Adding and editing both go through these, so neither can drift.
   */
  const ruleFromDraft = useCallback(
    (draft: TeacherAvailabilityAddModalDraft, id: string): InitialTeacherAvailabilitySlot => ({
      id,
      dayOfWeek: draft.dayOfWeek,
      startMin: draft.startMin,
      endMin: draft.endMin,
      timezone: draft.timezone,
      recurrence: draft.recurrence,
      startsOn: draft.startsOn,
      endsOn: draft.endsOn,
      assignedStudentId: draft.assignedStudentId ?? null,
      assignedStudentName:
        assignableStudents.find((s) => s.id === draft.assignedStudentId)?.label ?? null,
      classLevelId: draft.classLevelId,
      classTypeId: draft.classTypeId,
      teacherLessonOfferingId: draft.teacherLessonOfferingId,
      classLevel: levelById.get(draft.classLevelId) ?? null,
      classType: typeById.get(draft.classTypeId) ?? null,
    }),
    [assignableStudents, levelById, typeById],
  );

  const draftFromRule = useCallback(
    (rule: InitialTeacherAvailabilitySlot): TeacherAvailabilityAddModalDraft => ({
      dayOfWeek: rule.dayOfWeek,
      startMin: rule.startMin,
      endMin: rule.endMin,
      timezone: rule.timezone,
      recurrence: rule.recurrence,
      startsOn: rule.startsOn,
      endsOn: rule.endsOn,
      assignedStudentId: rule.assignedStudentId ?? null,
      classLevelId: rule.classLevelId ?? "",
      classTypeId: rule.classTypeId ?? "",
      teacherLessonOfferingId: rule.teacherLessonOfferingId ?? "",
    }),
    [],
  );

  /** Picking a slot anywhere in the calendar means editing it. */
  const selectSlotForEdit = useCallback((startsAtIso: string | null, groupKey: string | null) => {
    setSelectedStartsAtIso(startsAtIso);
    setSelectedRuleId(groupKey);
    setEditRuleId(groupKey);
  }, []);

  const calendarSlots = useMemo(() => {
    const metaBySlotId = new Map<string, string>();
    for (const r of rules) {
      const lvl = pickLabel(levelById.get(r.classLevelId ?? ""));
      const ty = pickLabel(typeById.get(r.classTypeId ?? ""));
      // A reserved slot leads with who it is for — that is what the teacher
      // scans their week for.
      const reserved = r.assignedStudentId
        ? t("reservedForStudent", { name: r.assignedStudentName ?? "—" })
        : "";
      metaBySlotId.set(r.id, [reserved, lvl, ty].filter(Boolean).join(" · "));
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
      skippedOccurrences: skipIndex,
      formatLessonMeta: (slot) => metaBySlotId.get(slot.id) ?? "",
    });
    return expanded.map((s) => ({
      startsAtIso: s.startsAtIso,
      endsAtIso: s.endsAtIso,
      label: s.label,
      groupKey: s.slotId,
    }));
  }, [rules, teacherTz, skipIndex, levelById, typeById, pickLabel, t]);

  const displayCalendarSlots = useMemo(
    () =>
      filterAvailabilityOverlappingBookings(calendarSlots, bookings, {
        timezoneShiftCompatibility: { timeZone: teacherTz },
      }),
    [calendarSlots, bookings, teacherTz],
  );

  const anchorDayKey = useMemo(
    () => dayKeyFromIso(calendarAnchor, teacherTz),
    [calendarAnchor, teacherTz],
  );

  const [openBookingId, setOpenBookingId] = useState<string | null>(null);
  const openBooking = useCallback((groupKey: string | null) => {
    // Blocks carry `booking-<id>` as their group key, which is how a click on a
    // chip finds the reservation behind it.
    setOpenBookingId(groupKey?.startsWith("booking-") ? groupKey.slice(8) : null);
  }, []);
  const openedBooking = bookings.find((b) => b.id === openBookingId) ?? null;

  const bookingGridInputs = useMemo(
    () =>
      bookings.map((b) => {
        // A group class has no single student to name, so the chip says how
        // full it is; the dialog lists who is in it.
        const who = bookingChipWho({ counterpartLabel: b.studentLabel, groupSeats: b.groupSeats }, groupSeatsLabel);
        return {
          startsAtIso: b.startsAtIso,
          endsAtIso: b.endsAtIso,
          label: who,
          groupKey: `booking-${b.id}`,
          kind: "booking" as const,
          subtitle: who,
        };
      }),
    [bookings, groupSeatsLabel],
  );

  const weekAndDayGridInputs = useMemo(
    () => [...displayCalendarSlots, ...bookingGridInputs],
    [displayCalendarSlots, bookingGridInputs],
  );

  const dayBlocks = useMemo(
    () => placeSlotsOnDayColumn(anchorDayKey, weekAndDayGridInputs, teacherTz),
    [anchorDayKey, weekAndDayGridInputs, teacherTz],
  );

  const monthCells = useMemo(
    () => buildMonthCells(calendarAnchor, locale, teacherTz),
    [calendarAnchor, locale, teacherTz],
  );
  const monthWeekdayHeaders = useMemo(() => buildWeekdayColumnHeaders(locale), [locale]);

  const slotsByDayForMonth = useMemo(() => {
    const m = new Map<string, MonthDaySlotChip[]>();
    for (const s of displayCalendarSlots) {
      const dk = dayKeyFromIso(s.startsAtIso, teacherTz);
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
      const dk = dayKeyFromIso(b.startsAtIso, teacherTz);
      const chip: MonthDaySlotChip = {
        startsAtIso: b.startsAtIso,
        endsAtIso: b.endsAtIso,
        label: bookingChipWho({ counterpartLabel: b.studentLabel, groupSeats: b.groupSeats }, groupSeatsLabel),
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
  }, [displayCalendarSlots, bookings, teacherTz, groupSeatsLabel]);

  const weekDays = useMemo(
    () => buildWeekDays(calendarAnchor, locale, teacherTz),
    [calendarAnchor, locale, teacherTz],
  );

  const blocksByDay = useMemo(
    () => placeSlotsOnWeekGrid(weekDays.map((d) => d.dayKey), weekAndDayGridInputs, teacherTz),
    [weekDays, weekAndDayGridInputs, teacherTz],
  );

  const weekTimeGrid = useMemo(
    () => (
      <TeacherAvailabilityTimeGridWeek
        locale={locale}
        weekDays={weekDays}
        blocksByDay={blocksByDay}
        selectedStartsAtIso={selectedStartsAtIso}
        selectedGroupKey={selectedRuleId}
        onSelectSlot={(iso, groupKey) => selectSlotForEdit(iso, groupKey ?? null)}
        onCalendarAnchorChange={setCalendarAnchor}
        weekColumnAddLabel={t("addForDay")}
        onAddForDayKey={addForDayKey}
        canAddForDayKey={canAddForDayKey}
        reservedBookingLabel={td("slotReserved")}
        onSelectBooking={openBooking}
        timeZone={teacherTz}
      />
    ),
    [
      canAddForDayKey,
      locale,
      weekDays,
      blocksByDay,
      selectedStartsAtIso,
      selectedRuleId,
    selectSlotForEdit,
      t,
      addForDayKey,
      teacherTz,
      openBooking,
      td,
    ],
  );

  const selectedRule = selectedRuleId ? rules.find((r) => r.id === selectedRuleId) : undefined;
  const editingRule = editRuleId ? rules.find((r) => r.id === editRuleId) : undefined;
  const editingDayKey = editingRule
    ? (editingRule.startsOn ??
      (selectedStartsAtIso ? dayKeyFromIso(selectedStartsAtIso, teacherTz) : null))
    : null;

  const focusDateLabel = useMemo(() => {
    const dk = dayKeyFromIso(calendarAnchor, teacherTz);
    return formatDayKeyLabel(
      dk,
      locale,
      {
        weekday: "long",
        month: "long",
        day: "numeric",
        year: "numeric",
      },
      teacherTz,
    );
  }, [calendarAnchor, locale, teacherTz]);

  const focusedMonthDayKey = useMemo(
    () =>
      selectedStartsAtIso
        ? dayKeyFromIso(selectedStartsAtIso, teacherTz)
        : dayKeyFromIso(calendarAnchor, teacherTz),
    [selectedStartsAtIso, calendarAnchor, teacherTz],
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
        onSelectSlot={(iso, groupKey) => selectSlotForEdit(iso, groupKey ?? null)}
        onCalendarAnchorChange={setCalendarAnchor}
        weekColumnAddLabel={t("addForDay")}
        onAddForDayKey={addForDayKey}
        canAddForDayKey={canAddForDayKey}
        reservedBookingLabel={td("slotReserved")}
        onSelectBooking={openBooking}
        emptyLabel={t("noAvailabilityYet")}
        timeZone={teacherTz}
        footer={
          <button
            type="button"
            onClick={() => setMonthAddDayKey(anchorDayKey)}
            className="w-full rounded-full border border-border bg-surface px-4 py-2 text-sm font-semibold text-foreground hover:bg-[var(--app-hover)]"
          >
            {t("addForThisDay")}
          </button>
        }
      />
    ),
    [
      canAddForDayKey,
      locale,
      anchorDayKey,
      focusDateLabel,
      dayBlocks,
      selectedStartsAtIso,
      selectedRuleId,
    selectSlotForEdit,
      t,
      addForDayKey,
      teacherTz,
      openBooking,
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
          setCalendarAnchor(dayKeyToIsoAtNoon(dk, teacherTz));
          setCalendarView("day");
        }}
        onAddForDayKey={addForDayKey}
        canAddForDayKey={canAddForDayKey}
        addLabel={t("addForDay")}
        onSelectSlot={(iso, groupKey) => selectSlotForEdit(iso, groupKey ?? null)}
        onCalendarAnchorChange={setCalendarAnchor}
        reservedLabel={td("slotReserved")}
        onSelectBooking={openBooking}
        timeZone={teacherTz}
      />
    ),
    [
      canAddForDayKey,
      locale,
      monthWeekdayHeaders,
      monthCells,
      slotsByDayForMonth,
      focusedMonthDayKey,
      selectedStartsAtIso,
      selectedRuleId,
    selectSlotForEdit,
      t,
      addForDayKey,
      td,
      teacherTz,
      openBooking,
    ],
  );

  /* ── Mobile-friendly week view (stacked day cards) ── */
  const mobileWeekView = useMemo(() => {
    const selRing = slotClasses({ kind: "open", selected: true });
    const idleRing = slotClasses({ kind: "open" });
    return (
      <div className="space-y-3" data-testid="mobile-week-view">
        {weekDays.map((day) => {
          const blocks = blocksByDay.get(day.dayKey) ?? [];
          const dayOfMonth = Number(day.dayKey.slice(-2));
          return (
            <div key={day.dayKey} className="rounded-lg border border-border bg-surface p-3">
              <div className="mb-2 flex items-center justify-between">
                <p className="text-sm font-semibold text-foreground">
                  {day.shortLabel} {dayOfMonth}
                </p>
                {canAddForDayKey(day.dayKey) ? (
                  <button
                    type="button"
                    onClick={() => addForDayKey(day.dayKey)}
                    className="inline-flex min-h-8 items-center rounded border border-border bg-surface px-2.5 py-1 text-xs font-semibold text-foreground hover:bg-[var(--app-hover)]"
                  >
                    {t("addForDay")}
                  </button>
                ) : null}
              </div>
              {blocks.length === 0 ? (
                <p className="text-xs text-muted">{t("noAvailabilityYet")}</p>
              ) : (
                <div className="space-y-1.5">
                  {blocks.map((block) => {
                    if (block.kind === "booking") {
                      return (
                        <button
                          type="button"
                          key={`booking-${block.startsAtIso}-${block.groupKey ?? ""}`}
                          onClick={() => openBooking(block.groupKey ?? null)}
                          className={`block w-full rounded-md px-2.5 py-1.5 text-left text-xs ${SLOT_BOOKED}`}
                        >
                          <span className="font-medium">
                            {formatCalendarTime(block.startsAtIso)}
                            {" – "}
                            {formatCalendarTime(block.endsAtIso)}
                          </span>
                          {block.subtitle ? (
                            <span className="ml-2 block truncate text-[var(--app-canvas)]/75">
                              {block.subtitle}
                            </span>
                          ) : null}
                        </button>
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
                          selectSlotForEdit(block.startsAtIso, block.groupKey ?? null);
                          setCalendarAnchor(block.startsAtIso);
                        }}
                        className={`w-full rounded-md px-2.5 py-1.5 text-left text-xs font-medium ${SLOT_FIGURE} ${selected ? selRing : idleRing}`}
                        aria-pressed={selected}
                      >
                        {formatCalendarTime(block.startsAtIso)}
                        {" – "}
                        {formatCalendarTime(block.endsAtIso)}
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
  }, [
    weekDays,
    blocksByDay,
    selectedStartsAtIso,
    selectedRuleId,
    selectSlotForEdit,
    t,
    addForDayKey,
    canAddForDayKey,
    formatCalendarTime,
    openBooking,
  ]);

  /* ── Mobile-friendly month view (agenda list for days with slots) ── */
  const mobileMonthView = useMemo(() => {
    const selRing = slotClasses({ kind: "open", selected: true });
    const idleRing = slotClasses({ kind: "open" });
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
            const dateLabel = formatDayKeyLabel(
              cell.dayKey,
              locale,
              {
                weekday: "short",
                month: "short",
                day: "numeric",
              },
              teacherTz,
            );
            return (
              <div key={cell.dayKey} className="rounded-lg border border-border bg-surface p-3">
                <div className="mb-2 flex items-center justify-between">
                  <button
                    type="button"
                    onClick={() => {
                      setCalendarAnchor(dayKeyToIsoAtNoon(cell.dayKey, teacherTz));
                      setCalendarView("day");
                    }}
                    className="text-sm font-semibold text-foreground hover:underline"
                  >
                    {dateLabel}
                  </button>
                  <button
                      type="button"
                      onClick={() => addForDayKey(cell.dayKey)}
                      className="inline-flex min-h-8 items-center rounded border border-border bg-surface px-2.5 py-1 text-xs font-semibold text-foreground hover:bg-[var(--app-hover)]"
                    >
                      {t("addForDay")}
                    </button>
                </div>
                <div className="space-y-1.5">
                  {slots.map((slot) => {
                    if (slot.kind === "booking") {
                      return (
                        <button
                          type="button"
                          key={`booking-${slot.startsAtIso}-${slot.groupKey ?? ""}`}
                          onClick={() => openBooking(slot.groupKey ?? null)}
                          className={`block w-full rounded-md px-2.5 py-1.5 text-left text-xs ${SLOT_BOOKED}`}
                        >
                          <span className="font-medium">
                            {formatCalendarTime(slot.startsAtIso)}
                            {" – "}
                            {formatCalendarTime(slot.endsAtIso)}
                          </span>
                          {slot.label ? (
                            <span className="ml-2 block truncate text-[var(--app-canvas)]/75">
                              {slot.label}
                            </span>
                          ) : null}
                        </button>
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
                          selectSlotForEdit(slot.startsAtIso, slot.groupKey ?? null);
                          setCalendarAnchor(slot.startsAtIso);
                        }}
                        className={`w-full rounded-md px-2.5 py-1.5 text-left text-xs font-medium ${SLOT_FIGURE} ${selected ? selRing : idleRing}`}
                        aria-pressed={selected}
                      >
                        {formatCalendarTime(slot.startsAtIso)}
                        {" – "}
                        {formatCalendarTime(slot.endsAtIso)}
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
  }, [
    monthCells,
    slotsByDayForMonth,
    locale,
    selectedStartsAtIso,
    selectedRuleId,
    selectSlotForEdit,
    t,
    addForDayKey,
    teacherTz,
    formatCalendarTime,
    openBooking,
  ]);

  /** Changing the availability is saving it: there is no second step. */
  function commitRules(next: InitialTeacherAvailabilitySlot[]) {
    setRules(next);
    void save(next);
  }

  function removeEntireWeeklyRule() {
    if (!selectedRuleId) return;
    commitRules(rules.filter((r) => r.id !== selectedRuleId));
    setSelectedRuleId(null);
    setSelectedStartsAtIso(null);
  }

  /** Marks one occurrence of a weekly rule as not happening. */
  async function skipOccurrence(slotId: string, startsAtIso: string) {
    const res = await fetch("/api/teacher/availability/occurrence-skips", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ slotId, startsAtIso }),
    });
    if (!res.ok) return false;
    setOccurrenceSkips((prev) =>
      prev.some((skip) => skip.slotId === slotId && skip.startsAtIso === startsAtIso)
        ? prev
        : [...prev, { slotId, startsAtIso }],
    );
    return true;
  }

  async function removeThisOccurrenceOnly() {
    if (!selectedRuleId || !selectedStartsAtIso) return;
    setRemoveBusy(true);
    setRemoveError(null);
    try {
      if (!(await skipOccurrence(selectedRuleId, selectedStartsAtIso))) {
        setRemoveError(t("removeOccurrenceFailed"));
        return;
      }
      setRemoveOpen(false);
      setSelectedRuleId(null);
      setSelectedStartsAtIso(null);
    } finally {
      setRemoveBusy(false);
    }
  }

  function applyUpdateToAllTimes() {
    if (!pendingUpdate) return;
    const { ruleId, draft } = pendingUpdate;
    commitRules(rules.map((r) => (r.id === ruleId ? ruleFromDraft(draft, r.id) : r)));
    setPendingUpdate(null);
  }

  /**
   * Changing one occurrence of a weekly rule splits it: that week stops
   * happening under the rule, and a one-off carries the change in its place.
   */
  async function applyUpdateToThisOccurrenceOnly() {
    if (!pendingUpdate) return;
    const { ruleId, startsAtIso, draft } = pendingUpdate;
    setUpdateBusy(true);
    setUpdateError(null);
    try {
      if (!(await skipOccurrence(ruleId, startsAtIso))) {
        setUpdateError(t("updateOccurrenceFailed"));
        return;
      }
      const dayKey = dayKeyFromIso(startsAtIso, draft.timezone);
      commitRules([
        ...rules,
        {
          ...ruleFromDraft(draft, newRuleId()),
          recurrence: "ONE_OFF",
          startsOn: dayKey,
          endsOn: null,
          dayOfWeek: luxonWeekdayMod7FromDayKey(dayKey, draft.timezone),
        },
      ]);
      setPendingUpdate(null);
    } finally {
      setUpdateBusy(false);
    }
  }

  async function save(nextRules: InitialTeacherAvailabilitySlot[]) {
    setSaveErrorMessage(null);
    const reason = unsaveableReason(nextRules);
    if (reason) {
      setStatus("error");
      setSaveErrorMessage(t(reason));
      return;
    }
    const payload = nextRules.map((r) => {
      const slot: Record<string, unknown> = {
        // The row this entry edits. A locally minted `new_…` id matches nothing
        // on the server and becomes a new row there.
        id: r.id,
        dayOfWeek: r.dayOfWeek,
        startMin: r.startMin,
        endMin: r.endMin,
        timezone: r.timezone,
        recurrence: r.recurrence,
        classLevelId: r.classLevelId ?? "",
        classTypeId: r.classTypeId ?? "",
        teacherLessonOfferingId: r.teacherLessonOfferingId ?? "",
        // Saving replaces every row, so an assignment omitted here would be
        // silently destroyed on the teacher's next unrelated edit.
        assignedStudentId: r.assignedStudentId ?? null,
      };
      if (r.startsOn) slot.startsOn = r.startsOn;
      // A weekly slot saved before end dates were required arrives with none.
      // Bound it at the window rather than refusing the save and leaving the
      // teacher with a row they cannot edit their way out of.
      if (r.recurrence !== "ONE_OFF") {
        slot.endsOn = r.endsOn ?? availabilityWindowEndDayKey(new Date(), r.timezone);
      } else if (r.endsOn) {
        slot.endsOn = r.endsOn;
      }
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
    /*
      No visible heading: this sits under a tab already labelled "Availability",
      and the tab, a page intro and this heading all said the same word before
      the teacher reached the grid. The name stays as the region's accessible
      name, so landmark navigation still finds it.
    */
    <section className="space-y-4" aria-label={t("sectionTitle")}>

      {/* A chip has room for a time and who it is with; everything else about
          the reservation lives here, one click away. */}
      <BookingDetailModal
        timeZone={teacherTz}
        viewer="teacher"
        booking={
          openedBooking
            ? {
                id: openedBooking.id,
                startsAtIso: openedBooking.startsAtIso,
                endsAtIso: openedBooking.endsAtIso,
                status: openedBooking.status,
                counterpartLabel: openedBooking.studentLabel,
                lessonLabel: openedBooking.lessonLabel,
                durationMin: openedBooking.durationMin,
                priceYen: openedBooking.priceYen,
                meetUrl: openedBooking.meetUrl,
                groupSeats: openedBooking.groupSeats ?? null,
                classmates: openedBooking.classmates,
              }
            : null
        }
        onClose={() => setOpenBookingId(null)}
      />

      <SlotSelectionCalendar
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
        nextDisabled={
          !canAdvanceCalendarWithinWindow(calendarAnchor, calendarView, new Date(), teacherTz)
        }
        selectedStartsAtIso={selectedStartsAtIso}
        selectedGroupKey={selectedRuleId}
        onSelectSlot={(iso, groupKey) => selectSlotForEdit(iso, groupKey ?? null)}
        weekColumnAddLabel={t("addForDay")}
        onAddForDayKey={addForDayKey}
        canAddForDayKey={canAddForDayKey}
        timeZone={teacherTz}
      />

      <TeacherAvailabilityAddModal
        open={monthAddDayKey !== null || editingRule !== undefined}
        dayKey={monthAddDayKey ?? editingDayKey}
        locale={locale}
        initialTimezone={teacherTz}
        classLevels={classLevels}
        classTypes={classTypes}
        lessonOfferings={lessonOfferings}
        assignableStudents={assignableStudents}
        initialDraft={editingRule ? draftFromRule(editingRule) : null}
        onRemove={
          editingRule
            ? () => {
                setRemoveError(null);
                setRemoveOpen(true);
              }
            : null
        }
        removeLabel={t("removeRule")}
        onClose={() => {
          setMonthAddDayKey(null);
          setEditRuleId(null);
        }}
        onConfirm={(draft) => {
          if (editRuleId) {
            // A weekly rule means either this week or every week, so ask before
            // rewriting weeks the teacher may not have meant to touch.
            if (editingRule?.recurrence === "WEEKLY" && selectedStartsAtIso) {
              setUpdateError(null);
              setPendingUpdate({ ruleId: editRuleId, startsAtIso: selectedStartsAtIso, draft });
              return;
            }
            // Editing rewrites the slot in place, and leaves it selected so the
            // calendar still marks what was just changed.
            commitRules(rules.map((r) => (r.id === editRuleId ? ruleFromDraft(draft, r.id) : r)));
            return;
          }
          commitRules([...rules, ruleFromDraft(draft, newRuleId())]);
          setSelectedRuleId(null);
          setSelectedStartsAtIso(null);
        }}
        title={editingRule ? t("monthEditModalTitle") : t("monthAddModalTitle")}
        subtitle={(() => {
          const dayKey = monthAddDayKey ?? editingDayKey;
          if (!dayKey) return "";
          const date = formatDayKeyLabel(
            dayKey,
            locale,
            { weekday: "long", month: "long", day: "numeric", year: "numeric" },
            teacherTz,
          );
          return editingRule
            ? t("monthEditModalSubtitle", { date })
            : t("monthAddModalSubtitle", { date });
        })()}
        cancelLabel={t("monthAddModalCancel")}
        confirmLabel={
          editingRule ? t("monthEditModalConfirm") : t("monthAddModalConfirm")
        }
        dayOfWeekLabel={t("dayOfWeek")}
        startLabel={t("start")}
        endLabel={t("end")}
        timezoneLabel={t("timezone")}
      />

      {/* No Save button: the modal's confirm is the save. What is left is
          telling the teacher it happened — or did not. */}
      {status === "idle" ? null : (
        <p
          role="status"
          className={`text-sm ${status === "error" ? "text-destructive" : "text-foreground"}`}
        >
          {status === "saving"
            ? t("saving")
            : status === "saved"
              ? t("saved")
              : (saveErrorMessage ?? t("error"))}
        </p>
      )}

      <TeacherAvailabilityScopeModal
        open={pendingUpdate !== null}
        onClose={() => {
          setPendingUpdate(null);
          setUpdateError(null);
        }}
        canApplyToThisOccurrence
        allSeriesTone="neutral"
        busy={updateBusy}
        error={updateError}
        title={t("updateDialogTitle")}
        description={t("updateDialogDescriptionWeekly")}
        thisOccurrenceLabel={t("updateThisOccurrence")}
        allSeriesLabel={t("updateAllSeries")}
        cancelLabel={t("removeDialogCancel")}
        onThisOccurrence={() => void applyUpdateToThisOccurrenceOnly()}
        onAllSeries={applyUpdateToAllTimes}
      />

      <TeacherAvailabilityScopeModal
        open={removeOpen}
        onClose={() => {
          setRemoveOpen(false);
          setRemoveError(null);
        }}
        canApplyToThisOccurrence={Boolean(
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
