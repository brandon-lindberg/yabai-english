import { getTranslations } from "next-intl/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "@/i18n/navigation";
import { getLocale } from "next-intl/server";
import { DashboardProfileForm } from "@/components/dashboard/dashboard-profile-form";

export default async function DashboardProfilePage() {
  const session = await auth();
  if (!session?.user?.id) return null;

  const locale = await getLocale();
  if (session.user.role !== "STUDENT") {
    redirect({ href: "/dashboard", locale });
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
