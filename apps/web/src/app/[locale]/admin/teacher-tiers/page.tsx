import { getTranslations } from "next-intl/server";
import { prisma } from "@/lib/prisma";
import { resolveEffectiveTeacherTier } from "@/lib/platform-fees";
import {
  AdminTeacherTiersView,
  type AdminTeacherTierRow,
} from "@/components/admin/admin-teacher-tiers-view";

export default async function AdminTeacherTiersPage() {
  const t = await getTranslations("admin.teacherTiersPage");
  const teachers = await prisma.teacherProfile.findMany({
    orderBy: { userId: "asc" },
    include: {
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
      <h1 className="text-2xl font-bold text-foreground">{t("title")}</h1>
      <p className="mt-2 text-sm text-muted">{t("subtitle")}</p>
      <div className="mt-8">
        <AdminTeacherTiersView rows={rows} />
      </div>
    </main>
  );
}
