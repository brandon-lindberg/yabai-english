import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { AdminUserDetailForm } from "@/components/admin/admin-user-detail-form";

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
        className="text-sm text-link hover:underline"
      >
        {t("back")}
      </Link>
      <h1 className="mt-4 text-2xl font-bold text-foreground">{t("title")}</h1>
      <div className="mt-8">
        <AdminUserDetailForm userId={userId} />
      </div>
    </main>
  );
}
