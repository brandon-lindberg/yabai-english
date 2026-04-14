import { getLocale } from "next-intl/server";
import type { getTeacherBookingsForDashboard } from "@/lib/dashboard/teacher-bookings";

type Completed = Awaited<ReturnType<typeof getTeacherBookingsForDashboard>>["completed"];

export async function TeacherCompletedLessons({ completed }: { completed: Completed }) {
  const locale = await getLocale();

  if (completed.length === 0) {
    return (
      <li className="rounded-2xl border border-dashed border-border bg-surface p-6 text-muted">
        No completed lessons yet.
      </li>
    );
  }

  return (
    <>
      {completed.map((b) => (
        <li key={b.id} className="rounded-2xl border border-border bg-surface p-4 shadow-sm">
          <div className="flex flex-col gap-1">
            <p className="font-medium text-foreground">
              {b.lessonProduct.nameJa} / {b.lessonProduct.nameEn}
            </p>
            <p className="text-sm text-muted">
              {b.startsAt.toLocaleString(locale, { dateStyle: "medium", timeStyle: "short" })} -{" "}
              {b.endsAt.toLocaleString(locale, { dateStyle: "medium", timeStyle: "short" })}
            </p>
            <p className="text-sm text-muted">Student: {b.student.name ?? b.student.email}</p>
          </div>
        </li>
      ))}
    </>
  );
}
