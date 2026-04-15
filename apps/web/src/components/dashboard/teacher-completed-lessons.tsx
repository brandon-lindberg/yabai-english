import { getTranslations } from "next-intl/server";
import {
  TeacherCompletedLessonsClient,
  type TeacherCompletedLessonItem,
} from "@/components/dashboard/teacher-completed-lessons-client";
import type { getTeacherBookingsForDashboard } from "@/lib/dashboard/teacher-bookings";

type Completed = Awaited<ReturnType<typeof getTeacherBookingsForDashboard>>["completed"];

function toClientLessons(completed: Completed): TeacherCompletedLessonItem[] {
  return completed.map((b) => ({
    id: b.id,
    startsAtIso: b.startsAt.toISOString(),
    endsAtIso: b.endsAt.toISOString(),
    lessonTitleJa: b.lessonProduct.nameJa,
    lessonTitleEn: b.lessonProduct.nameEn,
    studentDisplay: b.student.name ?? b.student.email ?? "—",
    initialCompletionNotesMd: b.completionNotesMd,
    initialExternalTranscriptUrl: b.externalTranscriptUrl,
    hasSavedContent: Boolean(
      (b.completionNotesMd ?? "").trim() || (b.externalTranscriptUrl ?? "").trim(),
    ),
  }));
}

export async function TeacherCompletedLessons({ completed }: { completed: Completed }) {
  const t = await getTranslations("dashboard.schedulePage");

  if (completed.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-border bg-surface p-6 text-muted">
        {t("completedEmpty")}
      </div>
    );
  }

  return <TeacherCompletedLessonsClient lessons={toClientLessons(completed)} />;
}
