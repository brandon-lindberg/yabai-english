import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { ExerciseRunner } from "@/components/exercise-runner";
import { toPublicExerciseContent } from "@/lib/learn/exercise-grading";
import { getTranslations } from "next-intl/server";

type Props = { params: Promise<{ lessonId: string }> };

export default async function LessonPlayerPage({ params }: Props) {
  const { lessonId } = await params;
  const t = await getTranslations("learn");

  const lesson = await prisma.lesson.findUnique({
    where: { id: lessonId },
    include: {
      exercises: { orderBy: { sortOrder: "asc" } },
    },
  });
  if (!lesson) notFound();

  return (
    <main className="mx-auto max-w-lg flex-1 px-4 py-10 sm:px-6">
      <p className="text-sm font-medium text-link">{t("courses")}</p>
      <h1 className="mt-1 text-2xl font-bold text-foreground">
        {lesson.titleJa} / {lesson.titleEn}
      </h1>
      <div className="mt-8 space-y-6">
        {/*
          `toPublicExerciseContent` strips the answer key. The whole `content`
          column used to be serialised into the page, so `correctIndex` was
          readable in the HTML before the learner answered. It returns null for
          any type the server cannot grade, so an ungradable exercise can never
          be shipped with its raw content by accident.
        */}
        {lesson.exercises.map((ex) => (
          <ExerciseRunner
            key={ex.id}
            exercise={{
              id: ex.id,
              type: ex.type,
              content: toPublicExerciseContent(ex.type, ex.content),
            }}
          />
        ))}
      </div>
    </main>
  );
}
