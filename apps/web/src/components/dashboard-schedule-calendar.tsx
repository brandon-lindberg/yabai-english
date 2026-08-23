"use client";

import { useMemo, useState, type ReactNode } from "react";
import { useLocale, useTranslations } from "next-intl";
import { useIsMobile } from "@/hooks/use-is-mobile";
import {
  CalendarEmpty,
  CalendarFrame,
  CalendarMonthGrid,
  CalendarWeekColumns,
} from "@/components/ui/calendar-frame";
import { shiftCalendarAnchor, type CalendarViewMode } from "@/lib/calendar-view";
import { slotClasses } from "@/components/ui/slot-state";
import { Link } from "@/i18n/navigation";
import {
  buildMonthCells,
  buildWeekDays,
  buildWeekdayColumnHeaders,
  dayKeyFromIso,
  dayKeyToIsoAtNoon,
  formatDayKeyLabel,
} from "@/lib/slot-calendar";

/**
 * Both dashboards' schedule.
 *
 * Students and teachers get the same calendar — the only difference is whose
 * name is on the other side of the lesson, which is a prop, not a component.
 * This used to be a second hand-built copy of the slot picker's day/week/month
 * scaffolding; it now shares `ui/calendar-frame` with the picker, the teacher
 * availability editor and the school schedule, so all five move together.
 *
 * The grid holds both halves of a lesson's life. An upcoming lesson is a
 * commitment and takes the value ladder's strongest state, solid ink; a lesson
 * already taught is a record and drops to the spent state. A teacher scanning a
 * week must never mistake one for the other, and the distinction is value, not
 * hue, so it survives colour blindness and either theme.
 */

type DashboardScheduleItem = {
  id: string;
  startsAtIso: string;
  endsAtIso: string;
  title: string;
  /** The other person in the lesson — a teacher for students, a student for teachers. */
  teacherName: string;
  /** Already taught. Renders as a record rather than a commitment. */
  isPast: boolean;
};

type Props = {
  items: DashboardScheduleItem[];
  timeZone: string;
};

/**
 * Where a mark on the grid leads.
 *
 * An upcoming lesson is in the list directly below this calendar, so it stays a
 * same-page hash. A past one is rendered on the completed history page instead,
 * so it needs a real route — a bare `#booking-…` would point at an anchor that
 * does not exist on this page and silently do nothing when clicked.
 */
function ScheduleItemLink({
  item,
  className,
  children,
}: {
  item: DashboardScheduleItem;
  className?: string;
  children: ReactNode;
}) {
  if (item.isPast) {
    return (
      <Link href={`/dashboard/schedule/completed#booking-${item.id}`} className={className}>
        {children}
      </Link>
    );
  }
  return (
    <a href={`#booking-${item.id}`} className={className}>
      {children}
    </a>
  );
}

export function DashboardScheduleCalendar({ items, timeZone }: Props) {
  const locale = useLocale();
  const isMobile = useIsMobile();
  const t = useTranslations("dashboard");
  const [view, setView] = useState<CalendarViewMode>("week");
  // Open on the next lesson, not the first item: `items` now leads with the
  // upcoming ones but carries the whole past archive behind them, and anchoring
  // on `items[0]` blindly would land the teacher in their oldest lesson ever
  // the moment they have nothing booked.
  const [anchorIso, setAnchorIso] = useState(
    () => items.find((item) => !item.isPast)?.startsAtIso ?? new Date().toISOString(),
  );

  function formatTime(iso: string) {
    return new Date(iso).toLocaleTimeString(locale, {
      hour: "2-digit",
      minute: "2-digit",
      timeZone,
    });
  }

  const mapByDay = useMemo(() => {
    const map = new Map<string, DashboardScheduleItem[]>();
    for (const item of items) {
      const key = dayKeyFromIso(item.startsAtIso, timeZone);
      const list = map.get(key);
      if (list) list.push(item);
      else map.set(key, [item]);
    }
    for (const list of map.values()) {
      list.sort((a, b) => a.startsAtIso.localeCompare(b.startsAtIso));
    }
    return map;
  }, [items, timeZone]);

  const anchorKey = dayKeyFromIso(anchorIso, timeZone);
  const weekDays = buildWeekDays(anchorIso, locale, timeZone);
  const monthCells = buildMonthCells(anchorIso, locale, timeZone);
  const monthWeekdayHeaders = useMemo(() => buildWeekdayColumnHeaders(locale), [locale]);

  const label =
    view === "month"
      ? new Intl.DateTimeFormat(locale, { month: "long", year: "numeric", timeZone }).format(
          new Date(anchorIso),
        )
      : view === "week"
        ? `${formatDayKeyLabel(
            weekDays[0].dayKey,
            locale,
            { month: "short", day: "numeric" },
            timeZone,
          )} - ${formatDayKeyLabel(
            weekDays[6].dayKey,
            locale,
            { month: "short", day: "numeric", year: "numeric" },
            timeZone,
          )}`
        : formatDayKeyLabel(
            anchorKey,
            locale,
            { weekday: "long", month: "short", day: "numeric", year: "numeric" },
            timeZone,
          );

  function openDay(dayKey: string) {
    setAnchorIso(dayKeyToIsoAtNoon(dayKey, timeZone));
    setView("day");
  }

  const copy = {
    calendarDay: t("calendarDay"),
    calendarWeek: t("calendarWeek"),
    calendarMonth: t("calendarMonth"),
    previous: t("previous"),
    next: t("next"),
  };

  return (
    <CalendarFrame
      label={label}
      view={view}
      onViewChange={setView}
      onPrevious={() => setAnchorIso(shiftCalendarAnchor(anchorIso, view, -1, timeZone))}
      onNext={() => setAnchorIso(shiftCalendarAnchor(anchorIso, view, 1, timeZone))}
      copy={copy}
      viewsLabel={t("scheduleCalendar")}
    >
      {view === "day" &&
        ((mapByDay.get(anchorKey) ?? []).length === 0 ? (
          <CalendarEmpty>{t("noLessonsOnDay")}</CalendarEmpty>
        ) : (
          <ul className="list-none border-t border-border p-0">
            {(mapByDay.get(anchorKey) ?? []).map((item) => (
              <li key={item.id} className="border-b border-border">
                <ScheduleItemLink
                  item={item}
                  className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 py-3 transition-colors hover:bg-[var(--app-hover)]"
                >
                  <span
                    className={`min-w-0 font-semibold ${item.isPast ? "text-muted" : "text-foreground"}`}
                  >
                    {item.title}
                  </span>
                  <span className="shrink-0 text-sm tabular-nums text-muted">
                    {formatTime(item.startsAtIso)} – {formatTime(item.endsAtIso)} ·{" "}
                    {item.teacherName}
                    {item.isPast ? ` · ${t("statusCompleted")}` : ""}
                  </span>
                </ScheduleItemLink>
              </li>
            ))}
          </ul>
        ))}

      {view === "week" && !isMobile && (
        <CalendarWeekColumns
          days={weekDays}
          renderDay={(day) => {
            const dayItems = mapByDay.get(day.dayKey) ?? [];
            if (dayItems.length === 0) {
              return <CalendarEmpty size="cell">{t("unavailableShort")}</CalendarEmpty>;
            }
            return dayItems.slice(0, 4).map((item) => (
              <ScheduleItemLink
                key={item.id}
                item={item}
                className={`block rounded-md px-2 py-1 text-xs tabular-nums ${slotClasses({ kind: "booked", past: item.isPast })}`}
              >
                <span className="block whitespace-nowrap font-semibold">
                  {formatTime(item.startsAtIso)}
                </span>
                <span className="mt-0.5 block truncate text-[10px]">{t(item.isPast ? "statusCompleted" : "slotReserved")}</span>
              </ScheduleItemLink>
            ));
          }}
        />
      )}

      {/* Mobile week: the seven columns become one ruled agenda — the same
          content, read down instead of across. */}
      {view === "week" && isMobile && (
        <ul className="list-none border-t border-border p-0">
          {weekDays.map((day) => {
            const dayItems = mapByDay.get(day.dayKey) ?? [];
            return (
              <li key={day.dayKey} className="border-b border-border py-3">
                <p className="text-xs font-semibold text-muted">
                  {day.shortLabel}{" "}
                  <span className="text-sm font-black tabular-nums text-foreground">
                    {Number(day.dayKey.slice(-2))}
                  </span>
                </p>
                {dayItems.length === 0 ? (
                  <p className="mt-1 text-xs text-muted">{t("unavailableShort")}</p>
                ) : (
                  <div className="mt-2 space-y-1.5">
                    {dayItems.slice(0, 4).map((item) => (
                      <ScheduleItemLink
                        key={item.id}
                        item={item}
                        className={`block rounded-md px-2.5 py-1.5 text-xs tabular-nums ${slotClasses({ kind: "booked", past: item.isPast })}`}
                      >
                        <span className="font-semibold">
                          {formatTime(item.startsAtIso)} – {formatTime(item.endsAtIso)}
                        </span>
                        {item.teacherName ? (
                          <span className="ml-2">{item.teacherName}</span>
                        ) : null}
                      </ScheduleItemLink>
                    ))}
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      )}

      {view === "month" && !isMobile && (
        <CalendarMonthGrid
          cells={monthCells}
          weekdayHeaders={monthWeekdayHeaders}
          isQuiet={(cell) => (mapByDay.get(cell.dayKey)?.length ?? 0) === 0}
          onDayClick={(cell) => openDay(cell.dayKey)}
          renderCell={(cell) => {
            const dayItems = mapByDay.get(cell.dayKey) ?? [];
            const chips = dayItems.slice(0, 3);
            const more = dayItems.length - chips.length;
            return (
              <>
                {chips.map((item) => (
                  <ScheduleItemLink
                    key={item.id}
                    item={item}
                    className={`w-full truncate rounded px-1 py-0.5 text-left text-[9px] font-semibold leading-tight tabular-nums ${slotClasses({ kind: "booked", past: item.isPast })}`}
                  >
                    <span className="block truncate">{formatTime(item.startsAtIso)}</span>
                    <span className="mt-0.5 block truncate">{t(item.isPast ? "statusCompleted" : "slotReserved")}</span>
                    {item.teacherName ? (
                      <span className="mt-0.5 block truncate font-medium">{item.teacherName}</span>
                    ) : null}
                  </ScheduleItemLink>
                ))}
                {more > 0 ? (
                  <button
                    type="button"
                    onClick={() => openDay(cell.dayKey)}
                    className="px-0.5 text-left text-[9px] font-medium text-muted hover:underline"
                  >
                    +{more} more
                  </button>
                ) : null}
              </>
            );
          }}
        />
      )}

      {/* Mobile month: an agenda of the days that actually hold a lesson. */}
      {view === "month" &&
        isMobile &&
        (() => {
          const daysWithLessons = monthCells.filter(
            (cell) => cell.inCurrentMonth && (mapByDay.get(cell.dayKey)?.length ?? 0) > 0,
          );
          if (daysWithLessons.length === 0) {
            return <CalendarEmpty>{t("noLessonsOnDay")}</CalendarEmpty>;
          }
          return (
            <ul className="list-none border-t border-border p-0">
              {daysWithLessons.map((cell) => {
                const dayItems = mapByDay.get(cell.dayKey) ?? [];
                return (
                  <li key={cell.dayKey} className="border-b border-border py-3">
                    <button
                      type="button"
                      onClick={() => openDay(cell.dayKey)}
                      className="text-sm font-bold text-foreground hover:underline"
                    >
                      {formatDayKeyLabel(
                        cell.dayKey,
                        locale,
                        { weekday: "short", month: "short", day: "numeric" },
                        timeZone,
                      )}
                    </button>
                    <div className="mt-2 space-y-1.5">
                      {dayItems.map((item) => (
                        <ScheduleItemLink
                          key={item.id}
                          item={item}
                          className={`block rounded-md px-2.5 py-1.5 text-xs tabular-nums ${slotClasses({ kind: "booked", past: item.isPast })}`}
                        >
                          <span className="font-semibold">
                            {formatTime(item.startsAtIso)} – {formatTime(item.endsAtIso)}
                          </span>
                          {item.teacherName ? (
                            <span className="ml-2">{item.teacherName}</span>
                          ) : null}
                        </ScheduleItemLink>
                      ))}
                    </div>
                  </li>
                );
              })}
            </ul>
          );
        })()}
    </CalendarFrame>
  );
}
