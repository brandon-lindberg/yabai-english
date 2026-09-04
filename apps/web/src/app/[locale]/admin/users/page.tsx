import { getTranslations } from "next-intl/server";
import { AdminCreateUser } from "@/components/admin/admin-create-user";
import { AdminUserGrid } from "@/components/admin/admin-user-grid";
import { PageHeader } from "@/components/ui/page-header";

export default async function AdminUsersPage() {
  const t = await getTranslations("admin.usersPage");
  return (
    <main>
      <PageHeader title={t("title")} actions={<AdminCreateUser />} />
      <div className="mt-8">
        <AdminUserGrid mode="all" columnStorageKey="admin-grid-all" />
      </div>
    </main>
  );
}
