import { getTranslations } from "next-intl/server";
import { AdminUserGrid } from "@/components/admin/admin-user-grid";
import { PageHeader } from "@/components/ui/page-header";

export default async function AdminTeachersPage() {
  const t = await getTranslations("admin.teachersPage");
  return (
    <main>
      <PageHeader title={t("title")} />
      <div className="mt-8">
        <AdminUserGrid mode="teachers" columnStorageKey="admin-grid-teachers" />
      </div>
    </main>
  );
}
