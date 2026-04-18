"use client";

import { useMemo, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { CalendarViewControls } from "@/components/calendar-view-controls";
import { shiftCalendarAnchor, type CalendarViewMode } from "@/lib/calendar-view";
import { buildMonthCells, buildWeekDays, buildWeekdayColumnHeaders, dayKeyFromIso } from "@/lib/slot-calendar";

type DashboardScheduleItem = {
  id: string;
  startsAtIso: string;
  endsAtIso: string;
  title: string;
  teacherName: string;
};

type Props = {
  items: DashboardScheduleItem[];
};

export function DashboardScheduleCalendar({ items }: Props) {
  const locale = useLocale();
  const t = useTranslations("dashboard");
  const [view, setView] = useState<CalendarViewMode>("week");
  const [anchorIso, setAnchorIso] = useState(items[0]?.startsAtIso ?? new Date().toISOString());

  const mapByDay = useMemo(() => {
    const map = new Map<string, DashboardScheduleItem[]>();
    for (const item of items) {
      const key = dayKeyFromIso(item.startsAtIso);
      const list = map.get(key);
      if (list) list.push(item);
      else map.set(key, [item]);
    }
    for (const list of map.values()) {
      list.sort((a, b) => a.startsAtIso.localeCompare(b.startsAtIso));
    }
    return map;
  }, [items]);

  const anchor = new Date(anchorIso);
  const anchorKey = dayKeyFromIso(anchorIso);
  const weekDays = buildWeekDays(anchorIso, locale);
  const monthCells = buildMonthCells(anchorIso, locale);
  const monthWeekdayHeaders = useMemo(() => buildWeekdayColumnHeaders(locale), [locale]);

  const label =
    view === "month"
      ? anchor.toLocaleDateString(locale, { month: "long", year: "numeric" })
      : view === "week"
        ? `${new Date(`${weekDays[0].dayKey}T00:00:00`).toLocaleDateString(locale, { month: "short", day: "numeric" })} - ${new Date(`${weekDays[6].dayKey}T00:00:00`).toLocaleDateString(locale, { month: "short", day: "numeric", year: "numeric" })}`
        : anchor.toLocaleDateString(locale, { weekday: "long", month: "short", day: "numeric", year: "numeric" });

  return (
    <section className="mt-8 rounded-2xl border border-border bg-surface p-4">
      <div className="mb-3 flex flex-wrap items-center gap-3">
        <h2 className="text-lg font-semibold text-foreground">{t("scheduleCalendar")}</h2>
      </div>

      <CalendarViewControls
        view={view}
        onViewChange={setView}
        onPrevious={() => setAnchorIso(shiftCalendarAnchor(anchorIso, view, -1))}
        onNext={() => setAnchorIso(shiftCalendarAnchor(anchorIso, view, 1))}
        label={label}
        dayLabel={t("calendarDay")}
        weekLabel={t("calendarWeek")}
        monthLabel={t("calendarMonth")}
        previousLabel={t("previous")}
        nextLabel={t("next")}
      />

      {view === "day" && (
        <div className="space-y-2">
          {(mapByDay.get(anchorKey) ?? []).map((item) => (
            <a
              key={item.id}
              href={`#booking-${item.id}`}
              className="block rounded-lg border border-border bg-surface px-3 py-2 hover:bg-[var(--app-hover)]"
            >
              <p className="text-sm font-semibold text-foreground">{item.title}</p>
              <p className="text-xs text-muted">
                {new Date(item.startsAtIso).toLocaleTimeString(locale, { hour: "2-digit", minute: "2-digit" })} -{" "}
                {new Date(item.endsAtIso).toLocaleTimeString(locale, { hour: "2-digit", minute: "2-digit" })} ·{" "}
                {item.teacherName}
              </p>
            </a>
          ))}
          {(mapByDay.get(anchorKey) ?? []).length === 0 && (
            <p className="rounded-lg border border-dashed border-border bg-surface px-3 py-4 text-sm text-muted">
              {t("noLessonsOnDay")}
            </p>
          )}
        </div>
      )}

      {view === "week" && (
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 md:grid-cols-7">
          {weekDays.map((day) => {
            const key = day.dayKey;
            const dayItems = mapByDay.get(key) ?? [];
            const date = new Date(`${day.dayKey}T00:00:00`);
            return (
              <div key={key} className="rounded-lg border border-border bg-surface p-2">
                <p className="mb-2 border-b border-border pb-1 text-xs font-semibold text-muted">
                  {day.shortLabel} {date.getDate()}
                </p>
                <div className="space-y-1">
                  {dayItems.slice(0, 4).map((item) => (
                    <a
                      key={item.id}
                      href={`#booking-${item.id}`}
                      className="block rounded-md border border-border bg-background px-2 py-1 text-xs text-foreground hover:bg-[var(--app-hover)]"
                    >
                      {new Date(item.startsAtIso).toLocaleTimeString(locale, { hour: "2-digit", minute: "2-digit" })}
                    </a>
                  ))}
                  {dayItems.length === 0 && (
                    <p className="rounded-md border border-border bg-background px-2 py-1 text-center text-[11px] text-muted">
                      {t("unavailableShort")}
                    </p>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {view === "month" && (
        <>
          <div className="mb-2 grid grid-cols-7 gap-0.5 sm:gap-1">
            {monthWeekdayHeaders.map((d, index) => (
              <p key={`${d}-${index}`} className="text-center text-[10px] font-semibold text-muted sm:text-[11px]">
                {d}
              </p>
            ))}
          </div>
          <div className="grid grid-cols-7 gap-0.5 sm:gap-1">
            {monthCells.map((cell) => {
              const key = cell.dayKey;
              const count = (mapByDay.get(key) ?? []).length;
              const inMonth = cell.inCurrentMonth;
              return (
                <button
                  key={key}
                  type="button"
                  onClick={() => {
                    setAnchorIso(`${cell.dayKey}T00:00:00.000Z`);
                    setView("day");
                  }}
                  className={`aspect-square rounded-md border p-1 text-left text-xs sm:p-2 ${
                    inMonth
                      ? count > 0
                        ? "border-border bg-surface text-foreground hover:bg-[var(--app-hover)]"
                        : "border-border bg-background text-muted"
                      : "border-border bg-[var(--app-canvas)] text-muted/50"
                  }`}
                >
                  <div className="flex h-full flex-col">
                    <span className="text-xs font-medium sm:text-sm">{cell.shortLabel}</span>
                    <span className="mt-auto text-center text-[9px] sm:text-[11px]">{count > 0 ? `${count}` : ""}</span>
                  </div>
                </button>
              );
            })}
          </div>
        </>
      )}
    </section>
  );
}
