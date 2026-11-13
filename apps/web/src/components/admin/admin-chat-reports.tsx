"use client";

import { useLocale, useTranslations } from "next-intl";
import { AdminParticipantLink } from "@/components/admin/admin-participant-link";
import { LocalDateTime } from "@/components/local-datetime";
import { DataList, DataRow } from "@/components/ui/data-row";
import { EmptyState } from "@/components/ui/empty-state";
import { Skeleton } from "@/components/ui/skeleton";
import { Status } from "@/components/ui/status";
import { useAdminCollection } from "@/hooks/use-admin-collection";

type Participant = { id: string; name: string | null; email: string | null };
type ThreadRow = {
  id: string;
  studentReportedAt: string | null;
  teacherReportedAt: string | null;
  studentReportReason: string | null;
  teacherReportReason: string | null;
  updatedAt: string;
  student: Participant;
  teacher: Participant;
};

function ReportParticipant({ participant, role, reportLabel, date, reason }: {
  participant: Participant;
  role: string;
  reportLabel: string;
  date: string | null;
  reason: string | null;
}) {
  const locale = useLocale();
  return (
    <div className="min-w-0">
      <p className="text-sm text-muted">{role}</p>
      <p className="font-semibold"><AdminParticipantLink participant={participant} /></p>
      {date && <div className="mt-3 space-y-1">
        <p className="text-sm text-muted">{reportLabel} · <LocalDateTime iso={date} locale={locale} /></p>
        {reason && <p className="max-w-prose whitespace-pre-wrap break-words text-sm">{reason}</p>}
      </div>}
    </div>
  );
}

export function AdminChatReports() {
  const t = useTranslations("admin.reportsPage");
  const roles = useTranslations("admin.grid.roles");
  const locale = useLocale();
  const { items, loading, error } = useAdminCollection<ThreadRow>("/api/admin/reports/chat-threads");

  if (loading) return (
    <div role="status" aria-busy="true" aria-label={t("loading")}>
      <DataList>{[1, 2, 3].map((row) => <DataRow key={row}><div className="space-y-2">
        <Skeleton height="4" width="1/3" />
        <Skeleton height="3" width="2/3" />
      </div></DataRow>)}</DataList>
    </div>
  );
  if (error) return <p role="alert"><Status tone="error">{error}</Status></p>;
  if (!items.length) return <EmptyState title={t("empty")} />;

  return (
    <DataList>
      {items.map((row) => (
        <DataRow key={row.id} dataId={row.id}>
          <div className="grid gap-4 sm:grid-cols-2">
            <ReportParticipant participant={row.student} role={roles("STUDENT")} reportLabel={t("studentReport")}
              date={row.studentReportedAt} reason={row.studentReportReason} />
            <ReportParticipant participant={row.teacher} role={roles("TEACHER")} reportLabel={t("teacherReport")}
              date={row.teacherReportedAt} reason={row.teacherReportReason} />
          </div>
          <p className="mt-4 text-xs text-muted">{t("when")} · <LocalDateTime iso={row.updatedAt} locale={locale} /></p>
        </DataRow>
      ))}
    </DataList>
  );
}
