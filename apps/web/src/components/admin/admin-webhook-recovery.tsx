"use client";
import { useState } from "react";
import { useTranslations } from "next-intl";
import { useAdminCollection } from "@/hooks/use-admin-collection";
import { EmptyState } from "@/components/ui/empty-state";
import { Status } from "@/components/ui/status";
import { AdminPaymentRecoveryAction } from "./admin-payment-recovery-action";

type Delivery = { providerEventId: string; eventType: string; state: string; attempts: number; lastError: string | null };
export function AdminWebhookRecovery() {
  const t = useTranslations("admin.refundsPage"), [revision, setRevision] = useState(0);
  const { items, loading, error } = useAdminCollection<Delivery>(`/api/admin/payments/recovery?revision=${revision}`);
  return <section className="mt-10 space-y-4 border-t border-border pt-6">
    <h2 className="text-xl font-semibold">{t("deliveriesTitle")}</h2>
    <p className="max-w-prose text-sm text-muted">{t("deliveriesHelp")}</p>
    {loading ? <p role="status" className="text-sm text-muted">{t("loading")}</p>
      : error ? <p role="alert"><Status tone="error">{error}</Status></p>
      : !items.length ? <EmptyState title={t("deliveriesEmpty")} />
      : <div className="divide-y divide-border border-y border-border">{items.map(item => <article key={item.providerEventId} data-recovery-event={item.providerEventId} className="space-y-3 py-4">
        <p className="break-all text-sm font-semibold">{item.eventType}</p>
        <p className="break-all text-xs text-muted">{item.providerEventId} · {t("deliveryAttempts", { count: item.attempts })}</p>
        {item.lastError ? <p className="max-w-prose break-words text-sm text-muted">{item.lastError}</p> : null}
        <AdminPaymentRecoveryAction eventId={item.providerEventId} onCompleted={() => setRevision(value => value + 1)} />
      </article>)}</div>}
  </section>;
}
