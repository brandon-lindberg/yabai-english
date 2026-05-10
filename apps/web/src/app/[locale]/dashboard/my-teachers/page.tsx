import { getTranslations } from "next-intl/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { redirect, Link } from "@/i18n/navigation";
import { getLocale } from "next-intl/server";
import { getStudentRosterTeachers } from "@/lib/student-roster-teachers";

export default async function DashboardMyTeachersPage() {
  const session = await auth();
  const locale = await getLocale();
  if (!session?.user?.id || session.user.role !== "STUDENT") {
    redirect({ href: "/dashboard", locale });
  }

  const t = await getTranslations("dashboard.myTeachersPage");

  const teachers = await getStudentRosterTeachers(prisma, session.user.id);

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-bold text-foreground">{t("title")}</h1>
        <p className="mt-2 text-muted">{t("intro")}</p>
      </header>
      {teachers.length === 0 ? (
        <p className="text-sm text-muted">{t("empty")}</p>
      ) : (
        <ul className="space-y-2">
          {teachers.map((row) => (
            <li key={row.rosterEntryId}>
              <Link
                href={`/book/teachers/${row.teacherProfileId}`}
                className="block rounded-xl border border-border bg-surface/60 px-4 py-3 text-sm font-medium text-foreground hover:bg-[var(--app-hover)]"
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
