import { getTranslations } from "next-intl/server";
import { AdminRefundsTable } from "@/components/admin/admin-refunds-table";
import { PageHeader } from "@/components/ui/page-header";
import { AdminWebhookRecovery } from "@/components/admin/admin-webhook-recovery";
import { Link } from "@/i18n/navigation";
import { actionLinkClass } from "@/components/ui/inline-link";

export default async function AdminPaymentsPage({ searchParams }: { searchParams: Promise<{ person?: string }> }) {
  const t = await getTranslations("admin");
  const { person } = await searchParams;
  const personId = typeof person === "string" && person.length <= 200 ? person : undefined;
  return (
    <main>
      <PageHeader title={t("refundsPage.title")} description={t("refundsPage.subtitle")}
        actions={personId && <Link className={actionLinkClass} href="/admin/payments">{t("refundsPage.allExceptions")}</Link>} />
      <div className="mt-8">
        <AdminRefundsTable personId={personId} />
        {!personId && <AdminWebhookRecovery />}
      </div>
    </main>
  );
}
