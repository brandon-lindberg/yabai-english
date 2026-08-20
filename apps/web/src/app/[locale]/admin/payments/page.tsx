import { getTranslations } from "next-intl/server";
import { AdminRefundsTable } from "@/components/admin/admin-refunds-table";
import { PageHeader } from "@/components/ui/page-header";

export default async function AdminPaymentsPage() {
  const t = await getTranslations("admin.refundsPage");
  return (
    <main>
      <PageHeader title={t("title")} description={t("subtitle")} />
      <div className="mt-8">
        <AdminRefundsTable />
      </div>
    </main>
  );
}
