import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { toPublicExerciseContent } from "@/lib/learn/exercise-grading";

/**
 * The course tree.
 *
 * This route is unauthenticated and used to `include` every exercise whole,
 * which meant `Exercise.content` — answer key included — was served to anyone
 * who asked, for the entire curriculum, without signing in. Exercises are now
 * selected field by field and their content goes through
 * `toPublicExerciseContent`, the same stripper the lesson player uses.
 *
 * Prefer `select` over `include` for anything reachable from here: `include`
 * returns every column a model gains in future, which is how a key ends up in a
 * public payload without anyone editing this file.
 */
export async function GET() {
  const courses = await prisma.course.findMany({
    orderBy: { sortOrder: "asc" },
    include: {
      units: {
        orderBy: { sortOrder: "asc" },
        include: {
          skills: {
            orderBy: { sortOrder: "asc" },
            include: {
              lessons: {
                orderBy: { sortOrder: "asc" },
                include: {
                  exercises: {
                    orderBy: { sortOrder: "asc" },
                    select: {
                      id: true,
                      lessonId: true,
                      type: true,
                      content: true,
                      points: true,
                      sortOrder: true,
                    },
                  },
                },
              },
            },
          },
        },
      },
    },
  });

  return NextResponse.json(
    courses.map((course) => ({
      ...course,
      units: course.units.map((unit) => ({
        ...unit,
        skills: unit.skills.map((skill) => ({
          ...skill,
          lessons: skill.lessons.map((lesson) => ({
            ...lesson,
            exercises: lesson.exercises.map((exercise) => ({
              ...exercise,
              content: toPublicExerciseContent(exercise.type, exercise.content),
            })),
          })),
        })),
      })),
    })),
  );
}
