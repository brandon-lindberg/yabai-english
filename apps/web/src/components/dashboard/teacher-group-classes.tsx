import { getLocale, getTranslations } from "next-intl/server";
import { DataList, DataRow } from "@/components/ui/data-row";
import { Status } from "@/components/ui/status";
import { LocalBookingDateTimeRange } from "@/components/dashboard/local-booking-datetime-range";
import type { GroupClassRow } from "@/lib/dashboard/group-classes";

/**
 * Who is in each of the teacher's upcoming group classes.
 *
 * A private lesson answers "who" in its own row on the schedule; a class does
 * not, because a class is one time with several students in it. This is the
 * only surface that says which students, and it exists because it is the first
 * thing a teacher wants to know before a class they are about to teach.
 *
 * A class's state rides the DESIGN.md ladder rather than a colour: open while
 * it has room, settled once every seat is taken, spent when called off. Each
 * carries its own mark shape and its own words.
 */
export async function TeacherGroupClasses({
  classes,
  timeZone,
}: {
  classes: GroupClassRow[];
  timeZone: string;
}) {
  const locale = await getLocale();
  const t = await getTranslations("dashboard.schedulePage");

  if (classes.length === 0) {
    return (
      <p className="border-y border-border py-6 text-sm text-muted">
        {t("groupClassesEmpty")}
      </p>
    );
  }

  return (
    <DataList>
      {classes.map((row) => {
        const tone = row.cancelled ? "spent" : row.seats.full ? "settled" : "open";
        const label = row.cancelled
          ? t("groupClassesCancelled")
          : row.seats.full
            ? t("groupClassesFull")
            : t("groupClassesSeatsLeft", { count: row.seats.remaining });

        return (
          <DataRow key={row.sessionId} actions={<Status tone={tone}>{label}</Status>}>
            <p className="text-sm font-semibold tabular-nums text-foreground">
              <LocalBookingDateTimeRange
                locale={locale}
                startsAtIso={row.startsAt.toISOString()}
                endsAtIso={row.endsAt.toISOString()}
                timeZone={timeZone}
              />
            </p>
            <p className="mt-0.5 text-sm text-muted">
              <span className="tabular-nums">
                {t("groupClassesSeatCount", {
                  taken: row.seats.taken,
                  capacity: row.seats.capacity,
                })}
              </span>
              {row.students.length > 0
                ? ` · ${row.students.map((s) => s.name).join(", ")}`
                : ` · ${t("groupClassesNobodyYet")}`}
            </p>
          </DataRow>
        );
      })}
    </DataList>
  );
}
