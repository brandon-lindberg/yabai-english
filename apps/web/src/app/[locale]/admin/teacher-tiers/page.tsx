import { getTranslations } from "next-intl/server";
import { PageHeader } from "@/components/ui/page-header";
import { prisma } from "@/lib/prisma";
import { resolveEffectiveTeacherTier } from "@/lib/platform-fees";
import {
  AdminTeacherTiersView,
  type AdminTeacherTierRow,
} from "@/components/admin/admin-teacher-tiers-view";

export default async function AdminTeacherTiersPage() {
  const t = await getTranslations("admin.teacherTiersPage");
  // `select`, not `include`: this reads every teacher on the platform, and
  // `include` pulled each one's `googleCalendarRefreshToken` with them.
  const teachers = await prisma.teacherProfile.findMany({
    orderBy: { userId: "asc" },
    select: {
      id: true,
      displayName: true,
      user: { select: { name: true, email: true } },
      tierState: true,
      tierEvaluations: {
        where: { status: "PENDING_ADMIN_APPROVAL" },
        orderBy: { createdAt: "desc" },
        take: 1,
        select: { id: true },
      },
    },
  });

  const rows: AdminTeacherTierRow[] = teachers.map((teacher) => {
    const effective = resolveEffectiveTeacherTier(teacher.tierState, new Date());
    return {
      teacherId: teacher.id,
      name: teacher.displayName ?? teacher.user.name ?? teacher.user.email ?? "Teacher",
      email: teacher.user.email,
      calculatedTier: teacher.tierState?.calculatedTier ?? "TIER_1",
      effectiveTier: effective.effectiveTier,
      overrideTier: effective.overrideActive ? teacher.tierState?.overrideTier ?? null : null,
      overrideExpiresAt: teacher.tierState?.overrideExpiresAt?.toISOString() ?? null,
      nextQuarterlyReviewAt: teacher.tierState?.nextQuarterlyReviewAt?.toISOString() ?? null,
      pendingEvaluationId: teacher.tierEvaluations[0]?.id ?? null,
    };
  });

  return (
    <main>
      <PageHeader title={t("title")} description={t("subtitle")} />
      <div className="mt-8">
        <AdminTeacherTiersView rows={rows} />
      </div>
    </main>
  );
}
