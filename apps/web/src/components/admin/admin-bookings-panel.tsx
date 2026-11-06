"use client";

import { useTranslations } from "next-intl";
import type { BookingStatus, LearningLanguage } from "@/generated/prisma/enums";
import { Link } from "@/i18n/navigation";
import { useBrowserTimezone } from "@/hooks/use-browser-timezone";
import { bookingStatusKey, bookingStatusTone } from "@/lib/booking-status";
import { buttonClasses } from "@/components/ui/button";
import { DataRow } from "@/components/ui/data-row";
import { GroupedList } from "@/components/ui/grouped-list";
import { actionLinkClass } from "@/components/ui/inline-link";
import { Status } from "@/components/ui/status";

export type AdminBookingRow = {
  id: string;
  learningLanguage: LearningLanguage;
  startsAtIso: string;
  lessonName: string;
  studentName: string;
  teacherName: string;
  status: BookingStatus;
  reschedulePending: boolean;
  meetUrl: string | null;
};

export function AdminBookingsPanel({ bookings, locale, search }: {
  bookings: AdminBookingRow[];
  locale: string;
  search: string;
}) {
  const t = useTranslations("admin.bookingsPanel");
  const dashboard = useTranslations("dashboard");
  const language = useTranslations("admin.teachingLanguages");
  const timeZone = useBrowserTimezone();
  if (!bookings.length) return <p className="border-y border-border py-6 text-sm text-muted">{t("emptyResults")}</p>;
  if (!timeZone) return <p role="status" className="py-6 text-sm text-muted">{t("loadingTimes")}</p>;

  const dayFormat = new Intl.DateTimeFormat(locale, { dateStyle: "full", timeZone });
  const timeFormat = new Intl.DateTimeFormat(locale, { timeStyle: "short", timeZone });
  const returnQuery = search ? `?${new URLSearchParams({ from: search })}` : "";
  return (
    <GroupedList
      items={bookings}
      labelOf={(b) => dayFormat.format(new Date(b.startsAtIso))}
      keyOf={(b) => b.id}
      countLabel={(count) => t("countLabel", { count })}
      empty={null}
      renderItem={(b) => (
        <DataRow key={b.id} dataId={b.id} actions={b.meetUrl && (
          <a href={b.meetUrl} target="_blank" rel="noopener noreferrer" className={buttonClasses({ variant: "secondary", size: "sm" })}>
            {t("joinCta")}
          </a>
        )}>
          <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
            <span className="text-sm font-semibold tabular-nums">{timeFormat.format(new Date(b.startsAtIso))}</span>
            <Link href={`/admin/lessons/${b.id}${returnQuery}`} className={`${actionLinkClass} break-words`}>{b.lessonName}</Link>
            <Status tone={bookingStatusTone(b.status)}>{dashboard(bookingStatusKey(b.status))}</Status>
            {b.reschedulePending && <Status tone="pending">{t("reschedulePending")}</Status>}
          </div>
          <p className="mt-1 break-words text-sm text-muted">{language(b.learningLanguage)} · {b.studentName} — {b.teacherName}</p>
        </DataRow>
      )}
    />
  );
}
