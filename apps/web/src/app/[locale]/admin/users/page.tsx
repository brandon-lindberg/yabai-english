import { getTranslations } from "next-intl/server";
import { AdminUserGrid } from "@/components/admin/admin-user-grid";
import { PageHeader } from "@/components/ui/page-header";

export default async function AdminUsersPage() {
  const t = await getTranslations("admin.usersPage");
  return (
    <main>
      <PageHeader title={t("title")} />
      <div className="mt-8">
        <AdminUserGrid mode="all" columnStorageKey="admin-grid-all" />
      </div>
    </main>
  );
}
