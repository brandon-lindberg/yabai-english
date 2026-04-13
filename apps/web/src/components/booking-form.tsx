"use client";

import { useEffect, useMemo, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { mapBookingApiError } from "@/lib/booking-errors";
import { useRouter } from "@/i18n/navigation";
import { canShowManualOverrideToggle } from "@/lib/manual-override";
import {
  buildMonthCells,
  buildWeekDays,
  buildWeekdayColumnHeaders,
  dayKeyFromIso,
  groupSlotsByDay,
} from "@/lib/slot-calendar";
import { CalendarViewControls } from "@/components/calendar-view-controls";
import { shiftCalendarAnchor, type CalendarViewMode } from "@/lib/calendar-view";
type LessonProductOption = {
  id: string;
  nameJa: string;
  nameEn: string;
  durationMin: number;
  tier: string;
};

type Props = {
  teacherProfileId?: string;
  currentUserRole?: "STUDENT" | "TEACHER" | "ADMIN";
  presetSlots?: Array<{
    startsAtIso: string;
    label: string;
  }>;
};

export function BookingForm({
  teacherProfileId,
  currentUserRole = "STUDENT",
  presetSlots,
}: Props) {
  const locale = useLocale();
  const t = useTranslations("booking");
  const router = useRouter();
  const [products, setProducts] = useState<LessonProductOption[]>([]);
  const [lessonProductId, setLessonProductId] = useState("");
  const [startsAt, setStartsAt] = useState("");
  const [manualOverride, setManualOverride] = useState(false);
  const [manualOverrideReason, setManualOverrideReason] = useState("");
  const [calendarView, setCalendarView] = useState<CalendarViewMode>("week");
  const [calendarAnchor, setCalendarAnchor] = useState(
    presetSlots?.[0]?.startsAtIso ?? new Date().toISOString(),
  );
  const [message, setMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const groupedSlots = groupSlotsByDay(presetSlots ?? [], locale);
  const slotMap = new Map(groupedSlots.map((group) => [group.dayKey, group.slots]));
  const selectedDayKey = startsAt ? dayKeyFromIso(startsAt) : "";
  const weekDays = buildWeekDays(calendarAnchor, locale);
  const monthCells = buildMonthCells(calendarAnchor, locale);
  const monthWeekdayHeaders = useMemo(() => buildWeekdayColumnHeaders(locale), [locale]);

  useEffect(() => {
    void fetch("/api/lesson-products")
      .then((r) => r.json())
      .then((data: LessonProductOption[]) => {
        setProducts(data);
        if (data[0]) setLessonProductId(data[0].id);
      });
  }, []);

  useEffect(() => {
    if (presetSlots && presetSlots.length > 0) {
      setStartsAt(presetSlots[0].startsAtIso);
      setCalendarAnchor(presetSlots[0].startsAtIso);
    }
  }, [presetSlots]);

  function dayLabel() {
    const d = new Date(calendarAnchor);
    if (calendarView === "month") {
      return d.toLocaleDateString(locale, { month: "long", year: "numeric" });
    }
    if (calendarView === "week") {
      const from = weekDays[0]?.dayKey ? new Date(`${weekDays[0].dayKey}T00:00:00`) : null;
      const to = weekDays[6]?.dayKey ? new Date(`${weekDays[6].dayKey}T00:00:00`) : null;
      if (!from || !to) return "";
      return `${from.toLocaleDateString(locale, { month: "short", day: "numeric" })} - ${to.toLocaleDateString(locale, { month: "short", day: "numeric", year: "numeric" })}`;
    }
    return d.toLocaleDateString(locale, {
      weekday: "long",
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setMessage(null);
    setLoading(true);
    try {
      const iso = startsAt ? new Date(startsAt).toISOString() : "";
      const res = await fetch("/api/bookings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          lessonProductId,
          startsAt: iso,
          teacherProfileId,
          manualOverride: canShowManualOverrideToggle(currentUserRole)
            ? manualOverride
            : undefined,
          manualOverrideReason: canShowManualOverrideToggle(currentUserRole)
            ? manualOverrideReason
            : undefined,
        }),
      });
      const data = (await res.json()) as {
        error?: string;
        checkoutUrl?: string;
      };
      if (!res.ok) {
        if (data.error === "Bookings must be made at least 48 hours in advance.") {
          setMessage(t("leadTimeError"));
        } else if (data.error === "Manual override reason is required.") {
          setMessage(t("manualOverrideReasonError"));
        } else {
          setMessage(mapBookingApiError(data.error ?? "Error"));
        }
        return;
      }
      if (data.checkoutUrl) {
        router.push(data.checkoutUrl);
        return;
      }
      setMessage(t("success"));
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4 rounded-2xl border border-border bg-surface p-6 shadow-sm">
      <label className="block text-sm font-medium text-foreground">
        {t("selectProduct")}
        <select
          className="mt-1 block w-full rounded-lg border border-border bg-surface px-3 py-2 text-foreground"
          value={lessonProductId}
          onChange={(e) => setLessonProductId(e.target.value)}
        >
          {products.map((p) => (
            <option key={p.id} value={p.id}>
              {p.nameJa} — {p.durationMin}
              {p.tier === "FREE_TRIAL" ? ` · ${t("freeTrialOption")}` : ""}
            </option>
          ))}
        </select>
      </label>
      {presetSlots ? (
        <div className="space-y-3">
          <p className="text-sm font-medium text-foreground">{t("selectSlot")}</p>
          {groupedSlots.length === 0 ? (
            <p className="rounded-xl border border-dashed border-border bg-background px-3 py-2 text-sm text-muted">
              {t("noAvailabilityYet")}
            </p>
          ) : (
            <div className="rounded-2xl border border-zinc-200 bg-zinc-50 p-4 shadow-sm">
              <div className="mb-4 border-b border-zinc-200 pb-3">
                <CalendarViewControls
                  view={calendarView}
                  onViewChange={setCalendarView}
                  onPrevious={() => setCalendarAnchor(shiftCalendarAnchor(calendarAnchor, calendarView, -1))}
                  onNext={() => setCalendarAnchor(shiftCalendarAnchor(calendarAnchor, calendarView, 1))}
                  label={dayLabel()}
                  dayLabel={t("calendarDay")}
                  weekLabel={t("calendarWeek")}
                  monthLabel={t("calendarMonth")}
                  previousLabel={t("previous")}
                  nextLabel={t("next")}
                />
              </div>
              <div className="mb-3 rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-700">
                {startsAt
                  ? `${t("selectedSlot")}: ${new Date(startsAt).toLocaleString(locale, {
                      weekday: "short",
                      month: "short",
                      day: "numeric",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}`
                  : t("noSlotSelected")}
              </div>
              {calendarView === "day" && (
                <>
                  {(slotMap.get(dayKeyFromIso(calendarAnchor)) ?? []).length === 0 ? (
                    <p className="rounded-lg border border-dashed border-zinc-300 px-3 py-6 text-center text-sm text-zinc-500">
                      {t("noAvailabilityYet")}
                    </p>
                  ) : (
                    <div className="space-y-2">
                      {(slotMap.get(dayKeyFromIso(calendarAnchor)) ?? []).map((slot) => {
                        const selected = slot.startsAtIso === startsAt;
                        return (
                          <button
                            key={slot.startsAtIso}
                            type="button"
                            onClick={() => setStartsAt(slot.startsAtIso)}
                            className={`flex w-full items-center justify-between rounded-lg border px-3 py-2 text-left text-sm transition ${
                              selected
                                ? "border-primary bg-primary/10 text-zinc-900 ring-1 ring-primary/30"
                                : "border-zinc-200 bg-white text-zinc-800 hover:bg-zinc-100"
                            }`}
                          >
                            <span className="font-medium">
                              {new Date(slot.startsAtIso).toLocaleTimeString(locale, {
                                hour: "2-digit",
                                minute: "2-digit",
                              })}
                            </span>
                            <span className="truncate pl-3 text-xs text-zinc-500">
                              {slot.label}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  )}
                </>
              )}
              {calendarView === "week" && (
                <div className="overflow-x-auto pb-1">
                  <div className="grid min-w-[760px] grid-cols-7 gap-2">
                    {weekDays.map((day) => {
                      const daySlots = slotMap.get(day.dayKey) ?? [];
                      const dayDate = new Date(`${day.dayKey}T00:00:00`);
                      return (
                        <div
                          key={day.dayKey}
                          className={`min-w-[100px] rounded-lg border p-2 ${
                            daySlots.length > 0
                              ? "border-zinc-200 bg-white"
                              : "border-zinc-200 bg-zinc-100/80"
                          }`}
                        >
                          <p className="mb-2 border-b border-zinc-200 pb-1 text-xs font-semibold text-zinc-500">
                            {day.shortLabel} {dayDate.getDate()}
                          </p>
                          <div className="space-y-1">
                            {daySlots.slice(0, 5).map((slot) => {
                              const selected = slot.startsAtIso === startsAt;
                              return (
                                <button
                                  key={slot.startsAtIso}
                                  type="button"
                                  onClick={() => {
                                    setStartsAt(slot.startsAtIso);
                                    setCalendarAnchor(slot.startsAtIso);
                                  }}
                                  className={`w-full rounded-md border px-2 py-1 text-xs transition ${
                                    selected
                                      ? "border-primary bg-primary text-primary-foreground shadow-sm"
                                      : "border-zinc-200 bg-white text-zinc-800 hover:bg-zinc-100"
                                  }`}
                                  aria-pressed={selected}
                                >
                                  <span className="whitespace-nowrap font-medium">
                                    {new Date(slot.startsAtIso).toLocaleTimeString(locale, {
                                      hour: "2-digit",
                                      minute: "2-digit",
                                    })}
                                  </span>
                                </button>
                              );
                            })}
                            {daySlots.length === 0 && (
                              <p className="rounded-md border border-zinc-200 bg-zinc-100 px-2 py-1 text-center text-[11px] leading-4 text-zinc-500">
                                {t("unavailableShort")}
                              </p>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
              {calendarView === "month" && (
                <>
                  <div className="mb-2 grid grid-cols-7 gap-1">
                    {monthWeekdayHeaders.map((day, index) => (
                      <p
                        key={`${day}-${index}`}
                        className="text-center text-[11px] font-semibold text-zinc-500"
                      >
                        {day}
                      </p>
                    ))}
                  </div>
                  <div className="grid grid-cols-7 gap-1">
                    {monthCells.map((cell) => {
                      const isSelected = selectedDayKey === cell.dayKey;
                      const hasSlots = (slotMap.get(cell.dayKey) ?? []).length > 0;
                      const isAvailable = cell.inCurrentMonth && hasSlots;
                      const isUnavailable = cell.inCurrentMonth && !hasSlots;
                      return (
                        <button
                          key={cell.dayKey}
                          type="button"
                          onClick={() => {
                            setCalendarAnchor(`${cell.dayKey}T00:00:00.000Z`);
                            setCalendarView("day");
                          }}
                          className={`aspect-square rounded-md border p-2 text-left text-xs transition ${
                            isSelected
                              ? "border-primary ring-1 ring-primary/25"
                              : "border-zinc-200 dark:border-zinc-700"
                          } ${
                            isAvailable
                              ? "bg-white text-zinc-900 hover:bg-zinc-100"
                              : isUnavailable
                                ? "bg-zinc-100 text-zinc-500"
                                : "bg-zinc-50 text-zinc-400"
                          }`}
                        >
                          <div className="flex h-full flex-col">
                            <span className="text-sm font-medium">{cell.shortLabel}</span>
                            <div className="mt-auto flex items-center justify-center">
                              {hasSlots ? (
                                <span className="inline-block h-2 w-2 rounded-full bg-accent" />
                              ) : (
                                <span className="inline-block h-2 w-2 rounded-full bg-transparent" />
                              )}
                            </div>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </>
              )}
            </div>
          )}
        </div>
      ) : (
        <label className="block text-sm font-medium text-foreground">
          {t("selectSlot")}
          <input
            type="datetime-local"
            required
            className="mt-1 block w-full rounded-lg border border-border bg-surface px-3 py-2 text-foreground"
            value={startsAt}
            onChange={(e) => setStartsAt(e.target.value)}
          />
        </label>
      )}
      {canShowManualOverrideToggle(currentUserRole) && (
        <div className="rounded-xl border border-border bg-background px-3 py-2 text-sm text-foreground">
          <label className="flex items-start gap-2">
            <input
              type="checkbox"
              checked={manualOverride}
              onChange={(e) => setManualOverride(e.target.checked)}
            />
            <span>
              {t("manualOverrideLabel")}
              <span className="mt-0.5 block text-xs text-muted">
                {t("manualOverrideHelp")}
              </span>
            </span>
          </label>
          {manualOverride && (
            <label className="mt-3 block text-xs text-muted">
              {t("manualOverrideReasonLabel")}
              <textarea
                value={manualOverrideReason}
                onChange={(e) => setManualOverrideReason(e.target.value)}
                className="mt-1 min-h-20 w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm text-foreground"
                placeholder={t("manualOverrideReasonPlaceholder")}
                required
              />
            </label>
          )}
        </div>
      )}
      {message && (
        <p className="text-sm text-link" role="status">
          {message}
        </p>
      )}
      <button
        type="submit"
        disabled={loading || !lessonProductId || !startsAt}
        className="w-full rounded-full bg-primary py-2.5 text-sm font-semibold text-primary-foreground hover:opacity-90 disabled:opacity-50"
      >
        {t("confirm")}
      </button>
    </form>
  );
}
