import { useLocale, useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { AVAILABILITY_BANDS } from "@/lib/availability-bands";
import { weekRangeLabel } from "@/lib/slot-calendar";
import { actionLinkClass } from "@/components/ui/inline-link";

/**
 * A glance at when a teacher is free, in the student's own hours.
 *
 * Drawn as a table, not a wall of divs. The filled cells *are* the content, so
 * a reader who cannot see them needs the days and the hours as real headers and
 * each cell to say which it is; a picture of availability that only worked
 * visually would say nothing at all to a screen reader.
 *
 * Ink rather than a colour, per the value ladder — a filled band is settled
 * fact, and hue here is reserved for warning and failure.
 */

export type PreviewDay = { dayKey: string; shortLabel: string; dayOfMonth: string };

export function TeacherAvailabilityPreview({
  days,
  grid,
  timeZone,
  profileHref,
}: {
  days: PreviewDay[];
  /** `grid[dayIndex][bandIndex]`. */
  grid: boolean[][];
  timeZone: string;
  profileHref: string;
}) {
  const t = useTranslations("booking");
  const locale = useLocale();
  const anyFree = grid.some((day) => day.some(Boolean));
  const pad = (hour: number) => String(hour).padStart(2, "0");

  return (
    <div className="space-y-3">
      <div>
        <h3 className="text-sm font-semibold text-foreground">
          {t("availabilityPreviewTitle")}
        </h3>
        {/* Which week. Weekday names and day numbers alone read as a generic
            timetable, and are ambiguous across a month boundary. */}
        <p className="mt-0.5 text-xs tabular-nums text-muted">
          {weekRangeLabel(
            [days[0].dayKey, days[days.length - 1].dayKey],
            locale,
            timeZone,
          )}
        </p>
      </div>

      {/*
        `table-fixed`: with automatic layout each column sizes to its own
        content, so the day showing "10" came out wider than the one showing
        "4" and the grid read as ragged. Fixed layout gives the hours column its
        declared width and splits the rest evenly between the days, which is
        what makes the marks comparable down a column.
      */}
      {anyFree ? (
        <table className="w-full table-fixed border-collapse text-[10px] tabular-nums">
          <thead>
            <tr>
              <td className="w-12" />
              {days.map((day) => (
                <th
                  key={day.dayKey}
                  scope="col"
                  className="pb-1 text-center font-medium text-muted"
                >
                  <span className="block">{day.shortLabel}</span>
                  <span className="block text-foreground">{day.dayOfMonth}</span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {AVAILABILITY_BANDS.map((band, bandIndex) => (
              <tr key={band.startHour}>
                <th
                  scope="row"
                  className="w-12 whitespace-nowrap pr-2 text-right font-normal text-muted"
                >
                  {`${pad(band.startHour)} – ${pad(band.endHour)}`}
                </th>
                {days.map((day, dayIndex) => {
                  const free = grid[dayIndex]?.[bandIndex] ?? false;
                  return (
                    <td key={day.dayKey} className="p-px">
                      <span
                        className={`block h-4 rounded-[2px] border ${
                          free
                            ? "border-foreground bg-foreground"
                            : "border-border bg-transparent"
                        }`}
                      >
                        <span className="sr-only">
                          {free ? t("availabilityPreviewFree") : t("availabilityPreviewBusy")}
                        </span>
                      </span>
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      ) : (
        <p className="text-xs text-muted">{t("availabilityPreviewNone")}</p>
      )}

      {/* The note explains how to read the marks; with no marks it explains
          nothing, so it goes with them. */}
      {anyFree ? (
        <p className="text-xs text-muted">
          {t("availabilityPreviewTimezone", { timeZone })}
        </p>
      ) : null}

      {/* A four-hour band means *some* of that band; picking a time happens on
          the teacher's own page. */}
      <Link href={profileHref} className={`${actionLinkClass} text-xs`}>
        {t("availabilityPreviewFullSchedule")}
      </Link>
    </div>
  );
}
