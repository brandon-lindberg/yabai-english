import { getTranslations } from "next-intl/server";
import { AdminCreateUser } from "@/components/admin/admin-create-user";
import { PageHeader } from "@/components/ui/page-header";

/**
 * Where a teacher gets an account.
 *
 * Teaching here is by invitation and there is no application flow, so this is
 * the whole of it: an address and a role. The account exists from that moment,
 * and the person signs in with Google using that address.
 *
 * Access is the admin layout's job — it already refuses anyone who is not a
 * super-admin — and the endpoint behind this checks again for itself.
 */
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
