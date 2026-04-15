import { getTranslations } from "next-intl/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "@/i18n/navigation";
import { getLocale } from "next-intl/server";
import { DashboardProfileForm } from "@/components/dashboard/dashboard-profile-form";
import { TeacherProfileForm } from "@/components/dashboard/teacher-profile-form";

export default async function DashboardProfilePage() {
  const session = await auth();
  if (!session?.user?.id) return null;

  const locale = await getLocale();
  if (session.user.role === "ADMIN") {
    redirect({ href: "/dashboard", locale });
  }

  if (session.user.role === "TEACHER") {
    const t = await getTranslations("dashboard.profilePage");
    const profile = await prisma.teacherProfile.findUnique({
      where: { userId: session.user.id },
      select: {
        id: true,
        displayName: true,
        bio: true,
        countryOfOrigin: true,
        credentials: true,
        instructionLanguages: true,
        specialties: true,
        rateYen: true,
      },
    });

    return (
      <div className="space-y-6">
        <header>
          <h1 className="text-2xl font-bold text-foreground">{t("teacherTitle")}</h1>
          <p className="mt-2 text-muted">{t("teacherIntro")}</p>
        </header>
        <TeacherProfileForm
          initialTeacherProfileId={profile?.id ?? null}
          initialDisplayName={profile?.displayName ?? null}
          initialBio={profile?.bio ?? null}
          initialCountryOfOrigin={profile?.countryOfOrigin ?? null}
          initialCredentials={profile?.credentials ?? null}
          initialInstructionLanguages={profile?.instructionLanguages ?? ["EN"]}
          initialSpecialties={profile?.specialties ?? []}
          initialRateYen={profile?.rateYen ?? null}
        />
      </div>
    );
  }

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: {
      name: true,
      image: true,
      studentProfile: { select: { shortBio: true } },
    },
  });

  const t = await getTranslations("dashboard.profilePage");

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-bold text-foreground">{t("title")}</h1>
        <p className="mt-2 text-muted">{t("intro")}</p>
      </header>
      <DashboardProfileForm
        initialName={user?.name ?? null}
        initialShortBio={user?.studentProfile?.shortBio ?? null}
        avatarUrl={user?.image ?? null}
      />
    </div>
  );
}
