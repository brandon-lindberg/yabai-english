import { getTranslations } from "next-intl/server";
import { AdminReportsTable } from "@/components/admin/admin-reports-table";
import { PageHeader } from "@/components/ui/page-header";

export default async function AdminReportsPage() {
  const t = await getTranslations("admin.reportsPage");
  return (
    <main>
      <PageHeader title={t("title")} description={t("subtitle")} />
      <div className="mt-8">
        <AdminReportsTable />
      </div>
    </main>
  );
}
