import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const bodySchema = z.object({
  exerciseId: z.string().min(1),
  response: z.record(z.string(), z.any()),
  score: z.number().int().min(0),
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

  const exercise = await prisma.exercise.findUnique({
    where: { id: parsed.data.exerciseId },
    include: { lesson: { include: { skill: { include: { unit: true } } } } },
  });
  if (!exercise) {
    return NextResponse.json({ error: "Exercise not found" }, { status: 404 });
  }

  const computedStars = Math.min(3, Math.max(1, Math.ceil(parsed.data.score / 34)));
  const { lesson } = exercise;
  const courseId = lesson.skill.unit.courseId;

  const attempt = await prisma.$transaction(async (tx) => {
    const row = await tx.exerciseAttempt.create({
      data: {
        userId: session.user.id,
        exerciseId: exercise.id,
        score: parsed.data.score,
        response: parsed.data.response,
      },
    });

    const existingProgress = await tx.userLessonProgress.findUnique({
      where: {
        userId_lessonId: { userId: session.user.id, lessonId: lesson.id },
      },
    });
    const stars = Math.max(existingProgress?.stars ?? 0, computedStars);

    await tx.userLessonProgress.upsert({
      where: {
        userId_lessonId: { userId: session.user.id, lessonId: lesson.id },
      },
      create: {
        userId: session.user.id,
        lessonId: lesson.id,
        stars,
      },
      update: { stars },
    });

    const xpGain = Math.max(1, parsed.data.score);
    await tx.userCourseProgress.upsert({
      where: {
        userId_courseId: { userId: session.user.id, courseId },
      },
      create: { userId: session.user.id, courseId, xp: xpGain },
      update: { xp: { increment: xpGain } },
    });

    return row;
  });

  return NextResponse.json(attempt);
}
