"use client";

import { useLocale, useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { LocalDateTime } from "@/components/local-datetime";
import { EmptyState } from "@/components/ui/empty-state";
import { Skeleton } from "@/components/ui/skeleton";
import { Status } from "@/components/ui/status";
import { actionLinkClass } from "@/components/ui/inline-link";
import { useAdminCollection } from "@/hooks/use-admin-collection";
import type { RefundRecoveryStatus } from "@/lib/refund-recovery";

type RefundRow = {
  id: string;
  status: RefundRecoveryStatus;
  amountYen: number;
  actor: string;
  recoveryNote: string | null;
  providerRefundId: string | null;
  createdAt: string;
  bookingId: string;
  lessonStartsAt: string;
  student: { id: string; name: string | null; email: string | null };
  teacher: { id: string; name: string | null; email: string | null };
};

const STATUS_LABEL_KEY = {
  PENDING_RECOVERY: "statusPendingRecovery",
  FAILED: "statusFailed",
  PENDING: "statusPending",
} as const;

/**
 * PENDING sits on the status ladder — mid-transformation, not settled. The
 * other two are interruptions to it: the student is owed money that did not
 * arrive.
 */
const STATUS_TONE = {
  PENDING_RECOVERY: "error",
  FAILED: "error",
  PENDING: "pending",
} as const;

export function AdminRefundsTable() {
  const t = useTranslations("admin.refundsPage");
  const locale = useLocale();
  const { items, loading, error } = useAdminCollection<RefundRow>(
    "/api/admin/payments/refunds",
  );

  if (loading) {
    return (
      <div
        className="overflow-x-auto border-y border-border"
        role="status"
        aria-busy="true"
        aria-label={t("loading")}
        data-testid="admin-refunds-loading"
      >
        <table className="w-full min-w-[720px] border-collapse text-left text-sm tabular-nums">
          <thead>
            <tr className="border-b border-border bg-[var(--app-hover)]">
              <th className="px-3 py-2">{t("status")}</th>
              <th className="px-3 py-2">{t("people")}</th>
              <th className="px-3 py-2">{t("amount")}</th>
              <th className="px-3 py-2">{t("note")}</th>
              <th className="px-3 py-2">{t("when")}</th>
            </tr>
          </thead>
          <tbody>
            {Array.from({ length: 5 }).map((_, i) => (
              <tr key={i} className="border-b border-border last:border-0">
                <td className="px-3 py-2 align-top">
                  <Skeleton height="3" width="2/3" />
                </td>
                <td className="px-3 py-2 align-top">
                  <div className="space-y-2">
                    <Skeleton height="3" width="3/4" />
                    <Skeleton height="3" width="2/3" />
                  </div>
                </td>
                <td className="px-3 py-2 align-top">
                  <Skeleton height="3" width="1/2" />
                </td>
                <td className="px-3 py-2 align-top">
                  <Skeleton height="3" width="3/4" />
                </td>
                <td className="px-3 py-2 align-top">
                  <Skeleton height="3" width="2/3" />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  }

  if (error) {
    return (
      <p role="alert">
        <Status tone="error">{error}</Status>
      </p>
    );
  }

  if (items.length === 0) {
    return <EmptyState title={t("empty")} />;
  }

  return (
    <div className="overflow-x-auto border-y border-border">
      <table className="w-full min-w-[720px] border-collapse text-left text-sm tabular-nums">
        <thead>
          <tr className="border-b border-border bg-[var(--app-hover)]">
            <th className="px-3 py-2">{t("status")}</th>
            <th className="px-3 py-2">{t("people")}</th>
            <th className="px-3 py-2">{t("amount")}</th>
            <th className="px-3 py-2">{t("note")}</th>
            <th className="px-3 py-2">{t("when")}</th>
          </tr>
        </thead>
        <tbody>
          {items.map((row) => (
            <tr key={row.id} className="border-b border-border last:border-0">
              <td className="px-3 py-2 align-top">
                <Status tone={STATUS_TONE[row.status]}>
                  {t(STATUS_LABEL_KEY[row.status])}
                </Status>
              </td>
              <td className="px-3 py-2 align-top">
                <div className="space-y-1">
                  <div>
                    <span className="text-muted">{t("studentAbbr")}: </span>
                    <Link href={`/admin/users/${row.student.id}`} className={actionLinkClass}>
                      {row.student.name ?? row.student.email}
                    </Link>
                  </div>
                  <div>
                    <span className="text-muted">{t("teacherAbbr")}: </span>
                    <Link href={`/admin/users/${row.teacher.id}`} className={actionLinkClass}>
                      {row.teacher.name ?? row.teacher.email}
                    </Link>
                  </div>
                </div>
              </td>
              <td className="px-3 py-2 align-top font-medium">
                ¥{row.amountYen.toLocaleString("en-US")}
              </td>
              <td className="px-3 py-2 align-top text-xs">
                <p className="whitespace-pre-wrap text-muted">{row.recoveryNote ?? "—"}</p>
                {row.providerRefundId ? (
                  <p className="mt-1 font-mono text-muted">{row.providerRefundId}</p>
                ) : null}
              </td>
              <td className="px-3 py-2 align-top text-xs">
                <LocalDateTime iso={row.createdAt} locale={locale} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
