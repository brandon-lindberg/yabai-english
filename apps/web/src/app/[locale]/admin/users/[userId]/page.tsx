import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { AdminUserDetailForm } from "@/components/admin/admin-user-detail-form";
import { actionLinkClass } from "@/components/ui/inline-link";
import { adminPeopleHref } from "@/lib/admin/people-query";

type Props = {
  params: Promise<{ userId: string }>;
  searchParams: Promise<{ from?: string | string[] }>;
};

export default async function AdminUserDetailPage({ params, searchParams }: Props) {
  const t = await getTranslations("admin.userDetail");
  const { userId } = await params;
  const { from } = await searchParams;
  const backHref = adminPeopleHref(typeof from === "string" ? from : undefined);

  return (
    <main>
      <Link
        href={backHref}
        className={`${actionLinkClass} text-sm`}
      >
        {t("back")}
      </Link>
      <div className="mt-4">
        <AdminUserDetailForm userId={userId} backHref={backHref} />
      </div>
    </main>
  );
}
