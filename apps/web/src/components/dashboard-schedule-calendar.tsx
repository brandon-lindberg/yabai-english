"use client";

import { useMemo, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { useIsMobile } from "@/hooks/use-is-mobile";
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
  const isMobile = useIsMobile();
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

      {view === "week" && !isMobile && (
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
                      className="block rounded-md border border-border bg-muted/25 px-2 py-1.5 text-xs transition hover:bg-muted/40"
                    >
                      <span className="block font-medium text-foreground">
                        {new Date(item.startsAtIso).toLocaleTimeString(locale, {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </span>
                      <span className="mt-0.5 block text-[11px] font-medium leading-tight text-foreground/70">
                        {t("slotReserved")}
                      </span>
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

      {/* Mobile week: stacked day cards */}
      {view === "week" && isMobile && (
        <div className="space-y-2">
          {weekDays.map((day) => {
            const key = day.dayKey;
            const dayItems = mapByDay.get(key) ?? [];
            const date = new Date(`${day.dayKey}T00:00:00`);
            return (
              <div key={key} className="rounded-lg border border-border bg-surface p-3">
                <p className="mb-1.5 text-sm font-semibold text-foreground">
                  {day.shortLabel} {date.getDate()}
                </p>
                {dayItems.length === 0 ? (
                  <p className="text-xs text-muted">{t("unavailableShort")}</p>
                ) : (
                  <div className="space-y-1.5">
                    {dayItems.slice(0, 4).map((item) => (
                      <a
                        key={item.id}
                        href={`#booking-${item.id}`}
                        className="block rounded-md border border-border bg-muted/25 px-2.5 py-1.5 text-xs transition hover:bg-muted/40"
                      >
                        <span className="font-medium text-foreground">
                          {new Date(item.startsAtIso).toLocaleTimeString(locale, { hour: "2-digit", minute: "2-digit" })}
                          {" - "}
                          {new Date(item.endsAtIso).toLocaleTimeString(locale, { hour: "2-digit", minute: "2-digit" })}
                        </span>
                        {item.teacherName ? (
                          <span className="ml-2 text-foreground/70">{item.teacherName}</span>
                        ) : null}
                      </a>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Desktop month: 7-column grid */}
      {view === "month" && !isMobile && (
        <div className="overflow-x-auto pb-1">
          <div className="min-w-[720px]">
            <div className="mb-2 grid grid-cols-7 gap-px border-b border-border">
              {monthWeekdayHeaders.map((d, index) => (
                <p key={`${d}-${index}`} className="bg-background py-1.5 text-center text-[11px] font-semibold text-muted">
                  {d}
                </p>
              ))}
            </div>
            <div className="grid grid-cols-7 gap-px bg-border">
              {monthCells.map((cell) => {
                const key = cell.dayKey;
                const dayItems = mapByDay.get(key) ?? [];
                const chips = dayItems.slice(0, 3);
                const more = dayItems.length - chips.length;
                const inMonth = cell.inCurrentMonth;
                return (
                  <div
                    key={key}
                    className={`flex min-h-[96px] flex-col p-1 text-left text-xs ${
                      inMonth
                        ? dayItems.length > 0
                          ? "bg-surface text-foreground"
                          : "bg-background text-muted"
                        : "bg-[var(--app-canvas)] text-muted/50"
                    }`}
                  >
                    <button
                      type="button"
                      onClick={() => {
                        setAnchorIso(`${cell.dayKey}T00:00:00.000Z`);
                        setView("day");
                      }}
                      className="min-w-0 rounded px-0.5 text-left text-sm font-semibold hover:bg-[var(--app-hover)]"
                    >
                      {cell.shortLabel}
                    </button>
                    <div className="mt-1 flex min-h-0 flex-1 flex-col gap-0.5">
                      {chips.map((item) => (
                        <a
                          key={item.id}
                          href={`#booking-${item.id}`}
                          className="w-full truncate rounded-md border border-border bg-muted/20 px-1.5 py-1 text-left text-[10px] font-medium leading-snug transition hover:bg-muted/35"
                        >
                          <span className="block truncate text-foreground">
                            {new Date(item.startsAtIso).toLocaleTimeString(locale, {
                              hour: "numeric",
                              minute: "2-digit",
                            })}
                          </span>
                          <span className="mt-0.5 block truncate text-[10px] font-medium leading-tight text-foreground/68">
                            {t("slotReserved")}
                          </span>
                          {item.teacherName ? (
                            <span className="mt-0.5 block truncate text-[9px] text-foreground/55">
                              {item.teacherName}
                            </span>
                          ) : null}
                        </a>
                      ))}
                      {more > 0 && (
                        <button
                          type="button"
                          onClick={() => {
                            setAnchorIso(`${cell.dayKey}T00:00:00.000Z`);
                            setView("day");
                          }}
                          className="px-0.5 text-left text-[9px] font-medium text-muted hover:underline"
                        >
                          +{more} more
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Mobile month: agenda list of days with lessons */}
      {view === "month" && isMobile && (() => {
        const daysWithLessons = monthCells.filter(
          (cell) => cell.inCurrentMonth && (mapByDay.get(cell.dayKey)?.length ?? 0) > 0,
        );
        return (
          <div className="space-y-2">
            {daysWithLessons.length === 0 ? (
              <p className="rounded-lg border border-dashed border-border bg-surface px-3 py-6 text-center text-sm text-muted">
                {t("noLessonsOnDay")}
              </p>
            ) : (
              daysWithLessons.map((cell) => {
                const dayItems = mapByDay.get(cell.dayKey) ?? [];
                const cellDate = new Date(`${cell.dayKey}T12:00:00`);
                return (
                  <div key={cell.dayKey} className="rounded-lg border border-border bg-surface p-3">
                    <button
                      type="button"
                      onClick={() => {
                        setAnchorIso(`${cell.dayKey}T00:00:00.000Z`);
                        setView("day");
                      }}
                      className="mb-1.5 text-sm font-semibold text-foreground hover:underline"
                    >
                      {cellDate.toLocaleDateString(locale, { weekday: "short", month: "short", day: "numeric" })}
                    </button>
                    <div className="space-y-1.5">
                      {dayItems.map((item) => (
                        <a
                          key={item.id}
                          href={`#booking-${item.id}`}
                          className="block rounded-md border border-border bg-muted/25 px-2.5 py-1.5 text-xs transition hover:bg-muted/40"
                        >
                          <span className="font-medium text-foreground">
                            {new Date(item.startsAtIso).toLocaleTimeString(locale, { hour: "2-digit", minute: "2-digit" })}
                            {" - "}
                            {new Date(item.endsAtIso).toLocaleTimeString(locale, { hour: "2-digit", minute: "2-digit" })}
                          </span>
                          {item.teacherName ? (
                            <span className="ml-2 text-foreground/70">{item.teacherName}</span>
                          ) : null}
                        </a>
                      ))}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        );
      })()}
    </section>
  );
}
