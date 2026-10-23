import { readFileSync, writeFileSync, existsSync, mkdirSync, unlinkSync } from "node:fs";
import { randomUUID } from "node:crypto";
import { parse } from "dotenv";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client";
import { loadApprovedJapaneseBank, japaneseQuestionLimit } from "../src/lib/japanese-placement/bank";
import { startJapaneseAttempt, japaneseScoringRevision } from "../src/lib/japanese-placement/attempt";

// Explicit local QA only. Own every created row by a unique id and remove only
// that recorded set. Never reseed, truncate, or reset an application database.
const env = { ...parse(readFileSync(".env")), ...(existsSync(".env.local") ? parse(readFileSync(".env.local")) : {}) };
const connectionString = env.DATABASE_URL!;
if (!["localhost", "127.0.0.1", "[::1]"].includes(new URL(connectionString).hostname)) throw new Error("Mirror QA fixtures require a local database.");
const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString, application_name: "mirror-journey-fixtures" }) });
const file = "../../.impeccable/mirror-fixtures.json";
type Fixtures = { runId: string; users: { id: string; email: string }[]; englishTeacherId: string; japaneseTeacherId: string; placementProductId?: string };
async function main() {
try {
  if (process.argv[2] === "create") {
    if (existsSync(file)) throw new Error("Clean up the recorded fixture set before creating another.");
    const placement = process.argv.includes("--japanese-placement");
    const runId = `mirror-qa-${randomUUID()}`;
    const users = ["student", "new-student", "english-teacher", "japanese-teacher", ...(placement ? ["timeout-student"] : [])].map((name) => ({ id: `${runId}-${name}`, email: `${runId}-${name}@example.invalid` }));
    const fixtures: Fixtures = { runId, users, englishTeacherId: `${runId}-english-profile`, japaneseTeacherId: `${runId}-japanese-profile`, ...(placement ? { placementProductId: `${runId}-placement-product` } : {}) };
    mkdirSync("../../.impeccable", { recursive: true });
    // Record ownership before the transaction; cleanup is safe after failures.
    writeFileSync(file, JSON.stringify(fixtures, null, 2));
    await prisma.$transaction(async (tx) => {
      for (const [index, user] of users.entries()) {
        const teacher = index === 2 || index === 3;
        await tx.user.create({ data: { ...user, name: teacher ? index === 2 ? "Mirror QA English Teacher" : "Mirror QA Japanese Teacher" : "Mirror QA Student", role: teacher ? "TEACHER" : "STUDENT", locale: "en", learningLanguage: placement && [0, 4].includes(index) ? "JAPANESE" : "ENGLISH" } });
      }
      await tx.studentProfile.create({ data: { userId: users[0].id, onboardingCompletedAt: new Date(), placedLevel: "ADVANCED", placedSubLevel: 3 } });
      if (placement) await tx.studentProfile.create({ data: { userId: users[4].id, onboardingCompletedAt: new Date() } });
      for (const [id, userId, learningLanguage] of [[fixtures.englishTeacherId, users[2].id, "ENGLISH"], [fixtures.japaneseTeacherId, users[3].id, "JAPANESE"]] as const) {
        const offerId = `${id}-offer`;
        await tx.teacherProfile.create({ data: { id, userId, offersFreeTrial: false, onboardingCompletedAt: new Date(), displayName: learningLanguage === "JAPANESE" ? "Mirror QA Japanese Teacher" : "Mirror QA English Teacher", instructionLanguages: ["EN", "JA"], countryOfOrigin: "JP", bio: "Synthetic local verification account." } });
        const level = await tx.teacherClassLevel.create({ data: { teacherId: id, code: "beginner", labelEn: "Beginner", labelJa: "初級" } });
        const type = await tx.teacherClassType.create({ data: { teacherId: id, code: "conversation", labelEn: "Conversation", labelJa: "会話" } });
        await tx.teacherLessonOffering.create({ data: { id: offerId, teacherId: id, learningLanguage, durationMin: 60, rateYen: 5000, classLevelId: level.id, classTypeId: type.id } });
        await tx.availabilitySlot.create({ data: { teacherId: id, teacherLessonOfferingId: offerId, classLevelId: level.id, classTypeId: type.id, dayOfWeek: 1, startMin: 600, endMin: 660 } });
      }
      if (fixtures.placementProductId) {
        await tx.lessonProduct.create({ data: { id: fixtures.placementProductId, tier: "STANDARD", durationMin: 60, nameEn: "Local QA lesson", nameJa: "ローカル検証レッスン" } });
        await tx.booking.create({ data: { id: `${runId}-placement-booking`, teacherId: fixtures.japaneseTeacherId, studentId: users[0].id,
          lessonProductId: fixtures.placementProductId, learningLanguage: "JAPANESE", status: "CONFIRMED", startsAt: new Date(Date.now() + 604_800_000), endsAt: new Date(Date.now() + 608_400_000) } });
      }
    });
    console.log(JSON.stringify(fixtures));
  } else if (["placement-timeout", "placement-status"].includes(process.argv[2])) {
    const fixtures = JSON.parse(readFileSync(file, "utf8")) as Fixtures;
    if (!fixtures.runId.startsWith("mirror-qa-") || fixtures.users.some((user) => !user.id.startsWith(`${fixtures.runId}-`))) throw new Error("Unrecognized fixture ownership.");
    if (process.argv[2] === "placement-status") {
      console.log(JSON.stringify(await prisma.studentProfile.findUniqueOrThrow({ where: { userId: fixtures.users[0].id }, select: { placedLevel: true, placedSubLevel: true, placementCompletedAt: true, placementReport: true } })));
      return;
    }
    const learner = fixtures.users[4];
    if (!learner || !learner.id.endsWith("-timeout-student")) throw new Error("Create current Japanese placement fixtures first.");
    const snapshot = await prisma.japanesePlacementBankSnapshot.findFirstOrThrow({ where: { revokedAt: null, content: { path: ["schemaVersion"], equals: 5 } }, orderBy: { publishedAt: "desc" } });
    const bank = loadApprovedJapaneseBank(snapshot.content);
    // Stage an owned, already-running attempt near its immutable real deadline.
    // The browser and application server use their actual clocks and result path.
    const state = startJapaneseAttempt(bank, { id: randomUUID(), learnerId: learner.id, startedAt: new Date(Date.now() - bank.assessment!.timeLimitSec * 1000 + 4_000).toISOString() });
    await prisma.japanesePlacementAttempt.create({ data: {
      id: state.id, learnerId: learner.id, activeLearnerId: learner.id, requestId: randomUUID(), bankSnapshotId: snapshot.id,
      schemaVersion: state.schemaVersion, scoringRevision: japaneseScoringRevision(state.schemaVersion), policyRevision: state.policyRevision,
      questionLimit: japaneseQuestionLimit(bank), startedAt: new Date(state.startedAt), expiresAt: new Date(state.expiresAt),
    } });
    console.log(JSON.stringify({ attemptId: state.id, expiresAt: state.expiresAt }));
  } else if (process.argv[2] === "cleanup") {
    const fixtures = JSON.parse(readFileSync(file, "utf8")) as Fixtures;
    if (!fixtures.runId.startsWith("mirror-qa-") || fixtures.users.some((u) => !u.id.startsWith(`${fixtures.runId}-`))) throw new Error("Unrecognized fixture ownership.");
    await prisma.user.deleteMany({ where: { id: { in: fixtures.users.map((u) => u.id) } } });
    if (await prisma.user.count({ where: { id: { in: fixtures.users.map((u) => u.id) } } })) throw new Error("Fixture cleanup incomplete.");
    if (fixtures.placementProductId) {
      if (fixtures.placementProductId !== `${fixtures.runId}-placement-product`) throw new Error("Unrecognized product ownership");
      await prisma.lessonProduct.deleteMany({ where: { id: fixtures.placementProductId } });
    }
    unlinkSync(file);
    console.log("Owned mirror QA accounts and related rows removed.");
  } else throw new Error("Use create or cleanup.");
} finally { await prisma.$disconnect(); }
}
void main();
