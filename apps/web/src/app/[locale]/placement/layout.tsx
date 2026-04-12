import type { ReactNode } from "react";
import { redirect } from "@/i18n/navigation";
import { requireAuth, requireStudentOnboardingComplete } from "@/lib/onboarding-gate";
import { isPlacementRetakeAllowed } from "@/lib/placement-cooldown";
import { prisma } from "@/lib/prisma";
import { getLocale } from "next-intl/server";

export default async function PlacementLayout({
  children,
}: {
  children: ReactNode;
}) {
  const locale = await getLocale();
  const user = await requireAuth(locale);
  if (user.role !== "STUDENT") {
    redirect({ href: "/dashboard", locale });
  }
  await requireStudentOnboardingComplete(locale, user);

  const profile = await prisma.studentProfile.findUnique({
    where: { userId: user.id },
    select: { placementCompletedAt: true },
  });
  if (!isPlacementRetakeAllowed(profile?.placementCompletedAt ?? null)) {
    redirect({ href: "/dashboard", locale });
  }

  return children;
}
