import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { addTeacherTierMonths } from "@/lib/teacher-tiers";
import { resolveEffectiveTeacherTier } from "@/lib/platform-fees";

type Props = { params: Promise<{ id: string }> };

export async function POST(_req: Request, { params }: Props) {
  const session = await auth();
  if (!session?.user?.id || session.user.role !== "SUPER_ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { id } = await params;
  const evaluation = await prisma.teacherTierEvaluation.findUnique({
    where: { id },
    include: { teacher: { include: { tierState: true } } },
  });
  if (!evaluation || evaluation.status !== "PENDING_ADMIN_APPROVAL") {
    return NextResponse.json({ error: "Pending evaluation not found" }, { status: 404 });
  }

  const state = evaluation.teacher.tierState;
  const effectiveTier = resolveEffectiveTeacherTier(
    {
      calculatedTier: evaluation.recommendedTier,
      overrideTier: state?.overrideTier ?? null,
      overrideStartsAt: state?.overrideStartsAt ?? null,
      overrideExpiresAt: state?.overrideExpiresAt ?? null,
    },
    new Date(),
  ).effectiveTier;

  await prisma.teacherTierState.update({
    where: { teacherId: evaluation.teacherId },
    data: {
      calculatedTier: evaluation.recommendedTier,
      effectiveTier,
      tierYearStart: evaluation.periodEnd,
      lastEvaluationAt: new Date(),
      nextQuarterlyReviewAt: addTeacherTierMonths(evaluation.periodEnd, 3),
      nextAnnualReviewAt: addTeacherTierMonths(evaluation.periodEnd, 12),
    },
  });
  await prisma.teacherTierEvaluation.update({
    where: { id },
    data: {
      status: "ADMIN_APPROVED",
      appliedTier: evaluation.recommendedTier,
      reviewedByUserId: session.user.id,
      reviewedAt: new Date(),
    },
  });
  await prisma.teacherTierAuditLog.create({
    data: {
      teacherId: evaluation.teacherId,
      actorUserId: session.user.id,
      action: "ANNUAL_DEMOTION_APPROVED",
      previousTier: state?.calculatedTier ?? null,
      newTier: evaluation.recommendedTier,
      metadataJson: { evaluationId: id },
    },
  });
  return NextResponse.json({ ok: true });
}
