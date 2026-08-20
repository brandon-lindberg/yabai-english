import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";
import { gradeExercise, learnerResponseSchema } from "@/lib/learn/exercise-grading";

/*
  The body carries the learner's work and nothing else.

  It used to carry `score` as well, and this route trusted it — validating only
  that it was a non-negative integer before writing it to the attempt, the
  lesson's stars, and the course XP total. Any client could claim any score.

  `score` is deliberately absent from the schema rather than accepted-and-ignored:
  zod strips unknown keys, so an older client still sending one is not rejected,
  but there is no path by which that number can reach the database.
*/
const bodySchema = z.object({
  exerciseId: z.string().min(1),
  /*
    Narrow, not `z.record(z.string(), z.any())`. The loose version meant whatever
    JSON a client sent was persisted verbatim into `ExerciseAttempt.response` —
    an unbounded, unvalidated blob under user control. Zod strips what it does
    not know, so only the learner's actual choice is stored.
  */
  response: learnerResponseSchema,
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

  // Graded here, from the stored content and the exercise's own point value.
  const graded = gradeExercise({
    type: exercise.type,
    content: exercise.content,
    points: exercise.points,
    response: parsed.data.response,
  });
  if (!graded.ok) {
    const status = graded.reason === "malformed_response" ? 400 : 422;
    return NextResponse.json({ error: graded.reason }, { status });
  }

  const { lesson } = exercise;
  const courseId = lesson.skill.unit.courseId;
  const computedStars = Math.min(3, Math.max(1, Math.ceil(graded.score / 34)));

  const result = await prisma.$transaction(async (tx) => {
    const row = await tx.exerciseAttempt.create({
      data: {
        userId: session.user.id,
        exerciseId: exercise.id,
        score: graded.score,
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

    /*
      Course XP is awarded once per exercise, on the first correct attempt.

      Server-side grading alone does not close the hole it was opened for: a
      learner could still replay one exercise they know the answer to and
      increment course XP on every POST. Retries stay free — the attempt is
      always recorded and stars still rise — but the XP for an exercise is
      claimed once.
    */
    let xpAwarded = 0;
    if (graded.correct) {
      const priorCorrect = await tx.exerciseAttempt.findFirst({
        where: {
          userId: session.user.id,
          exerciseId: exercise.id,
          score: { gt: 0 },
          id: { not: row.id },
        },
        select: { id: true },
      });
      if (!priorCorrect) {
        xpAwarded = graded.score;
        await tx.userCourseProgress.upsert({
          where: {
            userId_courseId: { userId: session.user.id, courseId },
          },
          create: { userId: session.user.id, courseId, xp: xpAwarded },
          update: { xp: { increment: xpAwarded } },
        });
      }
    }

    return { row, xpAwarded };
  });

  // The key is returned only after the learner has committed to an answer,
  // which is what lets the runner show what the right one was.
  return NextResponse.json({
    ...result.row,
    correct: graded.correct,
    correctIndex: graded.correctIndex,
    xpAwarded: result.xpAwarded,
  });
}
