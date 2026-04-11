import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { isStudyLevelUnlocked } from "@/lib/study/access";
import { studyAssessmentItemsJsonSchema } from "@/lib/study/schemas";

type RouteContext = { params: Promise<{ assessmentId: string }> };

export async function GET(_req: Request, context: RouteContext) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { assessmentId } = await context.params;
  const assessment = await prisma.studyAssessment.findUnique({
    where: { id: assessmentId },
    include: { level: true },
  });
  if (!assessment) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const unlocked = await isStudyLevelUnlocked(
    prisma,
    session.user.id,
    assessment.level.trackId,
    assessment.level.levelCode,
  );
  if (!unlocked) {
    return NextResponse.json({ error: "Level locked" }, { status: 403 });
  }

  const parsed = studyAssessmentItemsJsonSchema.safeParse(assessment.itemsJson);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid assessment data" }, { status: 500 });
  }

  const items = parsed.data.items.map(({ id, promptJa, promptEn, options }) => ({
    id,
    promptJa,
    promptEn,
    options,
  }));

  return NextResponse.json({
    assessmentId: assessment.id,
    levelId: assessment.levelId,
    levelCode: assessment.level.levelCode,
    passingScore: assessment.passingScore,
    items,
  });
}
