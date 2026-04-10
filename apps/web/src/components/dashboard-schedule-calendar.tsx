"use client";

import { useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import { CalendarViewControls } from "@/components/calendar-view-controls";
import { shiftCalendarAnchor, type CalendarViewMode } from "@/lib/calendar-view";
import { buildMonthCells, buildWeekDays, dayKeyFromIso } from "@/lib/slot-calendar";

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
  const weekDays = buildWeekDays(anchorIso);
  const monthCells = buildMonthCells(anchorIso);

  const label =
    view === "month"
      ? anchor.toLocaleDateString(undefined, { month: "long", year: "numeric" })
      : view === "week"
        ? `${new Date(`${weekDays[0].dayKey}T00:00:00`).toLocaleDateString(undefined, { month: "short", day: "numeric" })} - ${new Date(`${weekDays[6].dayKey}T00:00:00`).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" })}`
        : anchor.toLocaleDateString(undefined, { weekday: "long", month: "short", day: "numeric", year: "numeric" });

  return (
    <section className="mt-8 rounded-2xl border border-zinc-200 bg-zinc-50 p-4">
      <div className="mb-3 flex flex-wrap items-center gap-3">
        <h2 className="text-lg font-semibold text-zinc-900">{t("scheduleCalendar")}</h2>
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
              className="block rounded-lg border border-zinc-200 bg-white px-3 py-2 hover:bg-zinc-100"
            >
              <p className="text-sm font-semibold text-zinc-900">{item.title}</p>
              <p className="text-xs text-zinc-600">
                {new Date(item.startsAtIso).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })} -{" "}
                {new Date(item.endsAtIso).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })} ·{" "}
                {item.teacherName}
              </p>
            </a>
          ))}
          {(mapByDay.get(anchorKey) ?? []).length === 0 && (
            <p className="rounded-lg border border-dashed border-zinc-300 bg-white px-3 py-4 text-sm text-zinc-500">
              {t("noLessonsOnDay")}
            </p>
          )}
        </div>
      )}

      {view === "week" && (
        <div className="overflow-x-auto pb-1">
          <div className="grid min-w-[760px] grid-cols-7 gap-2">
            {weekDays.map((day) => {
              const key = day.dayKey;
              const dayItems = mapByDay.get(key) ?? [];
              const date = new Date(`${day.dayKey}T00:00:00`);
              return (
                <div key={key} className="min-w-[100px] rounded-lg border border-zinc-200 bg-white p-2">
                  <p className="mb-2 border-b border-zinc-200 pb-1 text-xs font-semibold text-zinc-500">
                    {day.shortLabel.toUpperCase()} {date.getDate()}
                  </p>
                  <div className="space-y-1">
                    {dayItems.slice(0, 4).map((item) => (
                      <a
                        key={item.id}
                        href={`#booking-${item.id}`}
                        className="block rounded-md border border-zinc-200 bg-zinc-50 px-2 py-1 text-xs text-zinc-800 hover:bg-zinc-100"
                      >
                        {new Date(item.startsAtIso).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                      </a>
                    ))}
                    {dayItems.length === 0 && (
                      <p className="rounded-md border border-zinc-200 bg-zinc-100 px-2 py-1 text-center text-[11px] text-zinc-500">
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

      {view === "month" && (
        <>
          <div className="mb-2 grid grid-cols-7 gap-1">
            {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((d) => (
              <p key={d} className="text-center text-[11px] font-semibold uppercase tracking-wide text-zinc-500">
                {d}
              </p>
            ))}
          </div>
          <div className="grid grid-cols-7 gap-1">
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
                  className={`aspect-square rounded-md border p-2 text-left text-xs ${
                    inMonth
                      ? count > 0
                        ? "border-zinc-200 bg-white text-zinc-900 hover:bg-zinc-100"
                        : "border-zinc-200 bg-zinc-100 text-zinc-500"
                      : "border-zinc-200 bg-zinc-50 text-zinc-400"
                  }`}
                >
                  <div className="flex h-full flex-col">
                    <span className="text-sm font-medium">{cell.shortLabel}</span>
                    <span className="mt-auto text-center text-[11px]">{count > 0 ? `${count} ${t("lessonsShort")}` : ""}</span>
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
