import { getTranslations } from "next-intl/server";
import { prisma } from "@/lib/prisma";
import { TeacherCard } from "@/components/teacher-card";
import { TeacherFilterBar } from "@/components/teacher-filter-bar";
import { filterTeacherCards } from "@/lib/teacher-discovery";
import { auth } from "@/auth";
import { redirect } from "@/i18n/navigation";
import { getLocale } from "next-intl/server";
import { PageHeader } from "@/components/ui/page-header";
import { EmptyState } from "@/components/ui/empty-state";
import { Link } from "@/i18n/navigation";

type Props = {
  searchParams: Promise<{
    specialty?: string;
    language?: string;
  }>;
};

export default async function BookPage({ searchParams }: Props) {
  const t = await getTranslations("booking");
  const params = await searchParams;
  const session = await auth();
  const locale = await getLocale();
  if (session?.user?.role && session.user.role !== "STUDENT") {
    redirect({ href: "/dashboard", locale });
  }

  const specialty = params.specialty?.trim() ?? "";
  const language = params.language?.trim().toUpperCase() ?? "";

  const teacherProfiles = await prisma.teacherProfile.findMany({
    where:
      session?.user?.id && session.user.role === "STUDENT"
        ? {
            user: {
              chatThreadsAsTeacher: {
                none: {
                  studentId: session.user.id,
                  teacherBlockedAt: { not: null },
                },
              },
            },
          }
        : undefined,
    include: {
      user: true,
      availabilitySlots: {
        where: { active: true },
      },
    },
    orderBy: { userId: "asc" },
  });

  const cards = teacherProfiles.map((teacher) => ({
    id: teacher.id,
    displayName: teacher.displayName ?? teacher.user.name ?? "Teacher",
    imageUrl: teacher.user.image,
    countryOfOrigin: teacher.countryOfOrigin,
    specialties: teacher.specialties,
    instructionLanguages: teacher.instructionLanguages,
    rateYen: teacher.rateYen,
    activeAvailabilityCount: teacher.availabilitySlots.length,
  }));

  const filtered = filterTeacherCards(cards, { specialty, language });

  return (
    <main className="mx-auto max-w-5xl flex-1 px-4 py-10 sm:px-6">
      <PageHeader title={t("title")} description={t("teacherBrowseSubtitle")} />
      <div className="mt-6">
        <TeacherFilterBar specialty={specialty} language={language} />
      </div>
      <div className="mt-8 grid gap-4 sm:grid-cols-2">
        {filtered.length === 0 ? (
          <div className="sm:col-span-2">
            <EmptyState
              title={t("noTeachersFound")}
              description={t("teacherBrowseSubtitle")}
              action={
                <Link
                  href="/dashboard"
                  className="rounded-full border border-border px-4 py-2 text-sm font-semibold text-foreground hover:bg-[var(--app-hover)]"
                >
                  {t("backToDashboard")}
                </Link>
              }
            />
          </div>
        ) : (
          filtered.map((teacher) => <TeacherCard key={teacher.id} teacher={teacher} />)
        )}
      </div>
    </main>
  );
}
