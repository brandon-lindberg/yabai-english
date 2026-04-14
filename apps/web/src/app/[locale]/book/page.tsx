import { getTranslations } from "next-intl/server";
import { prisma } from "@/lib/prisma";
import { TeacherCard } from "@/components/teacher-card";
import { TeacherFilterBar } from "@/components/teacher-filter-bar";
import { filterTeacherCards } from "@/lib/teacher-discovery";
import { auth } from "@/auth";

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
    <main className="mx-auto max-w-4xl flex-1 px-4 py-10 sm:px-6">
      <h1 className="text-2xl font-bold text-foreground">{t("title")}</h1>
      <p className="mt-2 text-sm text-muted">{t("teacherBrowseSubtitle")}</p>
      <div className="mt-6">
        <TeacherFilterBar specialty={specialty} language={language} />
      </div>
      <div className="mt-6 grid gap-4 sm:grid-cols-2">
        {filtered.length === 0 ? (
          <p className="rounded-2xl border border-dashed border-border bg-surface p-6 text-sm text-muted sm:col-span-2">
            {t("noTeachersFound")}
          </p>
        ) : (
          filtered.map((teacher) => <TeacherCard key={teacher.id} teacher={teacher} />)
        )}
      </div>
    </main>
  );
}
