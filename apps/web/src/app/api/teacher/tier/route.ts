import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { isTeacherCabinetRole } from "@/lib/dashboard/teacher-cabinet-role";
import { resolveEffectiveTeacherTier } from "@/lib/platform-fees";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id || !isTeacherCabinetRole(session.user.role)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const teacher = await prisma.teacherProfile.findUnique({
    where: { userId: session.user.id },
    select: {
      id: true,
      tierState: true,
      tierEvaluations: {
        orderBy: { createdAt: "desc" },
        take: 5,
      },
    },
  });
  if (!teacher) {
    return NextResponse.json({ error: "Teacher profile not found" }, { status: 404 });
  }

  const effective = resolveEffectiveTeacherTier(teacher.tierState, new Date());
  return NextResponse.json({
    teacherId: teacher.id,
    calculatedTier: teacher.tierState?.calculatedTier ?? "TIER_1",
    effectiveTier: effective.effectiveTier,
    source: effective.overrideActive ? "OVERRIDE" : "CALCULATED",
    firstPaidLessonAt: teacher.tierState?.firstPaidLessonAt ?? null,
    nextQuarterlyReviewAt: teacher.tierState?.nextQuarterlyReviewAt ?? null,
    nextAnnualReviewAt: teacher.tierState?.nextAnnualReviewAt ?? null,
    overrideExpiresAt: teacher.tierState?.overrideExpiresAt ?? null,
    evaluations: teacher.tierEvaluations,
  });
}
