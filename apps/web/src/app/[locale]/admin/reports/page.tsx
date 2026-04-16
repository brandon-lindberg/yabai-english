import { getTranslations } from "next-intl/server";
import { AdminReportsTable } from "@/components/admin/admin-reports-table";

export default async function AdminReportsPage() {
  const t = await getTranslations("admin.reportsPage");
  return (
    <main>
      <h1 className="text-2xl font-bold text-foreground">{t("title")}</h1>
      <p className="mt-2 text-sm text-muted">{t("subtitle")}</p>
      <div className="mt-8">
        <AdminReportsTable />
      </div>
    </main>
  );
}
