import {
  PrismaClient,
  LessonTier,
  ExerciseType,
} from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const teacherUser = await prisma.user.upsert({
    where: { email: "teacher@english-studio.local" },
    update: { role: "TEACHER" },
    create: {
      email: "teacher@english-studio.local",
      name: "Demo Teacher",
      role: "TEACHER",
    },
  });

  await prisma.teacherProfile.upsert({
    where: { userId: teacherUser.id },
    update: {},
    create: { userId: teacherUser.id, displayName: "Demo Teacher" },
  });

  const products = [
    {
      tier: LessonTier.STANDARD,
      nameJa: "標準レッスン（30分）",
      nameEn: "Standard (30 min)",
      durationMin: 30,
      creditCost: 1,
    },
    {
      tier: LessonTier.STANDARD,
      nameJa: "標準レッスン（40分）",
      nameEn: "Standard (40 min)",
      durationMin: 40,
      creditCost: 1,
    },
    {
      tier: LessonTier.EIKAWA,
      nameJa: "英会話",
      nameEn: "Conversation (Eikawa)",
      durationMin: 30,
      creditCost: 1,
    },
    {
      tier: LessonTier.PRONUNCIATION_ACTING,
      nameJa: "発音・演技",
      nameEn: "Pronunciation — Acting",
      durationMin: 40,
      creditCost: 2,
    },
  ];

  for (const p of products) {
    await prisma.lessonProduct.upsert({
      where: {
        id: `seed-${p.tier}-${p.durationMin}`,
      },
      update: p,
      create: {
        id: `seed-${p.tier}-${p.durationMin}`,
        ...p,
      },
    });
  }

  const course = await prisma.course.upsert({
    where: { slug: "beginner-demo" },
    update: {},
    create: {
      slug: "beginner-demo",
      level: "beginner",
      titleJa: "初級デモ",
      titleEn: "Beginner demo",
      descriptionJa: "プラットフォームのデモ用ミニコースです。",
      descriptionEn: "A tiny demo course for the platform.",
      sortOrder: 0,
    },
  });

  const unit = await prisma.courseUnit.upsert({
    where: { id: "seed-unit-1" },
    update: {},
    create: {
      id: "seed-unit-1",
      courseId: course.id,
      titleJa: "あいさつ",
      titleEn: "Greetings",
      sortOrder: 0,
    },
  });

  const skill = await prisma.skill.upsert({
    where: { id: "seed-skill-1" },
    update: {},
    create: {
      id: "seed-skill-1",
      unitId: unit.id,
      titleJa: "基礎",
      titleEn: "Basics",
      sortOrder: 0,
    },
  });

  const lesson = await prisma.lesson.upsert({
    where: { id: "seed-lesson-1" },
    update: {},
    create: {
      id: "seed-lesson-1",
      skillId: skill.id,
      titleJa: "Hello",
      titleEn: "Hello",
      sortOrder: 0,
    },
  });

  await prisma.exercise.upsert({
    where: { id: "seed-ex-1" },
    update: {},
    create: {
      id: "seed-ex-1",
      lessonId: lesson.id,
      type: ExerciseType.MULTIPLE_CHOICE,
      content: {
        promptJa: "「こんにちは」に相当する英語は？",
        promptEn: 'Which phrase means "hello" in a general greeting?',
        options: ["Good night", "Hello", "Goodbye"],
        correctIndex: 1,
      },
      points: 30,
      sortOrder: 0,
    },
  });

  console.log("Seed complete.");
}

main()
  .then(() => prisma.$disconnect())
  .catch((e) => {
    console.error(e);
    void prisma.$disconnect();
    process.exit(1);
  });
