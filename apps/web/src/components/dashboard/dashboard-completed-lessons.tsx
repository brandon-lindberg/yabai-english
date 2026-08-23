import { getLocale, getTranslations } from "next-intl/server";
import { MarkdownClamp } from "@/components/ui/markdown-clamp";
import { bookingStatusKey, bookingStatusTone } from "@/lib/booking-status";
import type { getStudentBookingsForDashboard } from "@/lib/dashboard/student-bookings";
import { InvoiceDownloadLinks } from "@/components/dashboard/invoice-download-links";
import { LessonListEmpty, LessonRow } from "@/components/dashboard/lesson-row";
import { GroupedList } from "@/components/ui/grouped-list";
import { actionLinkClass } from "@/components/ui/inline-link";

type Completed = Awaited<ReturnType<typeof getStudentBookingsForDashboard>>["completed"];

export async function DashboardCompletedLessons({ completed }: { completed: Completed }) {
  const locale = await getLocale();
  const t = await getTranslations("dashboard");
  const ts = await getTranslations("dashboard.schedulePage");

  return (
    <GroupedList
      items={completed}
      // Grouped by teacher, the same way the teacher's history groups by
      // student. This list used to be flat, so twenty lessons across three
      // teachers read as twenty undifferentiated rows.
      labelOf={(b) => b.teacher.user.name ?? b.teacher.user.email ?? "\u2014"}
      keyOf={(b) => b.id}
      countLabel={(count) => ts("completedLessonsCount", { count })}
      empty={<LessonListEmpty>{t("schedulePage.completedEmpty")}</LessonListEmpty>}
      renderItem={(b) => {
        const transcriptUrl = b.externalTranscriptUrl?.trim() ?? "";
        const notesMd = (b.completionNotesMd ?? "").trim();
        const showTeacherMaterials = transcriptUrl.length > 0 || notesMd.length > 0;

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
                      className={actionLinkClass}
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
                    <MarkdownClamp markdown={notesMd} emptyLabel="" />
                  </div>
                ) : null}
              </div>
            ) : null}
          </LessonRow>
        );
      }}
    />
  );
}
