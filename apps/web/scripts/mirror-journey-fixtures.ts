import { readFileSync, writeFileSync, existsSync, mkdirSync, unlinkSync } from "node:fs";
import { randomUUID } from "node:crypto";
import { parse } from "dotenv";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client";

// Explicit local QA only. Own every created row by a unique id and remove only
// that recorded set. Never reseed, truncate, or reset an application database.
const env = { ...parse(readFileSync(".env")), ...(existsSync(".env.local") ? parse(readFileSync(".env.local")) : {}) };
const connectionString = env.DATABASE_URL!;
if (!["localhost", "127.0.0.1", "[::1]"].includes(new URL(connectionString).hostname)) throw new Error("Mirror QA fixtures require a local database.");
const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString, application_name: "mirror-journey-fixtures" }) });
const file = "../../.impeccable/mirror-fixtures.json";
type Fixtures = { runId: string; users: { id: string; email: string }[]; englishTeacherId: string; japaneseTeacherId: string };
async function main() {
try {
  if (process.argv[2] === "create") {
    if (existsSync(file)) throw new Error("Clean up the recorded fixture set before creating another.");
    const runId = `mirror-qa-${randomUUID()}`;
    const users = ["student", "new-student", "english-teacher", "japanese-teacher"].map((name) => ({ id: `${runId}-${name}`, email: `${runId}-${name}@example.invalid` }));
    const fixtures: Fixtures = { runId, users, englishTeacherId: `${runId}-english-profile`, japaneseTeacherId: `${runId}-japanese-profile` };
    mkdirSync("../../.impeccable", { recursive: true });
    // Record ownership before the transaction; cleanup is safe after failures.
    writeFileSync(file, JSON.stringify(fixtures, null, 2));
    await prisma.$transaction(async (tx) => {
      for (const [index, user] of users.entries()) {
        await tx.user.create({ data: { ...user, name: index < 2 ? "Mirror QA Student" : index === 2 ? "Mirror QA English Teacher" : "Mirror QA Japanese Teacher", role: index < 2 ? "STUDENT" : "TEACHER", locale: "en" } });
      }
      await tx.studentProfile.create({ data: { userId: users[0].id, onboardingCompletedAt: new Date(), placedLevel: "ADVANCED", placedSubLevel: 3 } });
      for (const [id, userId, learningLanguage] of [[fixtures.englishTeacherId, users[2].id, "ENGLISH"], [fixtures.japaneseTeacherId, users[3].id, "JAPANESE"]] as const) {
        const offerId = `${id}-offer`;
        await tx.teacherProfile.create({ data: { id, userId, offersFreeTrial: false, onboardingCompletedAt: new Date(), displayName: learningLanguage === "JAPANESE" ? "Mirror QA Japanese Teacher" : "Mirror QA English Teacher", instructionLanguages: ["EN", "JA"], countryOfOrigin: "JP", bio: "Synthetic local verification account." } });
        const level = await tx.teacherClassLevel.create({ data: { teacherId: id, code: "beginner", labelEn: "Beginner", labelJa: "初級" } });
        const type = await tx.teacherClassType.create({ data: { teacherId: id, code: "conversation", labelEn: "Conversation", labelJa: "会話" } });
        await tx.teacherLessonOffering.create({ data: { id: offerId, teacherId: id, learningLanguage, durationMin: 60, rateYen: 5000, classLevelId: level.id, classTypeId: type.id } });
        await tx.availabilitySlot.create({ data: { teacherId: id, teacherLessonOfferingId: offerId, classLevelId: level.id, classTypeId: type.id, dayOfWeek: 1, startMin: 600, endMin: 660 } });
      }
    });
    console.log(JSON.stringify(fixtures));
  } else if (process.argv[2] === "cleanup") {
    const fixtures = JSON.parse(readFileSync(file, "utf8")) as Fixtures;
    if (!fixtures.runId.startsWith("mirror-qa-") || fixtures.users.some((u) => !u.id.startsWith(`${fixtures.runId}-`))) throw new Error("Unrecognized fixture ownership.");
    await prisma.user.deleteMany({ where: { id: { in: fixtures.users.map((u) => u.id) } } });
    if (await prisma.user.count({ where: { id: { in: fixtures.users.map((u) => u.id) } } })) throw new Error("Fixture cleanup incomplete.");
    unlinkSync(file);
    console.log("Owned mirror QA accounts and related rows removed.");
  } else throw new Error("Use create or cleanup.");
} finally { await prisma.$disconnect(); }
}
void main();
