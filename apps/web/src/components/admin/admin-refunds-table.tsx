"use client";

import { useLocale, useTranslations } from "next-intl";
import { useState } from "react";
import { Link } from "@/i18n/navigation";
import { LocalDateTime } from "@/components/local-datetime";
import { DataList, DataRow } from "@/components/ui/data-row";
import { Section } from "@/components/ui/section";
import { Skeleton } from "@/components/ui/skeleton";
import { Status } from "@/components/ui/status";
import { actionLinkClass } from "@/components/ui/inline-link";
import { useAdminCollection } from "@/hooks/use-admin-collection";
import { formatYen } from "@/lib/format-money";
import type { AdminPaymentRecoveryRow } from "@/lib/admin/payment-recovery-queue";
import type { AdminPaymentRecoveryQueue } from "@/lib/refund-recovery";
import { AdminParticipantLink } from "./admin-participant-link";
import { AdminPaymentRecoveryAction } from "./admin-payment-recovery-action";
import { AdminRefundStatus } from "./admin-refund-status";

const queues = [
  { value: "student", id: "student-reimbursements", title: "reimbursements", help: "reimbursementsHelp", empty: "reimbursementsEmpty" },
  { value: "fees", id: "platform-fee-returns", title: "platformFees", help: "platformFeesHelp", empty: "platformFeesEmpty" },
] as const satisfies ReadonlyArray<{ value: AdminPaymentRecoveryQueue; id: string; title: string; help: string; empty: string }>;

function RecoveryQueue({ queue, filters, revision, onCompleted }: {
  queue: typeof queues[number];
  filters: { personId?: string; bookingId?: string };
  revision: number;
  onCompleted: () => void;
}) {
  const t = useTranslations("admin.refundsPage");
  const language = useTranslations("admin.teachingLanguages");
  const locale = useLocale();
  const params = new URLSearchParams({ queue: queue.value, revision: String(revision) });
  if (filters.personId) params.set("person", filters.personId);
  if (filters.bookingId) params.set("booking", filters.bookingId);
  const { items, loading, error } = useAdminCollection<AdminPaymentRecoveryRow>(`/api/admin/payments/recovery?${params}`);
  const feeOnly = queue.value === "fees";
  return (
    <div id={queue.id} className="scroll-mt-32">
      <Section title={t(queue.title)} description={t(queue.help)}>
        {loading ? <div role="status" aria-label={t("loading")} className="space-y-2 py-2">
          <Skeleton width="1/2" height="4" />
          <Skeleton width="1/3" height="4" />
        </div> : error ? <p role="alert"><Status tone="error">{t("loadError")}</Status></p>
          : !items.length ? <p className="border-y border-border py-4 text-sm text-muted">{t(queue.empty)}</p>
          : <DataList>{items.map((row) => (
            <DataRow key={row.paymentId} dataId={row.paymentId} actions={row.canRetry && <AdminPaymentRecoveryAction
              paymentId={row.paymentId} feeOnly={feeOnly} onCompleted={onCompleted} />}>
              <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
                <AdminRefundStatus status={row.status} feeOnly={feeOnly} />
                {row.amountYen != null && <span className="font-semibold tabular-nums">{formatYen(row.amountYen, locale)}</span>}
              </div>
              {row.student && row.teacher && <p className="mt-2 text-sm">
                <AdminParticipantLink participant={row.student} /> <span className="text-muted">·</span> <AdminParticipantLink participant={row.teacher} />
              </p>}
              <p className="mt-1 break-words text-xs text-muted">
                {row.learningLanguage && <>{language(row.learningLanguage)} · </>}
                <LocalDateTime iso={row.createdAt} locale={locale} />
              </p>
              {row.recoveryNote && <p className="mt-2 max-w-prose whitespace-pre-wrap break-words text-sm text-muted">{row.recoveryNote}</p>}
              {row.providerRefundId && <p className="mt-1 break-all text-xs text-muted">{row.providerRefundId}</p>}
              {row.bookingId ? <Link href={`/admin/lessons/${row.bookingId}#${row.status ? "refunds" : "payment"}`}
                className={`${actionLinkClass} mt-2 inline-block text-sm`}>{t("viewBooking")}</Link>
                : <p className="mt-2 break-words text-xs text-muted">{row.paymentId} · {t("detachedPayment")}</p>}
            </DataRow>
          ))}</DataList>}
      </Section>
    </div>
  );
}

export function AdminRefundsTable({ personId, bookingId }: { personId?: string; bookingId?: string }) {
  const [revision, setRevision] = useState(0);
  return <>{queues.map((queue) => <RecoveryQueue key={queue.value} queue={queue}
    filters={{ personId, bookingId }} revision={revision} onCompleted={() => setRevision((value) => value + 1)} />)}</>;
}
