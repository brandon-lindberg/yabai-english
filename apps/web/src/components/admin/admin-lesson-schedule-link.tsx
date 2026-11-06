"use client";

import { Link } from "@/i18n/navigation";
import { actionLinkClass } from "@/components/ui/inline-link";
import { useBrowserTimezone } from "@/hooks/use-browser-timezone";
import { adminPersonScheduleHref } from "@/lib/admin/lesson-calendar";
import { dayKeyFromIso } from "@/lib/slot-calendar";

export function AdminLessonScheduleLink({ personId, startsAtIso, children }: {
  personId: string;
  startsAtIso: string;
  children: string;
}) {
  const zone = useBrowserTimezone();
  const query = zone ? { date: dayKeyFromIso(startsAtIso, zone), view: "day" as const } : undefined;
  return <Link className={`${actionLinkClass} mt-2 block text-sm`} href={adminPersonScheduleHref(personId, query)}>{children}</Link>;
}
