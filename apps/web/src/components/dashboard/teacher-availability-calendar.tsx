"use client";

import { useLocale, useTranslations } from "next-intl";
import { useMemo, useState } from "react";
import { buildUpcomingSlotOptions } from "@/lib/availability";
import { weekdayLabel } from "@/lib/weekdays";
import { TeacherAvailabilityAddModal } from "@/components/dashboard/teacher-availability-add-modal";
import { SlotSelectionCalendar } from "@/components/slot-selection-calendar";
import type { CalendarViewMode } from "@/lib/calendar-view";

export type InitialTeacherAvailabilitySlot = {
  id: string;
  dayOfWeek: number;
  startMin: number;
  endMin: number;
  timezone: string;
};

type Props = {
  initialSlots: InitialTeacherAvailabilitySlot[];
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

export function TeacherAvailabilityCalendar({ initialSlots, defaultTimezone }: Props) {
  const locale = useLocale();
  const t = useTranslations("dashboard.teacherAvailability");
  const td = useTranslations("dashboard");
  const [rules, setRules] = useState<InitialTeacherAvailabilitySlot[]>(initialSlots);
  const [calendarView, setCalendarView] = useState<CalendarViewMode>("week");
  const [calendarAnchor, setCalendarAnchor] = useState(new Date().toISOString());
  const [selectedRuleId, setSelectedRuleId] = useState<string | null>(null);
  const [selectedStartsAtIso, setSelectedStartsAtIso] = useState<string | null>(null);
  const [status, setStatus] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [monthAddDayKey, setMonthAddDayKey] = useState<string | null>(null);

  const teacherTz = rules[0]?.timezone ?? defaultTimezone;

  const calendarSlots = useMemo(() => {
    const expanded = buildUpcomingSlotOptions({
      availabilitySlots: rules.map((r) => ({
        id: r.id,
        dayOfWeek: r.dayOfWeek,
        startMin: r.startMin,
        endMin: r.endMin,
        timezone: r.timezone,
      })),
      viewerTimezone: teacherTz,
      horizonDays: 365,
      minimumLeadHours: 0,
      allowPastInstances: true,
    });
    return expanded.map((s) => ({
      startsAtIso: s.startsAtIso,
      label: s.label,
      groupKey: s.slotId,
    }));
  }, [rules, teacherTz]);

  const selectedRule = selectedRuleId ? rules.find((r) => r.id === selectedRuleId) : undefined;

  function patchSelected(
    patch: Partial<Pick<InitialTeacherAvailabilitySlot, "dayOfWeek" | "startMin" | "endMin" | "timezone">>,
  ) {
    if (!selectedRuleId) return;
    setRules((prev) => prev.map((r) => (r.id === selectedRuleId ? { ...r, ...patch } : r)));
  }

  function addForDayKey(dayKey: string) {
    setMonthAddDayKey(dayKey);
  }

  function removeSelected() {
    if (!selectedRuleId) return;
    setRules((prev) => prev.filter((r) => r.id !== selectedRuleId));
    setSelectedRuleId(null);
    setSelectedStartsAtIso(null);
  }

  async function save() {
    setStatus("saving");
    const response = await fetch("/api/teacher/availability", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(
        rules.map((r) => ({
          dayOfWeek: r.dayOfWeek,
          startMin: r.startMin,
          endMin: r.endMin,
          timezone: r.timezone,
        })),
      ),
    });
    if (!response.ok) {
      setStatus("error");
      return;
    }
    setStatus("saved");
    setTimeout(() => setStatus("idle"), 2000);
  }

  return (
    <section className="space-y-4 rounded-2xl border border-border bg-surface p-4">
      <div>
        <h2 className="text-lg font-semibold text-foreground">{t("sectionTitle")}</h2>
        <p className="mt-1 text-sm text-muted">{t("intro")}</p>
      </div>

      <div className="rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-700">
        {selectedRule
          ? `${t("selectedRecurringSlot")}: ${new Date(selectedStartsAtIso ?? calendarAnchor).toLocaleString(locale, {
              weekday: "short",
              month: "short",
              day: "numeric",
              hour: "2-digit",
              minute: "2-digit",
            })}`
          : t("noSlotSelected")}
      </div>

      <SlotSelectionCalendar
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
        weekColumnAddLabel={t("addForDay")}
        onAddForDayKey={addForDayKey}
        onMonthDayClick={(dayKey) => setMonthAddDayKey(dayKey)}
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
              className="mt-1 w-full rounded-lg border border-border bg-background px-2 py-1 text-sm text-foreground"
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
        </div>
      ) : null}

      <div className="flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={removeSelected}
          disabled={!selectedRuleId}
          className="rounded-full border border-destructive/40 px-4 py-2 text-sm font-semibold text-destructive hover:bg-destructive/5 disabled:opacity-40"
        >
          {t("removeRule")}
        </button>
        <button
          type="button"
          onClick={() => void save()}
          disabled={status === "saving"}
          className="rounded-full bg-foreground px-4 py-2 text-sm font-semibold text-background hover:opacity-90 disabled:opacity-50"
        >
          {status === "saving" ? t("saving") : t("save")}
        </button>
        {status === "saved" ? (
          <span className="text-sm text-green-600 dark:text-green-400">{t("saved")}</span>
        ) : null}
        {status === "error" ? <span className="text-sm text-destructive">{t("error")}</span> : null}
      </div>
    </section>
  );
}
