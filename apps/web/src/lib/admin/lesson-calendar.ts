import { z } from "zod";

export const adminLessonCalendarQuery = z.object({
  date: z.string().date().optional(),
  view: z.enum(["day", "week", "month"]).default("week"),
});

export type AdminLessonCalendarQuery = z.infer<typeof adminLessonCalendarQuery>;

export function adminPersonScheduleHref(userId: string, query?: AdminLessonCalendarQuery) {
  const path = `/admin/users/${encodeURIComponent(userId)}/schedule`;
  if (!query) return path;
  const params = new URLSearchParams({ view: query.view });
  if (query.date) params.set("date", query.date);
  return `${path}?${params}`;
}
