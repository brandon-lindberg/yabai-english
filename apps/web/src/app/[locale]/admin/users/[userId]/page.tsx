import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { AdminUserDetailForm } from "@/components/admin/admin-user-detail-form";
import { actionLinkClass } from "@/components/ui/inline-link";
import { PageHeader } from "@/components/ui/page-header";

type Props = {
  params: Promise<{ userId: string }>;
};

export default async function AdminUserDetailPage({ params }: Props) {
  const t = await getTranslations("admin.userDetail");
  const { userId } = await params;

  return (
    <main>
      <Link
        href="/admin/users"
        className={`${actionLinkClass} text-sm`}
      >
        {t("back")}
      </Link>
      <div className="mt-4">
        <PageHeader title={t("title")} />
      </div>
      <div>
        <AdminUserDetailForm userId={userId} />
      </div>
    </main>
  );
}
