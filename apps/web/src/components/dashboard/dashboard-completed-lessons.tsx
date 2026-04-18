import { getLocale, getTranslations } from "next-intl/server";
import { DashboardProfileBioPreview } from "@/components/dashboard/dashboard-profile-bio-preview";
import { bookingStatusKey } from "@/lib/booking-status";
import type { getStudentBookingsForDashboard } from "@/lib/dashboard/student-bookings";

type Completed = Awaited<ReturnType<typeof getStudentBookingsForDashboard>>["completed"];

export async function DashboardCompletedLessons({ completed }: { completed: Completed }) {
  const locale = await getLocale();
  const t = await getTranslations("dashboard");
  const ts = await getTranslations("dashboard.schedulePage");

  if (completed.length === 0) {
    return (
      <li className="rounded-2xl border border-dashed border-border bg-surface p-6 text-muted">
        {t("schedulePage.completedEmpty")}
      </li>
    );
  }

  return (
    <>
      {completed.map((b) => {
        const transcriptUrl = b.externalTranscriptUrl?.trim() ?? "";
        const notesMd = (b.completionNotesMd ?? "").trim();
        const notesDocUrl = b.notesDocId
          ? `https://docs.google.com/document/d/${b.notesDocId}/edit`
          : "";
        const transcriptRefs = b.transcriptArtifactIds ?? [];
        const smartNoteRefs = b.smartNotesIds ?? [];
        const recordingRefs = b.recordingIds ?? [];
        const hasTranscript = transcriptUrl.length > 0;
        const hasNotes = notesMd.length > 0;
        const showTeacherMaterials = hasTranscript || hasNotes;
        const showGoogleRecap =
          notesDocUrl.length > 0 ||
          transcriptRefs.length > 0 ||
          smartNoteRefs.length > 0 ||
          recordingRefs.length > 0;

        return (
          <li
            key={b.id}
            id={`booking-${b.id}`}
            className="rounded-2xl border border-border bg-surface p-4 shadow-sm"
          >
            <div className="flex flex-col gap-1">
              <p className="font-medium text-foreground">
                {b.lessonProduct.nameJa} / {b.lessonProduct.nameEn}
              </p>
              <p className="text-sm text-muted">
                {b.startsAt.toLocaleString(locale, { dateStyle: "medium", timeStyle: "short" })} —{" "}
                {b.endsAt.toLocaleString(locale, { dateStyle: "medium", timeStyle: "short" })}
              </p>
              <p className="text-sm text-muted">
                {t("teacher")}: {b.teacher.user.name ?? b.teacher.user.email}
              </p>
              <div className="mt-2 flex flex-wrap gap-2">
                <span className="rounded-full border border-border bg-background px-2.5 py-1 text-xs font-medium text-foreground">
                  {t(bookingStatusKey(b.status))}
                </span>
                {b.invoice ? (
                  <a
                    href={`/api/invoices/${b.invoice.id}/pdf`}
                    className="rounded-full border border-border bg-surface px-3 py-1 text-xs font-medium text-foreground hover:bg-[var(--app-hover)]"
                  >
                    {t("downloadInvoice")}
                  </a>
                ) : null}
              </div>
              {showTeacherMaterials ? (
                <div className="mt-3 space-y-2">
                  {hasTranscript ? (
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
                  {hasNotes ? (
                    <div>
                      <p className="text-xs font-medium text-foreground">{ts("lessonNotesReadLabel")}</p>
                      <DashboardProfileBioPreview markdown={notesMd} emptyLabel="" />
                    </div>
                  ) : null}
                </div>
              ) : null}
              {showGoogleRecap ? (
                <div className="mt-3 space-y-2">
                  <p className="text-xs font-medium text-foreground">
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
            </div>
          </li>
        );
      })}
    </>
  );
}
