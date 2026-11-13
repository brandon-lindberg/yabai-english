"use client";

import { useTransition } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "@/i18n/navigation";
import { ScheduleCalendar } from "@/components/dashboard-schedule-calendar";
import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/field";
import { useBrowserTimezone } from "@/hooks/use-browser-timezone";
import { adminLessonCalendarQuery, adminPersonScheduleHref, type AdminLessonCalendarQuery } from "@/lib/admin/lesson-calendar";
import { dayKeyFromIso, dayKeyToIsoAtNoon } from "@/lib/slot-calendar";

type Props = {
  personId: string;
  query: AdminLessonCalendarQuery;
  nowIso: string;
  items: React.ComponentProps<typeof ScheduleCalendar>["items"];
};

export function AdminPersonSchedule({ personId, query, nowIso, items }: Props) {
  const t = useTranslations("admin.lessonCalendar");
  const timeZone = useBrowserTimezone();
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  if (!timeZone) return <p role="status" className="text-sm text-muted">{t("loading")}</p>;

  const date = query.date ?? dayKeyFromIso(nowIso, timeZone);
  const { view } = query;
  function navigate(next: AdminLessonCalendarQuery) {
    startTransition(() => router.push(adminPersonScheduleHref(personId, next), { scroll: false }));
  }

  return (
    <div className="space-y-6" aria-busy={pending}>
      <form className="flex flex-wrap items-end gap-2" onSubmit={(event) => {
        event.preventDefault();
        const selected = new FormData(event.currentTarget).get("date");
        const parsed = adminLessonCalendarQuery.safeParse({ date: selected, view: "day" });
        if (parsed.success) navigate(parsed.data);
      }}>
        <Field label={t("date")} key={date}>
          {(field) => <Input {...field} name="date" type="date" defaultValue={date} required />}
        </Field>
        <Button variant="secondary" type="submit" disabled={pending}>{t("jump")}</Button>
        {pending && <span className="self-center text-sm text-muted" role="status">{t("loading")}</span>}
      </form>
      <ScheduleCalendar items={items} timeZone={timeZone} compactBelow={1024}
        navigation={{ anchorIso: dayKeyToIsoAtNoon(date, timeZone), view,
          onNavigate: (iso, mode) => navigate({ date: dayKeyFromIso(iso, timeZone), view: mode }) }}
        hrefOf={(item) => `/admin/lessons/${encodeURIComponent(item.id)}?${new URLSearchParams({ calendarPerson: personId, date, view })}`} />
    </div>
  );
}
