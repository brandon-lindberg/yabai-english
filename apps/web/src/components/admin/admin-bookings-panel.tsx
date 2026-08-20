"use client";

import { useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import type { BookingStatus } from "@/generated/prisma/client";
import { useBrowserTimezone } from "@/hooks/use-browser-timezone";
import { bookingStatusKey, bookingStatusTone } from "@/lib/booking-status";
import { buttonClasses } from "@/components/ui/button";
import { DataRow } from "@/components/ui/data-row";
import { Field, Input, Select } from "@/components/ui/field";
import { GroupedList } from "@/components/ui/grouped-list";
import { Status } from "@/components/ui/status";
import { tabClasses } from "@/components/ui/sub-nav";

export type AdminBookingRow = {
  id: string;
  startsAtIso: string;
  lessonName: string;
  studentName: string;
  teacherName: string;
  status: BookingStatus;
  meetUrl: string | null;
};

const STATUSES: BookingStatus[] = [
  "PENDING_PAYMENT",
  "CONFIRMED",
  "COMPLETED",
  "CANCELLED",
];

/**
 * Every booking on the platform, in a shape you can actually work through.
 *
 * This was fifty rows in one undifferentiated column — no filter, no search,
 * nothing to separate one day from the next, and the date restated in full on
 * every line. Sorted, technically, and unnavigable in practice.
 *
 * Three things fix that, and none of them are new inventions: split upcoming
 * from past, because an admin is nearly always asking about one or the other;
 * group the rest by day, using the same `GroupedList` the lesson histories use;
 * and let a status or a name narrow it.
 *
 * Filtering is client-side on purpose. The server sends a bounded page, so this
 * is arranging what is already here rather than paging the table — which keeps
 * every control instant and adds no new endpoint.
 */
export function AdminBookingsPanel({
  bookings,
  locale,
  nowIso,
}: {
  bookings: AdminBookingRow[];
  locale: string;
  /** Taken on the server so the split does not shift between render and hydrate. */
  nowIso: string;
}) {
  const t = useTranslations("admin.bookingsPanel");
  const td = useTranslations("dashboard");
  const [scope, setScope] = useState<"upcoming" | "past">("upcoming");
  const [status, setStatus] = useState<BookingStatus | "ALL">("ALL");
  const [query, setQuery] = useState("");

  const now = useMemo(() => new Date(nowIso).getTime(), [nowIso]);

  /*
    Which day a booking belongs under is a question about the *viewer's* zone,
    not the server's, and for a platform spanning Japan and everywhere else the
    two disagree for several hours a day. Formatting with the runtime default
    would put the same lesson under two different headings either side of
    hydration, so the list waits for the real zone rather than guessing.
  */
  const timeZone = useBrowserTimezone();
  const dayFormat = useMemo(
    () =>
      timeZone
        ? new Intl.DateTimeFormat(locale, {
            weekday: "long",
            year: "numeric",
            month: "long",
            day: "numeric",
            timeZone,
          })
        : null,
    [locale, timeZone],
  );
  const timeFormat = useMemo(
    () => (timeZone ? new Intl.DateTimeFormat(locale, { timeStyle: "short", timeZone }) : null),
    [locale, timeZone],
  );

  const visible = useMemo(() => {
    const needle = query.trim().toLowerCase();
    const rows = bookings.filter((b) => {
      const at = new Date(b.startsAtIso).getTime();
      if (scope === "upcoming" ? at < now : at >= now) return false;
      if (status !== "ALL" && b.status !== status) return false;
      if (!needle) return true;
      return (
        b.studentName.toLowerCase().includes(needle) ||
        b.teacherName.toLowerCase().includes(needle) ||
        b.lessonName.toLowerCase().includes(needle)
      );
    });
    // Upcoming reads forwards — the next lesson first. Past reads backwards.
    return rows.sort((a, b) => {
      const delta =
        new Date(a.startsAtIso).getTime() - new Date(b.startsAtIso).getTime();
      return scope === "upcoming" ? delta : -delta;
    });
  }, [bookings, scope, status, query, now]);

  return (
    <div className="space-y-6">
      <div className="flex gap-6 border-b border-border">
        {(["upcoming", "past"] as const).map((s) => (
          <button
            key={s}
            type="button"
            onClick={() => setScope(s)}
            aria-pressed={scope === s}
            className={tabClasses(scope === s)}
          >
            {s === "upcoming" ? t("scopeUpcoming") : t("scopePast")}
          </button>
        ))}
      </div>

      <div className="flex flex-col gap-4 sm:flex-row sm:items-end">
        <Field label={t("searchLabel")} className="min-w-0 flex-1">
          {(field) => (
            <Input
              {...field}
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={t("searchPlaceholder")}
            />
          )}
        </Field>
        <Field label={t("statusLabel")} className="sm:w-56">
          {(field) => (
            <Select
              {...field}
              value={status}
              onChange={(e) => setStatus(e.target.value as BookingStatus | "ALL")}
            >
              <option value="ALL">{t("statusAll")}</option>
              {STATUSES.map((s) => (
                <option key={s} value={s}>
                  {td(bookingStatusKey(s))}
                </option>
              ))}
            </Select>
          )}
        </Field>
      </div>

      <p className="text-sm tabular-nums text-muted" role="status">
        {t("showing", { shown: visible.length, total: bookings.length })}
      </p>

      {dayFormat && timeFormat ? (
      <GroupedList
        items={visible}
        labelOf={(b) => dayFormat.format(new Date(b.startsAtIso))}
        keyOf={(b) => b.id}
        countLabel={(count) => t("countLabel", { count })}
        empty={
          <p className="border-y border-border py-6 text-sm text-muted">
            {scope === "upcoming" ? t("emptyUpcoming") : t("emptyPast")}
          </p>
        }
        renderItem={(b) => (
          <DataRow
            key={b.id}
            actions={
              b.meetUrl ? (
                /* A bare right-aligned text link read as detached from its row.
                   Same treatment as every other trailing row action. */
                <a
                  href={b.meetUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={buttonClasses({ variant: "secondary", size: "sm" })}
                >
                  {t("joinCta")}
                </a>
              ) : null
            }
          >
            <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
              {/* The day is the heading, so the row only needs the clock. */}
              <span className="text-sm font-semibold tabular-nums text-foreground">
                {timeFormat.format(new Date(b.startsAtIso))}
              </span>
              <span className="font-medium text-foreground">{b.lessonName}</span>
              <Status tone={bookingStatusTone(b.status)}>
                {td(bookingStatusKey(b.status))}
              </Status>
            </div>
            <p className="mt-0.5 text-sm text-muted">
              {b.studentName} — {b.teacherName}
            </p>
          </DataRow>
        )}
      />
      ) : (
        <p className="py-6 text-sm text-muted" aria-busy="true">
          …
        </p>
      )}
    </div>
  );
}
