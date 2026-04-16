import { getTranslations } from "next-intl/server";
import { AdminUserGrid } from "@/components/admin/admin-user-grid";

export default async function AdminUsersPage() {
  const t = await getTranslations("admin.usersPage");
  return (
    <main>
      <h1 className="text-2xl font-bold text-foreground">{t("title")}</h1>
      <div className="mt-8">
        <AdminUserGrid mode="all" columnStorageKey="admin-grid-all" />
      </div>
    </main>
  );
}
