import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { isStudyLevelUnlocked } from "@/lib/study/access";
import { assertLevelOrder, nextStudyLevel } from "@/lib/study/constants";
import { studyAssessmentItemsJsonSchema } from "@/lib/study/schemas";
import { z } from "zod";

const bodySchema = z.object({
  assessmentId: z.string().min(1),
  answers: z.record(z.string(), z.number().int().min(0)),
});

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const json = await req.json().catch(() => null);
  const parsed = bodySchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid body" }, { status: 400 });
  }

  const assessment = await prisma.studyAssessment.findUnique({
    where: { id: parsed.data.assessmentId },
    include: { level: { include: { track: true } } },
  });
  if (!assessment || assessment.kind !== "LEVEL_EXIT") {
    return NextResponse.json({ error: "Assessment not found" }, { status: 404 });
  }

  const { level } = assessment;
  const unlocked = await isStudyLevelUnlocked(prisma, session.user.id, level.trackId, level.levelCode);
  if (!unlocked) {
    return NextResponse.json({ error: "Level locked" }, { status: 403 });
  }

  const itemsParsed = studyAssessmentItemsJsonSchema.safeParse(assessment.itemsJson);
  if (!itemsParsed.success) {
    return NextResponse.json({ error: "Invalid assessment data" }, { status: 500 });
  }

  const items = itemsParsed.data.items;
  let correct = 0;
  for (const item of items) {
    const chosen = parsed.data.answers[item.id];
    if (typeof chosen === "number" && chosen === item.correctIndex) correct += 1;
  }

  const score = items.length === 0 ? 0 : Math.round((correct / items.length) * 100);
  const passed = score >= assessment.passingScore;

  await prisma.$transaction(async (tx) => {
    await tx.userStudyAssessmentAttempt.create({
      data: {
        userId: session.user.id,
        assessmentId: assessment.id,
        score,
        answersJson: parsed.data.answers,
        passed,
      },
    });

    if (passed) {
      const now = new Date();
      await tx.userStudyLevelProgress.upsert({
        where: { userId_levelId: { userId: session.user.id, levelId: level.id } },
        create: {
          userId: session.user.id,
          levelId: level.id,
          assessmentPassedAt: now,
          completedAt: now,
        },
        update: {
          assessmentPassedAt: now,
          completedAt: now,
        },
      });

      const nextCode = nextStudyLevel(level.levelCode);
      if (nextCode) {
        if (!assertLevelOrder(level.levelCode, nextCode)) {
          throw new Error("Level order invariant failed");
        }
        const nextLevel = await tx.studyLevel.findUnique({
          where: { trackId_levelCode: { trackId: level.trackId, levelCode: nextCode } },
        });
        if (nextLevel) {
          await tx.userStudyLevelProgress.upsert({
            where: { userId_levelId: { userId: session.user.id, levelId: nextLevel.id } },
            create: { userId: session.user.id, levelId: nextLevel.id },
            update: {},
          });
        }
      }
    }
  });

  return NextResponse.json({
    score,
    passingScore: assessment.passingScore,
    passed,
    correctCount: correct,
    totalCount: items.length,
  });
}
