"use client";

import { useCallback, useMemo, useState, type ReactNode } from "react";
import { useLocale, useTranslations } from "next-intl";
import { useIsMobile } from "@/hooks/use-is-mobile";
import { useIsWideScreen } from "@/hooks/use-is-wide-screen";
import {
  CalendarEmpty,
  CalendarFrame,
  CalendarMonthGrid,
  CalendarWeekColumns,
} from "@/components/ui/calendar-frame";
import { shiftCalendarAnchor, type CalendarViewMode } from "@/lib/calendar-view";
import { slotClasses } from "@/components/ui/slot-state";
import { Link } from "@/i18n/navigation";
import { BookingDetailModal } from "@/components/booking/booking-detail-modal";
import { bookingChipWho } from "@/lib/booking-chip-label";
import type { DashboardScheduleItem } from "@/lib/dashboard/schedule-items";
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
 * name is on the other side of the lesson, and who may act on it. This used to
 * be a second hand-built copy of the slot picker's day/week/month scaffolding;
 * it now shares `ui/calendar-frame` with the picker, the teacher availability
 * editor and the school schedule, so all five move together.
 *
 * The grid holds both halves of a lesson's life. An upcoming lesson is a
 * commitment and takes the value ladder's strongest state, solid ink; a lesson
 * already taught is a record and drops to the spent state. A teacher scanning a
 * week must never mistake one for the other, and the distinction is value, not
 * hue, so it survives colour blindness and either theme.
 */

type Props = {
  items: DashboardScheduleItem[];
  timeZone: string;
  /**
   * Who is looking. Decides whose name the dialog calls the other party, and
   * whether finishing payment is offered — a teacher is never shown a button
   * to charge somebody else's card.
   */
  viewer: "teacher" | "student";
};

/**
 * Where a mark on the grid leads.
 *
 * A lesson still ahead is a reservation, and opens its details in place. One
 * already taught is a record — its notes and invoice live on the completed
 * history page — so it stays a link to that page rather than a dialog offering
 * to cancel something that already happened.
 */
function ScheduleItemAction({
  item,
  label,
  className,
  onOpen,
  children,
}: {
  item: DashboardScheduleItem;
  /** The accessible name: the chip itself has room for far less. */
  label: string;
  className?: string;
  onOpen: (id: string) => void;
  children: ReactNode;
}) {
  if (item.isPast) {
    return (
      <Link
        href={`/dashboard/schedule/completed#booking-${item.id}`}
        aria-label={label}
        data-testid="schedule-chip"
        data-booking-id={item.id}
        className={className}
      >
        {children}
      </Link>
    );
  }
  return (
    <button
      type="button"
      onClick={() => onOpen(item.id)}
      aria-label={label}
      data-testid="schedule-chip"
      data-booking-id={item.id}
      className={className}
    >
      {children}
    </button>
  );
}

export function DashboardScheduleCalendar({ items, timeZone, viewer }: Props) {
  const locale = useLocale();
  const isMobile = useIsMobile();
  const t = useTranslations("dashboard");
  const tb = useTranslations("booking");
  /*
    A month is what a person wants when they have the room for it: the whole
    shape of a month's teaching or study at once, rather than paging a week at
    a time. Null means "not chosen", so the default follows the viewport until
    someone picks a view, and stays put once they have.
  */
  const isWideScreen = useIsWideScreen();
  const [chosenView, setView] = useState<CalendarViewMode | null>(null);
  const view = chosenView ?? (isWideScreen ? "month" : "week");
  // Open on the next lesson, not the first item: `items` now leads with the
  // upcoming ones but carries the whole past archive behind them, and anchoring
  // on `items[0]` blindly would land the teacher in their oldest lesson ever
  // the moment they have nothing booked.
  const [anchorIso, setAnchorIso] = useState(
    () => items.find((item) => !item.isPast)?.startsAtIso ?? new Date().toISOString(),
  );
  const [openBookingId, setOpenBookingId] = useState<string | null>(null);
  const openedItem = items.find((item) => item.id === openBookingId) ?? null;

  const formatTime = useCallback(
    (iso: string) =>
      new Date(iso).toLocaleTimeString(locale, {
        hour: "2-digit",
        minute: "2-digit",
        timeZone,
      }),
    [locale, timeZone],
  );

  const groupSeatsLabel = useCallback(
    (seats: { capacity: number; taken: number }) =>
      tb("slotGroupSeats", { taken: seats.taken, capacity: seats.capacity }),
    [tb],
  );

  // A group class has no single person to name, so the chip says how full it is
  // instead; the dialog behind it carries the rest.
  const chipWho = useCallback(
    (item: DashboardScheduleItem) =>
      bookingChipWho(
        { counterpartLabel: item.counterpartName, groupSeats: item.groupSeats },
        groupSeatsLabel,
      ),
    [groupSeatsLabel],
  );

  /**
   * The chip's accessible name.
   *
   * "Reserved" and "Completed" are what the value ladder says in ink, and the
   * chip has no line to spare for them — a 40-minute block affords two, and
   * they were being spent on the state instead of on who the lesson is with.
   * Said here, so nothing is lost to anyone reading the page rather than
   * looking at it.
   */
  const chipLabel = useCallback(
    (item: DashboardScheduleItem) =>
      [
        t(item.isPast ? "statusCompleted" : "slotReserved"),
        `${formatTime(item.startsAtIso)} – ${formatTime(item.endsAtIso)}`,
        chipWho(item),
      ].join(" · "),
    [t, formatTime, chipWho],
  );

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

  /** Time, then who it is with. Both truncate, so back-to-back blocks degrade
   *  to a readable time rather than an ellipsis on every line. */
  function ChipLines({ item }: { item: DashboardScheduleItem }) {
    return (
      <>
        <span className="block truncate font-semibold">{formatTime(item.startsAtIso)}</span>
        <span className="mt-0.5 block truncate">{chipWho(item)}</span>
      </>
    );
  }

  return (
    <>
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
                  <ScheduleItemAction
                    item={item}
                    label={chipLabel(item)}
                    onOpen={setOpenBookingId}
                    className="flex w-full flex-wrap items-baseline justify-between gap-x-4 gap-y-1 py-3 text-left transition-colors hover:bg-[var(--app-hover)]"
                  >
                    <span
                      className={`min-w-0 font-semibold ${item.isPast ? "text-muted" : "text-foreground"}`}
                    >
                      {item.title}
                    </span>
                    <span className="shrink-0 text-sm tabular-nums text-muted">
                      {formatTime(item.startsAtIso)} – {formatTime(item.endsAtIso)} ·{" "}
                      {chipWho(item)}
                      {item.isPast ? ` · ${t("statusCompleted")}` : ""}
                    </span>
                  </ScheduleItemAction>
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
                <ScheduleItemAction
                  key={item.id}
                  item={item}
                  label={chipLabel(item)}
                  onOpen={setOpenBookingId}
                  className={`block w-full overflow-hidden rounded-md px-2 py-1 text-left text-xs tabular-nums ${slotClasses({ kind: "booked", past: item.isPast, interactive: true })}`}
                >
                  <ChipLines item={item} />
                </ScheduleItemAction>
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
                        <ScheduleItemAction
                          key={item.id}
                          item={item}
                          label={chipLabel(item)}
                          onOpen={setOpenBookingId}
                          className={`flex w-full items-baseline gap-2 rounded-md px-2.5 py-1.5 text-left text-xs tabular-nums ${slotClasses({ kind: "booked", past: item.isPast, interactive: true })}`}
                        >
                          <span className="shrink-0 font-semibold">
                            {formatTime(item.startsAtIso)} – {formatTime(item.endsAtIso)}
                          </span>
                          <span className="truncate">{chipWho(item)}</span>
                        </ScheduleItemAction>
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
                    <ScheduleItemAction
                      key={item.id}
                      item={item}
                      label={chipLabel(item)}
                      onOpen={setOpenBookingId}
                      className={`w-full overflow-hidden rounded px-1 py-0.5 text-left text-[9px] font-semibold leading-tight tabular-nums ${slotClasses({ kind: "booked", past: item.isPast, interactive: true })}`}
                    >
                      <ChipLines item={item} />
                    </ScheduleItemAction>
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
                          <ScheduleItemAction
                            key={item.id}
                            item={item}
                            label={chipLabel(item)}
                            onOpen={setOpenBookingId}
                            className={`flex w-full items-baseline gap-2 rounded-md px-2.5 py-1.5 text-left text-xs tabular-nums ${slotClasses({ kind: "booked", past: item.isPast, interactive: true })}`}
                          >
                            <span className="shrink-0 font-semibold">
                              {formatTime(item.startsAtIso)} – {formatTime(item.endsAtIso)}
                            </span>
                            <span className="truncate">{chipWho(item)}</span>
                          </ScheduleItemAction>
                        ))}
                      </div>
                    </li>
                  );
                })}
              </ul>
            );
          })()}
      </CalendarFrame>

      <BookingDetailModal
        timeZone={timeZone}
        viewer={viewer}
        booking={
          openedItem
            ? {
                id: openedItem.id,
                startsAtIso: openedItem.startsAtIso,
                endsAtIso: openedItem.endsAtIso,
                status: openedItem.status,
                counterpartLabel: openedItem.counterpartName,
                lessonLabel: openedItem.title,
                durationMin: openedItem.durationMin,
                priceYen: openedItem.priceYen,
                meetUrl: openedItem.meetUrl,
                groupSeats: openedItem.groupSeats,
                classmates: openedItem.classmates,
              }
            : null
        }
        onClose={() => setOpenBookingId(null)}
      />
    </>
  );
}
