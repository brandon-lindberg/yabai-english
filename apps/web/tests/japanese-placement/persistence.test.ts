import { expect, test, vi } from "vitest";
import { withIsolatedPostgres } from "../../test/isolated-postgres";
import { adaptiveBank, approveBank, approvedBank } from "../../src/lib/japanese-placement/__tests__/fixtures";

test.runIf(process.env.MIRROR_TEST_DATABASE_URL)("preserves English history and persists secure Japanese attempts with concurrent retries", async () => {
  await withIsolatedPostgres("20261022010000_japanese_placement_adaptive", async ({ client, db, applyMigration, verifyDatamodel }) => {
    await client.query(`
      INSERT INTO "User" (id, role, "learningLanguage", "updatedAt") VALUES
        ('learner', 'STUDENT', 'JAPANESE', NOW()), ('other-learner', 'STUDENT', 'JAPANESE', NOW()),
        ('english-learner', 'STUDENT', 'ENGLISH', NOW()), ('teacher-user', 'TEACHER', 'ENGLISH', NOW()),
        ('unrelated-teacher', 'TEACHER', 'JAPANESE', NOW());
      INSERT INTO "StudentProfile" (id, "userId", "placedLevel", "placedSubLevel", "placementReport")
        VALUES ('legacy-profile', 'learner', 'INTERMEDIATE', 2, '{"legacy":true}');
      INSERT INTO "TeacherProfile" (id, "userId") VALUES ('teacher', 'teacher-user'), ('unrelated', 'unrelated-teacher');
      INSERT INTO "LessonProduct" (id, tier, "durationMin", "nameEn", "nameJa") VALUES ('product', 'STANDARD', 60, 'Lesson', 'レッスン');
    `);
    const englishBefore = (await client.query('SELECT * FROM "StudentProfile" WHERE id = $1', ['legacy-profile'])).rows[0];
    await applyMigration();
    verifyDatamodel();
    const service = await import("../../src/lib/japanese-placement/service");
    const firstBank = approvedBank();
    await service.publishJapaneseBank(db, firstBank);
    const requestId = "00000000-0000-4000-8000-000000000001";
    const starts = await Promise.all([
      service.startStoredJapaneseAttempt(db, "learner", { requestId }),
      service.startStoredJapaneseAttempt(db, "learner", { requestId }),
    ]);
    expect(starts[0].attemptId).toBe(starts[1].attemptId);
    expect(await db.japanesePlacementAttempt.count()).toBe(1);
    const attemptId = starts[0].attemptId;
    expect(starts[0]).toMatchObject({ status: "IN_PROGRESS", answered: 0, total: 6, question: { id: "kana-one" }, result: null });
    expect(JSON.stringify(starts[0])).not.toMatch(/correctChoiceId|acceptedOrders|Private|sourceIds/);
    await expect(service.getStoredJapaneseAttempt(db, "other-learner", attemptId)).rejects.toMatchObject({ status: 404 });
    await expect(service.getStoredJapaneseAttempt(db, "english-learner", attemptId)).rejects.toMatchObject({ status: 403 });
    await expect(service.startStoredJapaneseAttempt(db, "teacher-user", { requestId })).rejects.toMatchObject({ status: 403 });
    await expect(service.startStoredJapaneseAttempt(db, "learner", { requestId: "00000000-0000-4000-8000-000000000002" })).rejects.toMatchObject({ status: 409 });

    const answer = { kind: "answer", itemId: "kana-one", choiceId: "a" };
    const retry = await Promise.all([
      service.submitStoredJapaneseResponse(db, "learner", attemptId, answer),
      service.submitStoredJapaneseResponse(db, "learner", attemptId, answer),
    ]);
    expect(retry.every((view) => view.answered === 1)).toBe(true);
    expect(await db.japanesePlacementResponse.count()).toBe(1);
    await expect(service.submitStoredJapaneseResponse(db, "learner", attemptId, { ...answer, choiceId: "b" })).rejects.toMatchObject({ status: 409 });
    await expect(service.submitStoredJapaneseResponse(db, "learner", attemptId, { kind: "answer", itemId: "reading-one", choiceId: "a" })).rejects.toMatchObject({ status: 409 });
    await expect(service.submitStoredJapaneseResponse(db, "learner", attemptId, { ...answer, submittedAt: "2020-01-01T00:00:00.000Z" })).rejects.toMatchObject({ status: 400 });
    expect((await service.getCurrentJapaneseAttempt(db, "learner"))?.answered).toBe(1);

    const nextBank = approvedBank();
    nextBank.version = 2;
    nextBank.items[0].explanation.en = "New version";
    approveBank(nextBank);
    await service.publishJapaneseBank(db, nextBank);
    for (const itemId of firstBank.sequence.slice(1, -1)) {
      await service.submitStoredJapaneseResponse(db, "learner", attemptId, { kind: "answer", itemId, choiceId: "a" });
    }
    const last = { kind: "sentence_assembly", itemId: "writing-one", tileIds: ["topic", "object", "verb"] };
    const finals = await Promise.all([
      service.submitStoredJapaneseResponse(db, "learner", attemptId, last),
      service.submitStoredJapaneseResponse(db, "learner", attemptId, last),
    ]);
    expect(finals[0]).toEqual(finals[1]);
    expect(finals[0]).toMatchObject({ status: "COMPLETED", answered: 6, question: null, result: { bankVersion: 1 } });
    expect(await db.japanesePlacementResponse.count()).toBe(6);
    expect(await service.startStoredJapaneseAttempt(db, "learner", { requestId })).toEqual(finals[0]);
    await expect(service.getTeacherJapaneseResult(db, "unrelated-teacher", "learner")).rejects.toMatchObject({ status: 404 });
    // Teacher-created rosters and lessons in a different subject confer no assessment access.
    await db.teacherRosterEntry.create({ data: { teacherId: "unrelated", studentId: "learner" } });
    await expect(service.getTeacherJapaneseResult(db, "unrelated-teacher", "learner")).rejects.toMatchObject({ status: 404 });
    const booking = await db.booking.create({ data: {
      id: "jp-booking", teacherId: "teacher", studentId: "learner", lessonProductId: "product",
      learningLanguage: "ENGLISH", status: "CONFIRMED", startsAt: new Date(), endsAt: new Date(Date.now() + 3_600_000),
    } });
    await expect(service.getTeacherJapaneseResult(db, "teacher-user", "learner")).rejects.toMatchObject({ status: 404 });
    await db.booking.update({ where: { id: booking.id }, data: { learningLanguage: "JAPANESE", status: "PENDING_PAYMENT" } });
    await expect(service.getTeacherJapaneseResult(db, "teacher-user", "learner")).rejects.toMatchObject({ status: 404 });
    await db.booking.update({ where: { id: booking.id }, data: { status: "CONFIRMED" } });
    expect(await service.getTeacherJapaneseResult(db, "teacher-user", "learner")).toEqual({ result: finals[0].result });
    await db.user.update({ where: { id: "learner" }, data: { learningLanguage: "ENGLISH" } });
    expect(await service.getTeacherJapaneseResult(db, "teacher-user", "learner")).toEqual({ result: finals[0].result });
    await expect(service.getCurrentJapaneseAttempt(db, "learner")).rejects.toMatchObject({ status: 403 });
    await db.user.update({ where: { id: "learner" }, data: { learningLanguage: "JAPANESE" } });
    await db.booking.update({ where: { id: booking.id }, data: { status: "CANCELLED" } });
    await expect(service.getTeacherJapaneseResult(db, "teacher-user", "learner")).rejects.toMatchObject({ status: 404 });
    await db.booking.update({ where: { id: booking.id }, data: { status: "COMPLETED" } });
    expect(await service.getTeacherJapaneseResult(db, "teacher-user", "learner")).toEqual({ result: finals[0].result });

    // The database protects immutable snapshots and materialized results as well as service code.
    const snapshot = await db.japanesePlacementBankSnapshot.findFirstOrThrow({ where: { version: 1 } });
    await expect(db.japanesePlacementBankSnapshot.update({ where: { id: snapshot.id }, data: { content: {} } })).rejects.toThrow();
    await expect(db.japanesePlacementAttempt.update({ where: { id: attemptId }, data: { result: {} } })).rejects.toThrow();
    const response = await db.japanesePlacementResponse.findFirstOrThrow();
    await expect(db.japanesePlacementResponse.update({ where: { id: response.id }, data: { payload: {} } })).rejects.toThrow();
    await db.japanesePlacementBankSnapshot.update({ where: { id: snapshot.id }, data: { revokedAt: new Date() } });
    expect(await service.getStoredJapaneseAttempt(db, "learner", attemptId)).toEqual(finals[0]);
    const fresh = await service.startStoredJapaneseAttempt(db, "learner", { requestId: "00000000-0000-4000-8000-000000000003" });
    const saved = await db.japanesePlacementAttempt.findUniqueOrThrow({ where: { id: fresh.attemptId }, include: { bankSnapshot: true } });
    expect(saved.bankSnapshot.version).toBe(2);
    await db.japanesePlacementBankSnapshot.update({ where: { id: saved.bankSnapshotId }, data: { revokedAt: new Date() } });
    await expect(service.getStoredJapaneseAttempt(db, "learner", fresh.attemptId)).rejects.toMatchObject({ status: 503 });
    await db.user.update({ where: { id: "learner" }, data: { accountStatus: "HIDDEN" } });
    await expect(service.getStoredJapaneseAttempt(db, "learner", attemptId)).rejects.toMatchObject({ status: 403 });
    expect((await client.query('SELECT * FROM "StudentProfile" WHERE id = $1', ['legacy-profile'])).rows[0]).toEqual(englishBefore);
  });
}, 30_000);

test.runIf(process.env.MIRROR_TEST_DATABASE_URL)("rolls back failed completion, resolves conflicting submissions and replaces a revoked active bank", async () => {
  await withIsolatedPostgres("20261022010000_japanese_placement_adaptive", async ({ client, db, applyMigration }) => {
    await applyMigration();
    const service = await import("../../src/lib/japanese-placement/service");
    await db.user.create({ data: { id: "learner", role: "STUDENT", learningLanguage: "JAPANESE" } });
    const requestId = "00000000-0000-4000-8000-000000000011";
    await expect(service.startStoredJapaneseAttempt(db, "learner", { requestId })).rejects.toMatchObject({ status: 503 });
    expect(await db.japanesePlacementAttempt.count()).toBe(0);
    const bank = approvedBank();
    const published = await service.publishJapaneseBank(db, bank);
    const changed = approvedBank();
    changed.items[0].explanation.en = "Changed content must have a new version";
    approveBank(changed);
    await expect(service.publishJapaneseBank(db, changed)).rejects.toMatchObject({ status: 409 });
    const attempt = await service.startStoredJapaneseAttempt(db, "learner", { requestId });
    const competing = await Promise.allSettled(["a", "b"].map((choiceId) => service.submitStoredJapaneseResponse(db, "learner", attempt.attemptId, {
      kind: "answer", itemId: "kana-one", choiceId,
    })));
    expect(competing.filter((result) => result.status === "fulfilled")).toHaveLength(1);
    expect(competing.filter((result) => result.status === "rejected")).toHaveLength(1);
    const rejected = competing.find((result) => result.status === "rejected");
    if (rejected?.status === "rejected") expect(rejected.reason).toMatchObject({ status: 409 });
    expect(await db.japanesePlacementResponse.count()).toBe(1);
    for (const itemId of bank.sequence.slice(1, -1)) {
      await service.submitStoredJapaneseResponse(db, "learner", attempt.attemptId, { kind: "answer", itemId, choiceId: "a" });
    }
    await client.query(`
      CREATE FUNCTION "rejectTestCompletion"() RETURNS trigger LANGUAGE plpgsql AS $$
      BEGIN RAISE EXCEPTION 'owned test failure'; END; $$;
      CREATE TRIGGER "test_completion_failure" BEFORE UPDATE ON "JapanesePlacementAttempt"
      FOR EACH ROW WHEN (NEW.status = 'COMPLETED') EXECUTE FUNCTION "rejectTestCompletion"();
    `);
    const last = { kind: "sentence_assembly", itemId: "writing-one", tileIds: ["topic", "object", "verb"] };
    await expect(service.submitStoredJapaneseResponse(db, "learner", attempt.attemptId, last)).rejects.toThrow();
    expect(await db.japanesePlacementResponse.count()).toBe(5);
    expect(await service.getStoredJapaneseAttempt(db, "learner", attempt.attemptId)).toMatchObject({ status: "IN_PROGRESS", answered: 5, result: null });
    await client.query('DROP TRIGGER "test_completion_failure" ON "JapanesePlacementAttempt"; DROP FUNCTION "rejectTestCompletion"();');
    const done = await service.submitStoredJapaneseResponse(db, "learner", attempt.attemptId, last);
    expect(done.status).toBe("COMPLETED");
    const active = await service.startStoredJapaneseAttempt(db, "learner", { requestId: "00000000-0000-4000-8000-000000000012" });
    await db.japanesePlacementBankSnapshot.update({ where: { id: published.id }, data: { revokedAt: new Date() } });
    // Cached completion retries stay safe after content withdrawal.
    expect(await service.submitStoredJapaneseResponse(db, "learner", attempt.attemptId, last)).toEqual(done);
    await expect(service.submitStoredJapaneseResponse(db, "learner", active.attemptId, { kind: "skip", itemId: "kana-one", reason: "not_sure" })).rejects.toMatchObject({ status: 503 });
    const replacementBank = approvedBank();
    replacementBank.version = 2;
    approveBank(replacementBank);
    await service.publishJapaneseBank(db, replacementBank);
    const replacement = await service.startStoredJapaneseAttempt(db, "learner", { requestId: "00000000-0000-4000-8000-000000000013" });
    expect(replacement.attemptId).not.toBe(active.attemptId);
    expect(await service.getStoredJapaneseAttempt(db, "learner", active.attemptId)).toMatchObject({ status: "ABANDONED", question: null });
    expect(await db.japanesePlacementAttempt.count({ where: { status: "IN_PROGRESS" } })).toBe(1);
    // User deletion can still cascade through assessment rows; snapshot protection does not trap personal data.
    await db.user.delete({ where: { id: "learner" } });
    expect(await db.japanesePlacementAttempt.count()).toBe(0);
    expect(await db.japanesePlacementResponse.count()).toBe(0);
  });
}, 30_000);


test.runIf(process.env.MIRROR_TEST_DATABASE_URL)("persists deadlines, finalizes concurrent expiry and preserves old completed results", async () => {
  await withIsolatedPostgres("20261022010000_japanese_placement_adaptive", async ({ client, db, applyMigration }) => {
    await applyMigration();
    const service = await import("../../src/lib/japanese-placement/service");
    await db.user.create({ data: { id: "timed-learner", role: "STUDENT", learningLanguage: "JAPANESE" } });
    const bank = approvedBank();
    await service.publishJapaneseBank(db, bank);
    const clock = vi.spyOn(Date, "now").mockReturnValue(Date.parse("2026-10-22T03:00:00.000Z"));
    try {
      const requestId = "00000000-0000-4000-8000-000000000021";
      const started = await service.startStoredJapaneseAttempt(db, "timed-learner", { requestId });
      expect(started).toMatchObject({ expiresAt: "2026-10-22T03:20:00.000Z", timeLimitSec: 1200 });
      const answer = { kind: "answer", itemId: "kana-one", choiceId: "a" };
      await service.submitStoredJapaneseResponse(db, "timed-learner", started.attemptId, answer);
      clock.mockReturnValue(Date.parse("2026-10-22T03:19:59.999Z"));
      const resumed = await service.getStoredJapaneseAttempt(db, "timed-learner", started.attemptId);
      expect(resumed).toMatchObject({ status: "IN_PROGRESS", expiresAt: started.expiresAt, answered: 1 });
      expect((await service.startStoredJapaneseAttempt(db, "timed-learner", { requestId })).expiresAt).toBe(started.expiresAt);
      clock.mockReturnValue(Date.parse("2026-10-22T03:20:00.000Z"));
      const results = await Promise.all([
        service.getCurrentJapaneseAttempt(db, "timed-learner"),
        service.submitStoredJapaneseResponse(db, "timed-learner", started.attemptId, { kind: "answer", itemId: "kanji_reading-one", choiceId: "a" }),
        service.getStoredJapaneseAttempt(db, "timed-learner", started.attemptId),
      ]);
      for (const result of results) expect(result).toMatchObject({ status: "COMPLETED", answered: 1, question: null,
        result: { completionReason: "time_limit", completedAt: started.expiresAt, levelEstimate: { status: "insufficient_evidence" } } });
      expect(await db.japanesePlacementResponse.count()).toBe(1);
      expect(await service.submitStoredJapaneseResponse(db, "timed-learner", started.attemptId, answer)).toEqual(results[0]);
      expect(await service.startStoredJapaneseAttempt(db, "timed-learner", { requestId })).toEqual(results[0]);
      await expect(db.japanesePlacementAttempt.update({ where: { id: started.attemptId }, data: { expiresAt: new Date("2026-10-22T04:00:00.000Z") } })).rejects.toThrow();
      const fresh = await service.startStoredJapaneseAttempt(db, "timed-learner", { requestId: "00000000-0000-4000-8000-000000000022" });
      await db.user.create({ data: { id: "timed-teacher", role: "TEACHER", teacherProfile: { create: { id: "timed-teacher-profile" } } } });
      await db.lessonProduct.create({ data: { id: "timed-product", tier: "STANDARD", durationMin: 60, nameEn: "Lesson", nameJa: "レッスン" } });
      await db.booking.create({ data: { teacherId: "timed-teacher-profile", studentId: "timed-learner", lessonProductId: "timed-product",
        learningLanguage: "JAPANESE", status: "CONFIRMED", startsAt: new Date("2026-10-23T00:00:00.000Z"), endsAt: new Date("2026-10-23T01:00:00.000Z") } });
      await expect(db.japanesePlacementAttempt.update({ where: { id: fresh.attemptId }, data: { expiresAt: new Date("2026-10-22T04:00:00.000Z") } })).rejects.toThrow();
      clock.mockReturnValue(Date.parse("2026-10-22T04:00:00.000Z"));
      const teacherRead = await service.getTeacherJapaneseResult(db, "timed-teacher", "timed-learner");
      expect(teacherRead.result).toMatchObject({ attemptId: fresh.attemptId, completionReason: "time_limit", responded: 0 });
      const emptyExpired = await service.getCurrentJapaneseAttempt(db, "timed-learner");
      expect(emptyExpired?.result).toMatchObject({ completionReason: "time_limit", responded: 0, levelEstimate: { status: "insufficient_evidence" } });
      // Closed v2 results must never be parsed/regraded with the new v3 core.
      const snapshot = await db.japanesePlacementBankSnapshot.findFirstOrThrow();
      await client.query(`INSERT INTO "JapanesePlacementAttempt"
        (id, "learnerId", "bankSnapshotId", "requestId", "schemaVersion", "scoringRevision", status, "startedAt", "finishedAt", result)
        VALUES ('old-result', 'timed-learner', $1, '00000000-0000-4000-8000-000000000023', 2, 'japanese-literacy-evidence-v2', 'COMPLETED', NOW(), NOW(), '{"legacy":true}')`, [snapshot.id]);
      expect(await service.getStoredJapaneseAttempt(db, "timed-learner", "old-result")).toMatchObject({ result: { legacy: true }, expiresAt: null });
      await expect(service.submitStoredJapaneseResponse(db, "timed-learner", "old-result", answer)).rejects.toMatchObject({ status: 409 });
    } finally { clock.mockRestore(); }
  });
}, 30_000);


test.runIf(process.env.MIRROR_TEST_DATABASE_URL)("upgrades existing v2 history additively and replaces unsupported active surveys", async () => {
  await withIsolatedPostgres("20261022010000_japanese_placement_adaptive", async ({ client, db, applyMigration }) => {
    await client.query(`
      INSERT INTO "User" (id, role, "learningLanguage", "updatedAt") VALUES ('legacy-learner', 'STUDENT', 'JAPANESE', NOW());
      INSERT INTO "JapanesePlacementBankSnapshot" (id, "bankKey", version, digest, "itemCount", content)
        VALUES ('old-bank', 'old-bank', 1, repeat('a',64), 6, '{"schemaVersion":2}');
      INSERT INTO "JapanesePlacementAttempt" (id, "learnerId", "bankSnapshotId", "requestId", "activeLearnerId", "schemaVersion", "scoringRevision")
        VALUES ('old-completed', 'legacy-learner', 'old-bank', '00000000-0000-4000-8000-000000000032', 'legacy-learner', 2, 'japanese-literacy-evidence-v2');
      INSERT INTO "JapanesePlacementResponse" (id, "attemptId", "itemId", position, payload)
        VALUES ('old-response', 'old-completed', 'kana-one', 0, '{"kind":"answer","itemId":"kana-one","choiceId":"a","submittedAt":"2026-10-22T00:00:00.000Z"}');
      UPDATE "JapanesePlacementAttempt" SET status = 'COMPLETED', "activeLearnerId" = NULL, "finishedAt" = NOW(), result = '{"original":true}' WHERE id = 'old-completed';
      INSERT INTO "JapanesePlacementAttempt" (id, "learnerId", "bankSnapshotId", "requestId", "activeLearnerId", "schemaVersion", "scoringRevision")
        VALUES ('old-active', 'legacy-learner', 'old-bank', '00000000-0000-4000-8000-000000000031', 'legacy-learner', 2, 'japanese-literacy-evidence-v2');
    `);
    await applyMigration();
    const service = await import("../../src/lib/japanese-placement/service");
    expect(await service.getStoredJapaneseAttempt(db, "legacy-learner", "old-completed")).toMatchObject({ result: { original: true }, expiresAt: null });
    expect(await service.submitStoredJapaneseResponse(db, "legacy-learner", "old-completed", { kind: "answer", itemId: "kana-one", choiceId: "a" })).toMatchObject({ result: { original: true } });
    await expect(service.getStoredJapaneseAttempt(db, "legacy-learner", "old-active")).rejects.toMatchObject({ status: 409, code: "ATTEMPT_VERSION_UNSUPPORTED" });
    await expect(service.startStoredJapaneseAttempt(db, "legacy-learner", { requestId: "00000000-0000-4000-8000-000000000033" })).rejects.toMatchObject({ status: 503 });
    expect((await db.japanesePlacementAttempt.findUniqueOrThrow({ where: { id: "old-active" } })).status).toBe("IN_PROGRESS");
    await service.publishJapaneseBank(db, approvedBank());
    expect(await service.startStoredJapaneseAttempt(db, "legacy-learner", { requestId: "00000000-0000-4000-8000-000000000033" })).toMatchObject({ status: "IN_PROGRESS", answered: 0, timeLimitSec: 1200 });
    expect((await db.japanesePlacementAttempt.findUniqueOrThrow({ where: { id: "old-active" } })).status).toBe("ABANDONED");
    expect((await db.japanesePlacementAttempt.findUniqueOrThrow({ where: { id: "old-completed" } })).result).toEqual({ original: true });
  });
}, 30_000);


test.runIf(process.env.MIRROR_TEST_DATABASE_URL)("completes a 24-question adaptive attempt rather than exhausting the whole bank", async () => {
  await withIsolatedPostgres("20261022010000_japanese_placement_adaptive", async ({ db, applyMigration }) => {
    await applyMigration();
    const service = await import("../../src/lib/japanese-placement/service");
    await db.user.create({ data: { id: "adaptive-learner", role: "STUDENT", learningLanguage: "JAPANESE" } });
    const bank = adaptiveBank();
    await service.publishJapaneseBank(db, bank);
    let view = await service.startStoredJapaneseAttempt(db, "adaptive-learner", { requestId: "00000000-0000-4000-8000-000000000041" });
    const deadline = view.expiresAt;
    for (let index = 0; index < 24; index++) {
      expect(view).toMatchObject({ answered: index, total: 24, status: "IN_PROGRESS", expiresAt: deadline });
      const item = bank.items.find((entry) => entry.id === view.question!.id)!;
      view = await service.submitStoredJapaneseResponse(db, "adaptive-learner", view.attemptId, item.responseType === "sentence_assembly"
        ? { kind: "sentence_assembly", itemId: item.id, tileIds: item.acceptedOrders[0] }
        : { kind: "answer", itemId: item.id, choiceId: item.correctChoiceId });
    }
    expect(view).toMatchObject({ status: "COMPLETED", answered: 24, total: 24, question: null,
      result: { completionReason: "question_limit", levelEstimate: { status: "estimated", band: "N1" } } });
    expect(await db.japanesePlacementResponse.count()).toBe(24);
    expect(bank.items.length).toBeGreaterThan(24);
  });
}, 30_000);
