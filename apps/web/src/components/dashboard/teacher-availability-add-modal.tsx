"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { luxonWeekdayMod7FromDayKey } from "@/lib/availability-editor";
import { weekdayLabel } from "@/lib/weekdays";

export type TeacherAvailabilityAddModalDraft = {
  dayOfWeek: number;
  startMin: number;
  endMin: number;
  timezone: string;
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

export function TeacherAvailabilityAddModal({
  open,
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
}: Props) {
  const tModal = useTranslations("dashboard.teacherAvailability");
  const [weeklyOnCalendarDay, setWeeklyOnCalendarDay] = useState(false);
  const [draft, setDraft] = useState<TeacherAvailabilityAddModalDraft>({
    dayOfWeek: 1,
    startMin: 9 * 60,
    endMin: 10 * 60,
    timezone: initialTimezone,
  });

  useEffect(() => {
    if (!open || !dayKey) return;
    setWeeklyOnCalendarDay(false);
    setDraft({
      dayOfWeek: luxonWeekdayMod7FromDayKey(dayKey, initialTimezone),
      startMin: 9 * 60,
      endMin: 10 * 60,
      timezone: initialTimezone,
    });
  }, [open, dayKey, initialTimezone]);

  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open || !dayKey) return null;

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
        aria-label={cancelLabel}
        onClick={onClose}
      />
      <div className="relative z-[101] w-full max-w-md rounded-2xl border border-border bg-surface p-5 shadow-xl">
        <h3 id="teacher-availability-add-title" className="text-lg font-semibold text-foreground">
          {title}
        </h3>
        <p className="mt-1 text-sm text-muted">{subtitle}</p>

        <div className="mt-4 flex items-start justify-between gap-3 border-b border-border pb-3">
          <div className="min-w-0 flex-1">
            <p id="weekly-recurring-label" className="text-sm font-medium text-foreground">
              {tModal("weeklyRecurringLabel")}
            </p>
            <p className="mt-0.5 text-xs text-muted">{tModal("weeklyRecurringHint")}</p>
          </div>
          <button
            type="button"
            role="switch"
            aria-checked={weeklyOnCalendarDay}
            aria-labelledby="weekly-recurring-label"
            onClick={() => {
              setWeeklyOnCalendarDay((on) => {
                const next = !on;
                if (next) {
                  setDraft((d) => ({
                    ...d,
                    dayOfWeek: luxonWeekdayMod7FromDayKey(dayKey, d.timezone),
                  }));
                }
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
          <label className="block text-xs text-muted">
            {dayOfWeekLabel}
            <select
              value={draft.dayOfWeek}
              disabled={weeklyOnCalendarDay}
              onChange={(e) =>
                setDraft((d) => ({ ...d, dayOfWeek: Number(e.target.value) }))
              }
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
              {startLabel}
              <input
                type="time"
                value={toTime(draft.startMin)}
                onChange={(e) =>
                  setDraft((d) => ({ ...d, startMin: parseTime(e.target.value) }))
                }
                className="mt-1 w-full rounded-lg border border-border bg-background px-2 py-2 text-sm text-foreground"
              />
            </label>
            <label className="text-xs text-muted">
              {endLabel}
              <input
                type="time"
                value={toTime(draft.endMin)}
                onChange={(e) =>
                  setDraft((d) => ({ ...d, endMin: parseTime(e.target.value) }))
                }
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
          <label className="block text-xs text-muted">
            {timezoneLabel}
            <input
              value={draft.timezone}
              onChange={(e) => {
                const tz = e.target.value;
                setDraft((d) => ({
                  ...d,
                  timezone: tz,
                  ...(weeklyOnCalendarDay && tz.trim()
                    ? { dayOfWeek: luxonWeekdayMod7FromDayKey(dayKey, tz) }
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
            disabled={draft.endMin <= draft.startMin}
            onClick={() => {
              onConfirm(draft);
              onClose();
            }}
            className="rounded-full bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:opacity-90 disabled:opacity-40"
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
