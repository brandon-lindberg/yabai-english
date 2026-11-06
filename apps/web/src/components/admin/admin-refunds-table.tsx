"use client";

import { useLocale, useTranslations } from "next-intl";
import { useState } from "react";
import { Link } from "@/i18n/navigation";
import { LocalDateTime } from "@/components/local-datetime";
import { EmptyState } from "@/components/ui/empty-state";
import { Skeleton } from "@/components/ui/skeleton";
import { Status } from "@/components/ui/status";
import { actionLinkClass } from "@/components/ui/inline-link";
import { useAdminCollection } from "@/hooks/use-admin-collection";
import type { RefundStatus } from "@/generated/prisma/client";
import { AdminPaymentRecoveryAction } from "./admin-payment-recovery-action";

type RefundRow = {
  id: string;
  status: RefundStatus;
  paymentId: string;
  feeRecoveryPending: boolean;
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
  SUCCEEDED: "statusSucceeded",
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
  SUCCEEDED: "pending",
} as const;

export function AdminRefundsTable({ personId }: { personId?: string }) {
  const [revision, setRevision] = useState(0);
  const t = useTranslations("admin.refundsPage");
  const locale = useLocale();
  const { items, loading, error } = useAdminCollection<RefundRow>(
    `/api/admin/payments/refunds?${new URLSearchParams({ revision: String(revision), ...(personId ? { person: personId } : {}) })}`,
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
              <th className="px-3 py-2">{t("recoveryAction")}</th>
            </tr>
          </thead>
          <tbody>
            {Array.from({ length: 5 }).map((_, i) => (
              <tr key={i} className="border-b border-border last:border-0">
                <td className="px-3 py-2 align-top">
                  <Skeleton height="3" width="2/3" />
                </td>
                <td className="px-3 py-2 align-top"><Skeleton height="3" width="2/3" /></td>
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
            <th className="px-3 py-2">{t("recoveryAction")}</th>
          </tr>
        </thead>
        <tbody>
          {items.map((row) => (
            <tr key={row.id} data-payment-recovery={row.paymentId} className="border-b border-border last:border-0">
              <td className="px-3 py-2 align-top">
                <Status tone={STATUS_TONE[row.status]}>
                  {t(row.feeRecoveryPending ? "statusFeeRecovery" : STATUS_LABEL_KEY[row.status])}
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
              <td className="max-w-xs px-3 py-2 align-top text-xs">
                <p className="whitespace-pre-wrap break-words text-muted [overflow-wrap:anywhere]">{row.recoveryNote ?? "—"}</p>
                {row.providerRefundId ? (
                  <p className="mt-1 break-all text-muted">{row.providerRefundId}</p>
                ) : null}
              </td>
              <td className="px-3 py-2 align-top text-xs">
                <LocalDateTime iso={row.createdAt} locale={locale} />
              </td>
              <td className="px-3 py-2 align-top">{row.paymentId ? <AdminPaymentRecoveryAction paymentId={row.paymentId}
                feeOnly={row.feeRecoveryPending} onCompleted={() => setRevision(value => value + 1)} /> : null}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
