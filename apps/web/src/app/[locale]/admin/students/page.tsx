import { getTranslations } from "next-intl/server";
import { AdminUserGrid } from "@/components/admin/admin-user-grid";
import { PageHeader } from "@/components/ui/page-header";

export default async function AdminStudentsPage() {
  const t = await getTranslations("admin.studentsPage");
  return (
    <main>
      <PageHeader title={t("title")} />
      <div className="mt-8">
        <AdminUserGrid mode="students" columnStorageKey="admin-grid-students" />
      </div>
    </main>
  );
}
