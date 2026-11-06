import { getTranslations } from "next-intl/server";
import { AdminUserGrid } from "@/components/admin/admin-user-grid";
import { AdminPeopleNav } from "@/components/admin/admin-people-nav";
import { PageHeader } from "@/components/ui/page-header";
import { Link } from "@/i18n/navigation";
import { buttonClasses } from "@/components/ui/button";
import { adminPeopleQuery, defaultPeopleQuery, adminPeopleSearch } from "@/lib/admin/people-query";

export default async function AdminUsersPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const t = await getTranslations("admin.usersPage");
  const admin = await getTranslations("admin");
  const parsed = adminPeopleQuery.safeParse(await searchParams);
  const query = parsed.success ? parsed.data : defaultPeopleQuery;
  return (
    <main>
      <PageHeader title={t("title")} description={t("subtitle")} actions={<>
        <Link className={buttonClasses({ variant: "secondary" })} href="/admin/invite">{admin("createUser.open")}</Link>
        <Link className={buttonClasses()} href="/admin/invite/teacher">{admin("teacherInvitations.title")}</Link>
      </>} />
      <AdminPeopleNav active="directory" />
      <AdminUserGrid key={adminPeopleSearch(query)} initialQuery={query} columnStorageKey="admin-people-columns" />
    </main>
  );
}
