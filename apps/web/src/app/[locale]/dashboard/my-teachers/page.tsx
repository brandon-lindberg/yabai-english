import { getTranslations } from "next-intl/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { redirect, Link } from "@/i18n/navigation";
import { getLocale } from "next-intl/server";
import { getStudentRosterTeachers } from "@/lib/student-roster-teachers";
import { reconcileTeacherRosterFromBookings } from "@/lib/reconcile-teacher-roster-from-bookings";
import { PageHeader } from "@/components/ui/page-header";
import { MyTeachersEmpty } from "@/components/dashboard/my-teachers-empty";

export default async function DashboardMyTeachersPage() {
  const session = await auth();
  const locale = await getLocale();
  if (!session?.user?.id || session.user.role !== "STUDENT") {
    redirect({ href: "/dashboard", locale });
  }
  // Narrowed by guard above; `redirect` does not refine types for the checker.
  const studentUserId = session!.user.id;
  const t = await getTranslations("dashboard.myTeachersPage");

  await reconcileTeacherRosterFromBookings(prisma, { studentUserId });
  const teachers = await getStudentRosterTeachers(prisma, studentUserId);

  return (
    <div className="space-y-6">
      <PageHeader title={t("title")} description={t("intro")} />
      {teachers.length === 0 ? (
        <MyTeachersEmpty />
      ) : (
        <ul className="list-none border-t border-border p-0">
          {teachers.map((row) => (
            <li key={row.rosterEntryId}>
              <Link
                href={`/book/teachers/${row.teacherProfileId}`}
                className="block border-b border-border py-3 font-medium text-foreground transition-colors hover:bg-[var(--app-hover)]"
              >
                {row.displayName}
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
