import { getTranslations } from "next-intl/server";
import { AdminUserGrid } from "@/components/admin/admin-user-grid";

export default async function AdminStudentsPage() {
  const t = await getTranslations("admin.studentsPage");
  return (
    <main>
      <h1 className="text-2xl font-bold text-foreground">{t("title")}</h1>
      <div className="mt-8">
        <AdminUserGrid mode="students" columnStorageKey="admin-grid-students" />
      </div>
    </main>
  );
}
