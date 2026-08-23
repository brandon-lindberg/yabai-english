import { getTranslations } from "next-intl/server";
import { LessonListEmpty } from "@/components/dashboard/lesson-row";
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
    canFetchNotesLink: Boolean(b.googleEventId),
    hasSavedContent: Boolean(
      (b.completionNotesMd ?? "").trim() || (b.externalTranscriptUrl ?? "").trim(),
    ),
    invoiceId: b.invoice?.id ?? null,
  }));
}

export async function TeacherCompletedLessons({ completed }: { completed: Completed }) {
  const t = await getTranslations("dashboard.schedulePage");

  if (completed.length === 0) {
    return (
      <ul className="list-none border-t border-border p-0">
        <LessonListEmpty>{t("completedEmpty")}</LessonListEmpty>
      </ul>
    );
  }

  return <TeacherCompletedLessonsClient lessons={toClientLessons(completed)} />;
}
