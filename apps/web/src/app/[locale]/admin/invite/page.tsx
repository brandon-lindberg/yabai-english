import { getTranslations } from "next-intl/server";
import { AdminCreateUser } from "@/components/admin/admin-create-user";
import { PageHeader } from "@/components/ui/page-header";

/** Manual account creation for an administrator who already has the person's email. */
export default async function AdminInvitePage() {
  const t = await getTranslations("admin.createUser");

  return (
    <main>
      <PageHeader title={t("title")} description={t("subtitle")} />
      <div className="mt-8">
        <AdminCreateUser />
      </div>
    </main>
  );
}
