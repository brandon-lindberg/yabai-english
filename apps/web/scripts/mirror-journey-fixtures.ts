import { readFileSync, writeFileSync, existsSync, mkdirSync, unlinkSync } from "node:fs";
import { randomUUID } from "node:crypto";
import { parse } from "dotenv";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client";
import { z } from "zod";
import { loadApprovedJapaneseBank, japaneseQuestionLimit } from "../src/lib/japanese-placement/bank";
import { startJapaneseAttempt, japaneseScoringRevision, nextJapaneseQuestion, recordJapaneseResponse, summarizeJapaneseAttempt } from "../src/lib/japanese-placement/attempt";
import { JAPANESE_STAIRCASE_POLICY_REVISION } from "../src/lib/japanese-placement/staircase-policy";
import { parseEnglishAttemptHandle } from "../src/lib/english-placement/service";
import { lockLearnerTransaction } from "../src/lib/learner-transaction-lock";
import { ENGLISH_PLACEMENT_POLICY_V2 } from "../src/lib/placement-policy";
import { japaneseStudyAnswer } from "../test/japanese-study-db-fixture";

// Explicit local QA only. Own every created row by a unique id and remove only
// that recorded set. Never reseed, truncate, or reset an application database.
const env = { ...(existsSync(".env") ? parse(readFileSync(".env")) : {}), ...(existsSync(".env.local") ? parse(readFileSync(".env.local")) : {}) };
const connectionString = process.env.MIRROR_QA_DATABASE_URL ?? env.DATABASE_URL!;
if (!["localhost", "127.0.0.1", "[::1]"].includes(new URL(connectionString).hostname)) throw new Error("Mirror QA fixtures require a local database.");
const schema = new URL(connectionString).searchParams.get("schema") ?? "public";
const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString, application_name: "mirror-journey-fixtures" }, { schema }) });
const file = "../../.impeccable/mirror-fixtures.json";
const lifecycleKinds = ["events", "cancel-late", "cancel-teacher", "cancel-close", "cancel-refund", "recovery"] as const;
export type Fixtures = { runId: string; schema?: string; users: { id: string; email: string }[]; englishTeacherId: string; japaneseTeacherId: string; placementProductId?: string; trialProductId?: string; pastBookings?: { ENGLISH: string; JAPANESE: string } };
function readOwnedFixtures(): Fixtures {
  const fixtures = JSON.parse(readFileSync(file, "utf8")) as Fixtures;
  if (!fixtures.runId.startsWith("mirror-qa-") || fixtures.users.some(user => !user.id.startsWith(`${fixtures.runId}-`))
    || (fixtures.schema !== undefined && fixtures.schema !== schema) || (schema !== "public" && fixtures.schema !== schema)
    || fixtures.englishTeacherId !== `${fixtures.runId}-english-profile` || fixtures.japaneseTeacherId !== `${fixtures.runId}-japanese-profile`
    || (fixtures.placementProductId && fixtures.placementProductId !== `${fixtures.runId}-placement-product`)
    || (fixtures.trialProductId && fixtures.trialProductId !== `${fixtures.runId}-trial-product`)) throw new Error("Unrecognized fixture ownership");
  return fixtures;
}
async function main() {
try {
  if (process.argv[2] === "create") {
    if (existsSync(file)) throw new Error("Clean up the recorded fixture set before creating another.");
    const release = process.argv.includes("--release");
    if (release && !/^mirror_test_[a-f0-9]{32}$/.test(schema)) throw new Error("Release journeys require an isolated test schema");
    const placement = release || process.argv.includes("--japanese-placement");
    const runId = `mirror-qa-${randomUUID()}`;
    const users = ["student", "new-student", "english-teacher", "japanese-teacher", ...(placement ? ["timeout-student"] : []), ...(release ? ["new-japanese-student", "placement-english", "timeout-english", "insufficient-english", "timeout-japanese", "insufficient-japanese", "study-student", "resume-english", "new-english-teacher", "new-japanese-teacher", ...lifecycleKinds.flatMap(kind => [`${kind}-english`, `${kind}-japanese`]), "payment-admin"] : [])].map((name) => ({ id: `${runId}-${name}`, email: `${runId}-${name}@example.invalid` }));
    const fixtures: Fixtures = { runId, schema, users, englishTeacherId: `${runId}-english-profile`, japaneseTeacherId: `${runId}-japanese-profile`, ...(placement ? { placementProductId: `${runId}-placement-product` } : {}), ...(release ? { trialProductId: `${runId}-trial-product`, pastBookings: { ENGLISH: `${runId}-past-en`, JAPANESE: `${runId}-past-ja` } } : {}) };
    mkdirSync("../../.impeccable", { recursive: true });
    // Record ownership before the transaction; cleanup is safe after failures.
    writeFileSync(file, JSON.stringify(fixtures, null, 2));
    await prisma.$transaction(async (tx) => {
      for (const [index, user] of users.entries()) {
        const teacher = user.id.endsWith("-teacher");
        const admin = user.id.endsWith("-payment-admin");
        await tx.user.create({ data: { ...user, name: admin ? "Mirror QA Payment Admin" : teacher ? user.id.includes("japanese-teacher") ? "Mirror QA Japanese Teacher" : "Mirror QA English Teacher" : `Mirror QA Student ${index}`, role: admin ? "SUPER_ADMIN" : teacher ? "TEACHER" : "STUDENT", locale: "en", learningLanguage: placement && ([0, 4, 5].includes(index) || user.id.endsWith("-japanese")) ? "JAPANESE" : "ENGLISH" } });
        if (release && index >= 6 && !teacher && !admin) await tx.studentProfile.create({ data: { userId: user.id, onboardingCompletedAt: new Date() } });
      }
      await tx.studentProfile.create({ data: { userId: users[0].id, onboardingCompletedAt: new Date(), placedLevel: "ADVANCED", placedSubLevel: 3 } });
      if (placement) await tx.studentProfile.create({ data: { userId: users[4].id, onboardingCompletedAt: new Date() } });
      const teachers = [[fixtures.englishTeacherId, users[2].id, "ENGLISH"], [fixtures.japaneseTeacherId, users[3].id, "JAPANESE"],
        ...(release ? [[`${runId}-new-english-profile`, users[13].id, "ENGLISH"], [`${runId}-new-japanese-profile`, users[14].id, "JAPANESE"]] as const : [])] as const;
      for (const [id, userId, learningLanguage] of teachers) {
        const offerId = `${id}-offer`;
        const fresh = userId.includes("-new-");
        await tx.teacherProfile.create({ data: { id, userId, teachingLanguages: [learningLanguage], marketplaceHidden: fresh, offersFreeTrial: release, ...(release ? { paymentPolicyAcceptedAt: new Date() } : {}), onboardingCompletedAt: fresh ? null : new Date(), displayName: learningLanguage === "JAPANESE" ? "Mirror QA Japanese Teacher" : "Mirror QA English Teacher", instructionLanguages: ["EN", "JA"], countryOfOrigin: "JP", bio: "Synthetic local verification account." } });
        const level = await tx.teacherClassLevel.create({ data: { teacherId: id, code: "beginner", labelEn: "Beginner", labelJa: "初級" } });
        const type = await tx.teacherClassType.create({ data: { teacherId: id, code: "conversation", labelEn: "Conversation", labelJa: "会話" } });
        await tx.teacherLessonOffering.create({ data: { id: offerId, teacherId: id, learningLanguage, durationMin: 60, rateYen: 5000, classLevelId: level.id, classTypeId: type.id } });
        await tx.availabilitySlot.create({ data: { teacherId: id, teacherLessonOfferingId: offerId, classLevelId: level.id, classTypeId: type.id, dayOfWeek: 1, startMin: 600, endMin: 660 } });
        if (release) {
          const trial = await tx.teacherLessonOffering.create({ data: { id: `${id}-trial-offer`, teacherId: id, learningLanguage, isFreeTrial: true, durationMin: 30, rateYen: 0, classLevelId: level.id, classTypeId: type.id } });
          await tx.availabilitySlot.create({ data: { teacherId: id, teacherLessonOfferingId: trial.id, classLevelId: level.id, classTypeId: type.id, dayOfWeek: 1, startMin: 660, endMin: 690 } });
          await tx.teacherPaymentAccount.create({ data: { teacherId: id, provider: "STRIPE", providerAccountId: `acct_qa_${id}`, status: "ENABLED", chargesEnabled: true, payoutsEnabled: true, methods: { create: { method: "CARD", enabled: true } } } });
        }
      }
      if (fixtures.placementProductId) {
        await tx.lessonProduct.create({ data: { id: fixtures.placementProductId, tier: release ? "EIKAWA" : "STANDARD", durationMin: 60, nameEn: "Local QA lesson", nameJa: "ローカル検証レッスン" } });
        await tx.booking.create({ data: { id: `${runId}-placement-booking`, teacherId: fixtures.japaneseTeacherId, studentId: users[0].id,
          lessonProductId: fixtures.placementProductId, learningLanguage: "JAPANESE", status: "CONFIRMED", startsAt: new Date(Date.now() + 604_800_000), endsAt: new Date(Date.now() + 608_400_000) } });
      }
      if (fixtures.trialProductId) await tx.lessonProduct.create({ data: { id: fixtures.trialProductId, tier: "FREE_TRIAL", durationMin: 30, nameEn: "Local QA free trial", nameJa: "ローカル検証体験レッスン" } });
      if (fixtures.pastBookings) for (const learningLanguage of ["ENGLISH", "JAPANESE"] as const) await tx.booking.create({ data: {
        id: fixtures.pastBookings[learningLanguage], studentId: users[0].id, teacherId: learningLanguage === "ENGLISH" ? fixtures.englishTeacherId : fixtures.japaneseTeacherId,
        lessonProductId: fixtures.trialProductId!, learningLanguage, status: "CONFIRMED", quotedPriceYen: 0,
        startsAt: new Date(Date.now() - 7_200_000), endsAt: new Date(Date.now() - 5_400_000),
      } });
      if (release) for (const kind of lifecycleKinds) for (const language of ["ENGLISH", "JAPANESE"] as const) {
        const learner = users.find(user => user.id.endsWith(`-${kind}-${language.toLowerCase()}`))!;
        const date = new Date();
        if (kind !== "events") {
          date.setTime(date.getTime() + 86_400_000 + (lifecycleKinds.indexOf(kind) - 1) * 7_200_000); date.setUTCMinutes(0, 0, 0);
        } else {
          date.setUTCDate(date.getUTCDate() + ((8 - date.getUTCDay()) % 7 || 7));
          date.setUTCHours(1, 0, 0, 0);
        }
        const bookingId = `${runId}-${kind}-${language.toLowerCase()}-booking`;
        await tx.booking.create({ data: { id: bookingId, studentId: learner.id, teacherId: language === "ENGLISH" ? fixtures.englishTeacherId : fixtures.japaneseTeacherId,
          lessonProductId: fixtures.placementProductId!, learningLanguage: language, status: "CONFIRMED", quotedPriceYen: 5000,
          startsAt: date, endsAt: new Date(date.getTime() + 3_600_000) } });
        // No real provider IDs: cancellation deliberately enters recovery, never Stripe.
        await tx.payment.create({ data: { id: `${bookingId}-payment`, bookingId, studentId: learner.id,
          teacherId: language === "ENGLISH" ? fixtures.englishTeacherId : fixtures.japaneseTeacherId,
          provider: "STRIPE", method: "CARD", idempotencyKey: `${bookingId}-payment`, amountYen: 5000, status: "SUCCEEDED" } });
      }
    });
    console.log(JSON.stringify(fixtures));
  } else if (process.argv[2].startsWith("release-") && process.argv[2] !== "release-status") {
    const fixtures = readOwnedFixtures();
    if (!fixtures.trialProductId || !/^mirror_test_[a-f0-9]{32}$/.test(schema)) throw new Error("Learning verification requires isolated release fixtures");
    const operation = process.argv[2];
    if (operation === "release-learning-state") {
      const userIds = fixtures.users.map(user => user.id);
      console.log(JSON.stringify({
        profiles: await prisma.studentProfile.findMany({ where: { userId: { in: userIds } }, orderBy: { userId: "asc" }, select: { userId: true, placedLevel: true, placedSubLevel: true, placementCompletedAt: true, placementReport: true } }),
        attempts: await prisma.japanesePlacementAttempt.findMany({ where: { learnerId: { in: userIds } }, orderBy: { id: "asc" }, select: { id: true, learnerId: true, status: true, result: true } }),
        states: await prisma.userStudyCardState.findMany({ where: { userId: { in: userIds } }, orderBy: { cardId: "asc" }, include: { card: { select: { deck: { select: { level: { select: { track: { select: { learningLanguage: true } } } } } } } } } }),
        progress: await prisma.userStudyLevelProgress.findMany({ where: { userId: { in: userIds } }, orderBy: { levelId: "asc" } }),
      }));
      return;
    }
    if (operation === "release-placement-bank") {
      const snapshot = await prisma.japanesePlacementBankSnapshot.findFirstOrThrow({ where: { revokedAt: null }, orderBy: { publishedAt: "desc" } });
      console.log(JSON.stringify(loadApprovedJapaneseBank(snapshot.content))); return;
    }
    if (["release-study-publish", "release-study-hide"].includes(operation)) {
      console.log(JSON.stringify(await prisma.studyTrack.update({ where: { slug: "japanese-flashcards" }, data: { publicationStatus: operation === "release-study-publish" ? "PUBLISHED" : "DRAFT" }, select: { publicationStatus: true } }))); return;
    }
    const input = JSON.parse(readFileSync(0, "utf8")) as unknown;
    const learnerId = z.object({ learnerId: z.string() }).parse(input).learnerId;
    if (!fixtures.users.some(user => user.id === learnerId)) throw new Error("Unknown release learner");
    const learner = await prisma.user.findUniqueOrThrow({ where: { id: learnerId }, select: { role: true, learningLanguage: true } });
    if (learner.role !== "STUDENT") throw new Error("Student fixture required");
    if (operation === "release-payment-recovery") {
      if (!learnerId.endsWith("-recovery-english") && !learnerId.endsWith("-recovery-japanese")) throw new Error("Owned recovery fixture required");
      const language = learnerId.endsWith("-japanese") ? "JAPANESE" : "ENGLISH";
      const bookingId = `${fixtures.runId}-recovery-${language.toLowerCase()}-booking`;
      const paymentId = `${bookingId}-payment`, account = `acct_qa_${language === "ENGLISH" ? fixtures.englishTeacherId : fixtures.japaneseTeacherId}`;
      await prisma.$transaction(async tx => {
        await tx.booking.update({ where: { id: bookingId }, data: { status: "CANCELLED", cancelledFromStatus: "CONFIRMED", privateRescheduleStatus: "REFUND_REQUESTED", rescheduleRequestedAt: new Date() } });
        await tx.payment.update({ where: { id: paymentId }, data: { providerPaymentId: `pi_qa_${paymentId}`, providerCheckoutId: `cs_qa_${paymentId}`, metadataJson: { connectedAccountId: account } } });
        const refund = await tx.refund.create({ data: { bookingId, paymentId, provider: "STRIPE", providerRefundId: `re_qa_${paymentId}`, providerAccountId: account,
          amountYen: 5000, status: "SUCCEEDED", actor: "TEACHER", reason: "CANCELLATION_POLICY" } });
        await tx.paymentRecovery.create({ data: { paymentId, refundId: refund.id, requestedAmountYen: 5000, connectedAccountId: account, paymentIntentId: `pi_qa_${paymentId}`,
          state: "WAITING", feeRecoveryPending: true, lastError: "Student refunded. Application fee reconciliation remains pending.", nextAttemptAt: new Date(Date.now() + 600_000) } });
        await tx.paymentWebhookEvent.create({ data: { provider: "STRIPE", providerEventId: `evt_qa_${paymentId}`, eventType: "checkout.session.async_payment_failed", state: "WAITING",
          lastError: "Temporary processing interruption.", payloadJson: { id: `evt_qa_${paymentId}`, type: "checkout.session.async_payment_failed", account,
            data: { object: { id: `cs_qa_${paymentId}`, metadata: { paymentId, bookingId } } } } } });
      });
      console.log(JSON.stringify({ paymentId, eventId: `evt_qa_${paymentId}`, bookingId })); return;
    }
    if (["release-notification-availability", "release-notification-settle"].includes(operation)) {
      const kind = lifecycleKinds.find(kind => learnerId.endsWith(`-${kind}-english`) || learnerId.endsWith(`-${kind}-japanese`));
      if (!kind) throw new Error("Lifecycle fixture required");
      const language = learnerId.endsWith("-japanese") ? "JAPANESE" : "ENGLISH";
      const bookingId = `${fixtures.runId}-${kind}-${language.toLowerCase()}-booking`;
      if (operation === "release-notification-availability") {
        const { active } = z.object({ active: z.boolean() }).parse(input);
        const teacherId = language === "ENGLISH" ? fixtures.englishTeacherId : fixtures.japaneseTeacherId;
        console.log(JSON.stringify(await prisma.availabilitySlot.updateMany({ where: { teacherId }, data: { active } }))); return;
      }
      const refund = await prisma.refund.findFirstOrThrow({ where: { bookingId, booking: { studentId: learnerId } } });
      const settled = await prisma.refund.update({ where: { id: refund.id }, data: { status: "SUCCEEDED" } });
      const { notifyPrivateBookingEvent } = await import("../src/lib/private-booking-notifications");
      await notifyPrivateBookingEvent({ bookingId, event: "refund", refund: settled });
      console.log(JSON.stringify({ id: settled.id, status: settled.status })); return;
    }

    if (operation === "release-english-deadline") {
      const { attemptToken } = z.object({ learnerId: z.string(), attemptToken: z.string() }).strict().parse(input);
      const handle = parseEnglishAttemptHandle(attemptToken);
      if (learner.learningLanguage !== "ENGLISH" || !handle) throw new Error("Expected an owned English attempt handle");
      const staged = await prisma.$transaction(async tx => {
        await lockLearnerTransaction(tx, "english-placement", learnerId);
        const row = await tx.englishPlacementAttempt.findUniqueOrThrow({ where: { id: handle.id } });
        if (row.learnerId !== learnerId || row.activeLearnerId !== learnerId || row.revision !== handle.revision || row.scoringVersion !== ENGLISH_PLACEMENT_POLICY_V2.version
          || ![ENGLISH_PLACEMENT_POLICY_V2.minimumAnswers - 1, ENGLISH_PLACEMENT_POLICY_V2.minimumAnswers].includes(row.revision)) throw new Error("Expected a current English boundary attempt");
        const expiresAt = Date.now() + 7_000;
        await tx.englishPlacementAttempt.update({ where: { id: row.id }, data: { status: "ABANDONED", activeLearnerId: null, finishedAt: new Date(), result: { status: "inconclusive", reason: "attempt_unavailable", answered: row.revision, required: 15 } } });
        const clone = await tx.englishPlacementAttempt.create({ data: {
          id: randomUUID(), learnerId, activeLearnerId: learnerId, bankSnapshotId: row.bankSnapshotId, schemaVersion: row.schemaVersion,
          scoringVersion: row.scoringVersion, routingRevision: row.routingRevision, revision: row.revision,
          state: JSON.parse(JSON.stringify(row.state)), startedAt: new Date(expiresAt - ENGLISH_PLACEMENT_POLICY_V2.timeLimitSec * 1000), expiresAt: new Date(expiresAt),
        } });
        return { attemptToken: `${clone.id}:${clone.revision}`, expiresAt };
      });
      console.log(JSON.stringify(staged)); return;
    }
    if (operation === "release-study-answer") {
      const { promptId } = z.object({ learnerId: z.string(), promptId: z.string() }).strict().parse(input);
      await prisma.studyReviewPrompt.findFirstOrThrow({ where: { id: promptId, userId: learnerId } });
      console.log(JSON.stringify(await japaneseStudyAnswer(prisma, promptId))); return;
    }
    const emptyHistory = operation === "release-japanese-empty-history";
    if (operation !== "release-japanese-deadline" && !emptyHistory) throw new Error("Unknown release operation");
    const answered = emptyHistory ? 0 : z.object({ learnerId: z.string(), answered: z.union([z.literal(11), z.literal(18)]) }).strict().parse(input).answered;
    if (learner.learningLanguage !== "JAPANESE") throw new Error("Japanese fixture required");
    const snapshot = await prisma.japanesePlacementBankSnapshot.findFirstOrThrow({ where: { revokedAt: null, content: { path: ["schemaVersion"], equals: 5 } }, orderBy: { publishedAt: "desc" } });
    const bank = loadApprovedJapaneseBank(snapshot.content);
    // Explicit isolated history fixture: a later completed empty attempt, never an app learner write.
    let state = startJapaneseAttempt(bank, { id: randomUUID(), learnerId, startedAt: new Date(emptyHistory ? Date.now() : Date.now() - bank.assessment!.timeLimitSec * 1000 + 7_000).toISOString() }, JAPANESE_STAIRCASE_POLICY_REVISION);
    for (let index = 0; index < answered; index++) {
      const question = nextJapaneseQuestion(bank, state)!;
      const item = bank.items.find(item => item.id === question.id)!;
      const response = item.responseType === "choice" ? { kind: "answer" as const, itemId: item.id, choiceId: item.correctChoiceId }
        : { kind: "sentence_assembly" as const, itemId: item.id, tileIds: item.acceptedOrders[0] };
      state = recordJapaneseResponse(bank, state, { ...response, submittedAt: new Date(Date.parse(state.startedAt) + (index + 1) * 1000).toISOString() });
    }
    await prisma.japanesePlacementAttempt.create({ data: {
      id: state.id, learnerId, activeLearnerId: emptyHistory ? null : learnerId, requestId: randomUUID(), bankSnapshotId: snapshot.id,
      schemaVersion: state.schemaVersion, scoringRevision: japaneseScoringRevision(state.schemaVersion, state.policyRevision), policyRevision: state.policyRevision,
      questionLimit: japaneseQuestionLimit(bank), startedAt: new Date(state.startedAt), expiresAt: new Date(state.expiresAt),
      ...(emptyHistory ? { status: "COMPLETED", finishedAt: new Date(state.expiresAt), result: summarizeJapaneseAttempt(bank, state, state.expiresAt) } : {}),
      responses: { create: state.responses.map((payload, position) => ({ itemId: payload.itemId, position, payload })) },
    } });
    console.log(JSON.stringify({ attemptId: state.id, expiresAt: state.expiresAt }));
  } else if (["placement-timeout", "placement-status", "release-status"].includes(process.argv[2])) {
    const fixtures = readOwnedFixtures();
    if (process.argv[2].startsWith("release-")) {
      if (!fixtures.trialProductId || !/^mirror_test_[a-f0-9]{32}$/.test(schema)) throw new Error("Release operations require isolated fixtures");
      console.log(JSON.stringify({
        users: await prisma.user.findMany({ where: { id: { in: fixtures.users.map(user => user.id) } }, select: { id: true, learningLanguage: true, studentProfile: true, teacherProfile: { select: { onboardingCompletedAt: true, skippedOnboardingSteps: true } } } }),
        bookings: await prisma.booking.findMany({ where: { studentId: { in: fixtures.users.map(user => user.id) } }, include: { payments: true, refunds: true, invoice: true } }),
        draft: await prisma.studyTrack.findUnique({ where: { slug: "japanese-flashcards" }, select: { publicationStatus: true, catalogSnapshotId: true } }),
      }));
      return;
    }
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
    const fixtures = readOwnedFixtures();
    await prisma.user.deleteMany({ where: { id: { in: fixtures.users.map((u) => u.id) } } });
    if (await prisma.user.count({ where: { id: { in: fixtures.users.map((u) => u.id) } } })) throw new Error("Fixture cleanup incomplete.");
    const products = [fixtures.placementProductId, fixtures.trialProductId].filter((id): id is string => Boolean(id));
    if (products.some(id => ![`${fixtures.runId}-placement-product`, `${fixtures.runId}-trial-product`].includes(id))) throw new Error("Unrecognized product ownership");
    await prisma.lessonProduct.deleteMany({ where: { id: { in: products } } });
    unlinkSync(file);
    console.log("Owned mirror QA accounts and related rows removed.");
  } else throw new Error("Use create or cleanup.");
} finally { await prisma.$disconnect(); }
}
void main();
