import { PrismaClient, LessonTier } from "@prisma/client";
import { seedPlacementBankQuestions } from "./seed-placement-bank";
import { seedStudyTrack } from "./seed-study";

const prisma = new PrismaClient();

const teacherSeedData = [
  {
    email: "teacher@english-studio.local",
    name: "Demo Teacher",
    displayName: "Mika Sato",
    countryOfOrigin: "Japan",
    instructionLanguages: ["JP", "EN"],
    specialties: ["conversation", "kids"],
    rateYen: 3200,
    slots: [
      {
        dayOfWeek: 1,
        startMin: 10 * 60,
        endMin: 11 * 60,
        timezone: "Asia/Tokyo",
        lessonLevel: "intermediate",
        lessonType: "conversation",
      },
      {
        dayOfWeek: 3,
        startMin: 19 * 60,
        endMin: 20 * 60,
        timezone: "Asia/Tokyo",
        lessonLevel: "intermediate",
        lessonType: "grammar",
      },
    ],
  },
  {
    email: "teacher01@english-studio.local",
    name: "Aoi Tanaka",
    displayName: "Aoi Tanaka",
    countryOfOrigin: "Japan",
    instructionLanguages: ["JP", "EN"],
    specialties: ["business", "conversation"],
    rateYen: 3800,
    slots: [
      { dayOfWeek: 2, startMin: 8 * 60, endMin: 9 * 60, timezone: "Asia/Tokyo" },
      { dayOfWeek: 5, startMin: 20 * 60, endMin: 21 * 60, timezone: "Asia/Tokyo" },
    ],
  },
  {
    email: "teacher02@english-studio.local",
    name: "Ken Watanabe",
    displayName: "Ken Watanabe",
    countryOfOrigin: "Japan",
    instructionLanguages: ["JP", "EN"],
    specialties: ["exam", "conversation"],
    rateYen: 3600,
    slots: [
      { dayOfWeek: 0, startMin: 9 * 60, endMin: 10 * 60, timezone: "Asia/Tokyo" },
      { dayOfWeek: 4, startMin: 18 * 60, endMin: 19 * 60, timezone: "Asia/Tokyo" },
    ],
  },
  {
    email: "teacher03@english-studio.local",
    name: "Emily Carter",
    displayName: "Emily Carter",
    countryOfOrigin: "United States",
    instructionLanguages: ["EN"],
    specialties: ["business", "exam"],
    rateYen: 4200,
    slots: [
      { dayOfWeek: 1, startMin: 7 * 60, endMin: 8 * 60, timezone: "Europe/London" },
      { dayOfWeek: 4, startMin: 17 * 60, endMin: 18 * 60, timezone: "Europe/London" },
    ],
  },
  {
    email: "teacher04@english-studio.local",
    name: "Oliver Smith",
    displayName: "Oliver Smith",
    countryOfOrigin: "United Kingdom",
    instructionLanguages: ["EN"],
    specialties: ["conversation", "pronunciation"],
    rateYen: 4000,
    slots: [
      { dayOfWeek: 2, startMin: 15 * 60, endMin: 16 * 60, timezone: "Europe/London" },
      { dayOfWeek: 6, startMin: 10 * 60, endMin: 11 * 60, timezone: "Europe/London" },
    ],
  },
  {
    email: "teacher05@english-studio.local",
    name: "Noah Miller",
    displayName: "Noah Miller",
    countryOfOrigin: "Canada",
    instructionLanguages: ["EN"],
    specialties: ["kids", "conversation"],
    rateYen: 3400,
    slots: [
      { dayOfWeek: 3, startMin: 9 * 60, endMin: 10 * 60, timezone: "America/Toronto" },
      { dayOfWeek: 5, startMin: 19 * 60, endMin: 20 * 60, timezone: "America/Toronto" },
    ],
  },
  {
    email: "teacher06@english-studio.local",
    name: "Sophie Martin",
    displayName: "Sophie Martin",
    countryOfOrigin: "France",
    instructionLanguages: ["EN"],
    specialties: ["exam", "business"],
    rateYen: 4100,
    slots: [
      { dayOfWeek: 1, startMin: 16 * 60, endMin: 17 * 60, timezone: "Europe/Paris" },
      { dayOfWeek: 4, startMin: 8 * 60, endMin: 9 * 60, timezone: "Europe/Paris" },
    ],
  },
  {
    email: "teacher07@english-studio.local",
    name: "Lucas Garcia",
    displayName: "Lucas Garcia",
    countryOfOrigin: "Spain",
    instructionLanguages: ["EN"],
    specialties: ["conversation", "travel"],
    rateYen: 3500,
    slots: [
      { dayOfWeek: 0, startMin: 14 * 60, endMin: 15 * 60, timezone: "Europe/Madrid" },
      { dayOfWeek: 2, startMin: 20 * 60, endMin: 21 * 60, timezone: "Europe/Madrid" },
    ],
  },
  {
    email: "teacher08@english-studio.local",
    name: "Hana Kim",
    displayName: "Hana Kim",
    countryOfOrigin: "South Korea",
    instructionLanguages: ["EN"],
    specialties: ["business", "pronunciation"],
    rateYen: 3900,
    slots: [
      { dayOfWeek: 3, startMin: 11 * 60, endMin: 12 * 60, timezone: "Asia/Seoul" },
      { dayOfWeek: 6, startMin: 21 * 60, endMin: 22 * 60, timezone: "Asia/Seoul" },
    ],
  },
  {
    email: "teacher09@english-studio.local",
    name: "Daniel Chen",
    displayName: "Daniel Chen",
    countryOfOrigin: "Singapore",
    instructionLanguages: ["EN"],
    specialties: ["exam", "kids"],
    rateYen: 3300,
    slots: [
      { dayOfWeek: 2, startMin: 13 * 60, endMin: 14 * 60, timezone: "Asia/Singapore" },
      { dayOfWeek: 5, startMin: 9 * 60, endMin: 10 * 60, timezone: "Asia/Singapore" },
    ],
  },
] as const;

async function main() {
  for (const [teacherIndex, seedTeacher] of teacherSeedData.entries()) {
    const teacherUser = await prisma.user.upsert({
      where: { email: seedTeacher.email },
      update: {
        role: "TEACHER",
        name: seedTeacher.name,
      },
      create: {
        email: seedTeacher.email,
        name: seedTeacher.name,
        role: "TEACHER",
      },
    });

    const teacherProfile = await prisma.teacherProfile.upsert({
      where: { userId: teacherUser.id },
      update: {
        displayName: seedTeacher.displayName,
        countryOfOrigin: seedTeacher.countryOfOrigin,
        instructionLanguages: [...seedTeacher.instructionLanguages],
        specialties: [...seedTeacher.specialties],
        rateYen: seedTeacher.rateYen,
        offersFreeTrial: true,
      },
      create: {
        userId: teacherUser.id,
        displayName: seedTeacher.displayName,
        countryOfOrigin: seedTeacher.countryOfOrigin,
        instructionLanguages: [...seedTeacher.instructionLanguages],
        specialties: [...seedTeacher.specialties],
        rateYen: seedTeacher.rateYen,
        offersFreeTrial: true,
      },
    });

    for (const [slotIndex, slot] of seedTeacher.slots.entries()) {
      const lessonLevel =
        "lessonLevel" in slot
          ? (slot as { lessonLevel: string }).lessonLevel
          : "intermediate";
      const lessonType =
        "lessonType" in slot ? (slot as { lessonType: string }).lessonType : "conversation";
      const lessonTypeCustom =
        "lessonTypeCustom" in slot
          ? (slot as { lessonTypeCustom: string | null }).lessonTypeCustom
          : null;
      await prisma.availabilitySlot.upsert({
        where: { id: `seed-teacher-${teacherIndex}-slot-${slotIndex}` },
        update: {
          dayOfWeek: slot.dayOfWeek,
          startMin: slot.startMin,
          endMin: slot.endMin,
          timezone: slot.timezone,
          lessonLevel,
          lessonType,
          lessonTypeCustom: lessonType === "custom" ? lessonTypeCustom : null,
          active: true,
        },
        create: {
          id: `seed-teacher-${teacherIndex}-slot-${slotIndex}`,
          teacherId: teacherProfile.id,
          dayOfWeek: slot.dayOfWeek,
          startMin: slot.startMin,
          endMin: slot.endMin,
          timezone: slot.timezone,
          lessonLevel,
          lessonType,
          lessonTypeCustom: lessonType === "custom" ? lessonTypeCustom : null,
          active: true,
        },
      });
    }
  }

  const products = [
    {
      tier: LessonTier.FREE_TRIAL,
      nameJa: "無料トライアルレッスン（20分）",
      nameEn: "Free trial lesson (20 min)",
      durationMin: 20,
    },
    {
      tier: LessonTier.STANDARD,
      nameJa: "標準レッスン（30分）",
      nameEn: "Standard (30 min)",
      durationMin: 30,
    },
    {
      tier: LessonTier.STANDARD,
      nameJa: "標準レッスン（40分）",
      nameEn: "Standard (40 min)",
      durationMin: 40,
    },
    {
      tier: LessonTier.EIKAWA,
      nameJa: "英会話",
      nameEn: "Conversation (Eikawa)",
      durationMin: 30,
    },
    {
      tier: LessonTier.PRONUNCIATION_ACTING,
      nameJa: "発音・演技",
      nameEn: "Pronunciation — Acting",
      durationMin: 40,
    },
  ];

  for (const p of products) {
    const id =
      p.tier === LessonTier.FREE_TRIAL
        ? "seed-FREE_TRIAL-20"
        : `seed-${p.tier}-${p.durationMin}`;
    await prisma.lessonProduct.upsert({
      where: { id },
      update: p,
      create: { id, ...p },
    });
  }

  // Remove legacy placeholder demo course (replaced by /learn/study flashcard track).
  await prisma.course.deleteMany({ where: { slug: "beginner-demo" } });

  await seedPlacementBankQuestions(prisma);
  await seedStudyTrack(prisma);

  console.log("Seed complete.");
}

main()
  .then(() => prisma.$disconnect())
  .catch((e) => {
    console.error(e);
    void prisma.$disconnect();
    process.exit(1);
  });
