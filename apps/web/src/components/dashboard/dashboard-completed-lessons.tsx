import { getLocale, getTranslations } from "next-intl/server";
import { DashboardProfileBioPreview } from "@/components/dashboard/dashboard-profile-bio-preview";
import { bookingStatusKey, bookingStatusTone } from "@/lib/booking-status";
import type { getStudentBookingsForDashboard } from "@/lib/dashboard/student-bookings";
import { InvoiceDownloadLinks } from "@/components/dashboard/invoice-download-links";
import { LessonListEmpty, LessonRow } from "@/components/dashboard/lesson-row";
import { LessonHistory } from "@/components/dashboard/lesson-history";

type Completed = Awaited<ReturnType<typeof getStudentBookingsForDashboard>>["completed"];

export async function DashboardCompletedLessons({ completed }: { completed: Completed }) {
  const locale = await getLocale();
  const t = await getTranslations("dashboard");
  const ts = await getTranslations("dashboard.schedulePage");

  return (
    <LessonHistory
      lessons={completed}
      // Grouped by teacher, the same way the teacher's history groups by
      // student. This list used to be flat, so twenty lessons across three
      // teachers read as twenty undifferentiated rows.
      counterpartOf={(b) => b.teacher.user.name ?? b.teacher.user.email ?? "\u2014"}
      keyOf={(b) => b.id}
      countLabel={(count) => ts("completedLessonsCount", { count })}
      empty={<LessonListEmpty>{t("schedulePage.completedEmpty")}</LessonListEmpty>}
      renderLesson={(b) => {
        const transcriptUrl = b.externalTranscriptUrl?.trim() ?? "";
        const notesMd = (b.completionNotesMd ?? "").trim();
        const notesDocUrl = b.notesDocId
          ? `https://docs.google.com/document/d/${b.notesDocId}/edit`
          : "";
        const transcriptRefs = b.transcriptArtifactIds ?? [];
        const smartNoteRefs = b.smartNotesIds ?? [];
        const recordingRefs = b.recordingIds ?? [];
        const showTeacherMaterials = transcriptUrl.length > 0 || notesMd.length > 0;
        const showGoogleRecap =
          notesDocUrl.length > 0 ||
          transcriptRefs.length > 0 ||
          smartNoteRefs.length > 0 ||
          recordingRefs.length > 0;

        return (
          <LessonRow
            key={b.id}
            bookingId={b.id}
            locale={locale}
            lessonNameJa={b.lessonProduct.nameJa}
            lessonNameEn={b.lessonProduct.nameEn}
            startsAtIso={b.startsAt.toISOString()}
            endsAtIso={b.endsAt.toISOString()}
            status={{ tone: bookingStatusTone(b.status), label: t(bookingStatusKey(b.status)) }}
            inlineActions={
              b.invoice ? (
                <InvoiceDownloadLinks
                  invoiceId={b.invoice.id}
                  englishLabel={t("downloadInvoiceEn")}
                  japaneseLabel={t("downloadInvoiceJa")}
                />
              ) : null
            }
          >
            {showTeacherMaterials ? (
              <div className="space-y-2">
                {transcriptUrl ? (
                  <p className="text-sm">
                    <a
                      href={transcriptUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="font-semibold text-link underline hover:opacity-90"
                    >
                      {ts("transcriptLinkStudentCta")}
                    </a>
                  </p>
                ) : null}
                {notesMd ? (
                  <div>
                    <p className="text-xs font-semibold text-foreground">
                      {ts("lessonNotesReadLabel")}
                    </p>
                    <DashboardProfileBioPreview markdown={notesMd} emptyLabel="" />
                  </div>
                ) : null}
              </div>
            ) : null}
            {showGoogleRecap ? (
              <div className="mt-3 space-y-2">
                <p className="text-xs font-semibold text-foreground">
                  {ts("googleRecapSectionLabel")}
                </p>
                {notesDocUrl ? (
                  <p className="text-sm">
                    <a
                      href={notesDocUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="font-semibold text-link underline hover:opacity-90"
                    >
                      {ts("googleDocNotesCta")}
                    </a>
                  </p>
                ) : null}
                {transcriptRefs.length > 0 ? (
                  <p className="text-xs text-muted">
                    {ts("syncedTranscriptRefsLabel")}: {transcriptRefs.join(", ")}
                  </p>
                ) : null}
                {smartNoteRefs.length > 0 ? (
                  <p className="text-xs text-muted">
                    {ts("syncedSmartNotesRefsLabel")}: {smartNoteRefs.join(", ")}
                  </p>
                ) : null}
                {recordingRefs.length > 0 ? (
                  <p className="text-xs text-muted">
                    {ts("syncedRecordingRefsLabel")}: {recordingRefs.join(", ")}
                  </p>
                ) : null}
              </div>
            ) : null}
          </LessonRow>
        );
      }}
    />
  );
}
