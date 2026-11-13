import { getTranslations } from "next-intl/server";
import { auth } from "@/auth";
import { AdminTeacherInvitations } from "@/components/admin/admin-teacher-invitations";
import { actionLinkClass } from "@/components/ui/inline-link";
import { PageHeader } from "@/components/ui/page-header";
import { Link } from "@/i18n/navigation";
import { prisma } from "@/lib/prisma";
import { listPendingTeacherInvitations } from "@/lib/teacher-invitations";

export default async function AdminTeacherInvitationPage() {
  const session = await auth();
  if (session?.user.role !== "SUPER_ADMIN") return null;
  const [t, invitations] = await Promise.all([getTranslations("admin.teacherInvitations"), listPendingTeacherInvitations(prisma)]);
  return <main className="max-w-4xl">
    <Link className={`${actionLinkClass} mb-4 inline-block text-sm`} href="/admin/users">{t("back")}</Link>
    <PageHeader title={t("title")} description={t("intro")} />
    <AdminTeacherInvitations invitations={invitations.map((invite) => ({ ...invite, expiresAt: invite.expiresAt.toISOString() }))} />
  </main>;
}
