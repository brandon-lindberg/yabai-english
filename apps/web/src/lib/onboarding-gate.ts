import { auth } from "@/auth";
import { redirect } from "@/i18n/navigation";
import { prisma } from "@/lib/prisma";
import { getOnboardingRedirectForRole } from "@/lib/onboarding-redirect";

export async function requireAuth(locale: string) {
  const session = await auth();
  const user = session?.user;
  if (!user) {
    redirect({ href: "/auth/signin", locale });
    throw new Error("Redirecting to sign-in");
  }
  return user;
}

export async function requireStudentOnboardingComplete(
  locale: string,
  currentUser?: { id: string; role: string },
) {
  const user = currentUser ?? (await requireAuth(locale));
  if (user.role !== "STUDENT") return user;

  const profile = await prisma.studentProfile.findUnique({
    where: { userId: user.id },
    select: { onboardingCompletedAt: true },
  });

  if (!profile?.onboardingCompletedAt) {
    redirect({ href: "/onboarding", locale });
  }

  return user;
}

export async function requireRoleOnboardingComplete(
  locale: string,
  currentUser?: { id: string; role: string },
) {
  const user = currentUser ?? (await requireAuth(locale));
  if (user.role === "STUDENT") {
    const profile = await prisma.studentProfile.findUnique({
      where: { userId: user.id },
      select: { onboardingCompletedAt: true },
    });
    const href = getOnboardingRedirectForRole({
      role: user.role,
      studentOnboardingCompleted: Boolean(profile?.onboardingCompletedAt),
    });
    if (href) {
      redirect({ href, locale });
    }
    return user;
  }
  if (user.role === "TEACHER") {
    const profile = await prisma.teacherProfile.findUnique({
      where: { userId: user.id },
      select: { onboardingCompletedAt: true },
    });
    const href = getOnboardingRedirectForRole({
      role: user.role,
      teacherOnboardingCompleted: Boolean(profile?.onboardingCompletedAt),
    });
    if (href) {
      redirect({ href, locale });
    }
    return user;
  }
  return user;
}
