"use client";
import { useState } from "react";
import { useTranslations } from "next-intl";
import { useAdminCollection } from "@/hooks/use-admin-collection";
import { EmptyState } from "@/components/ui/empty-state";
import { DataList, DataRow } from "@/components/ui/data-row";
import { Section } from "@/components/ui/section";
import { Status } from "@/components/ui/status";
import type { PaymentRecoveryState } from "@/generated/prisma/enums";
import { AdminPaymentRecoveryAction } from "./admin-payment-recovery-action";

type Delivery = { providerEventId: string; eventType: string; state: PaymentRecoveryState; attempts: number; lastError: string | null };
export function AdminWebhookRecovery() {
  const t = useTranslations("admin.refundsPage"), [revision, setRevision] = useState(0);
  const detail = useTranslations("admin.lessonDetail");
  const { items, loading, error } = useAdminCollection<Delivery>(`/api/admin/payments/recovery?revision=${revision}`);
  return <div id="stripe-deliveries" className="scroll-mt-32"><Section title={t("deliveriesTitle")} description={t("deliveriesHelp")}>
    {loading ? <p role="status" className="text-sm text-muted">{t("loading")}</p>
      : error ? <p role="alert"><Status tone="error">{t("loadError")}</Status></p>
      : !items.length ? <EmptyState title={t("deliveriesEmpty")} />
      : <DataList>{items.map(item => <DataRow key={item.providerEventId} dataId={item.providerEventId}
        actions={<AdminPaymentRecoveryAction eventId={item.providerEventId} onCompleted={() => setRevision(value => value + 1)} />}>
        <div className="flex flex-wrap items-baseline gap-2">
          <p className="break-all text-sm font-semibold">{item.eventType}</p>
          <Status tone={item.state === "NEEDS_ATTENTION" ? "error" : "pending"}>{detail(`recovery.${item.state}`)}</Status>
        </div>
        <p className="mt-1 break-all text-xs text-muted">{item.providerEventId} · {t("deliveryAttempts", { count: item.attempts })}</p>
        {item.lastError ? <p className="mt-2 max-w-prose break-words text-sm text-muted">{item.lastError}</p> : null}
      </DataRow>)}</DataList>}
  </Section></div>;
}
