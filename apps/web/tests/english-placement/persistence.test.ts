import { expect, test, vi } from "vitest";
import { randomUUID } from "node:crypto";
import { withIsolatedPostgres } from "../../test/isolated-postgres";
import { loadPlacementBankSync } from "../../src/lib/placement-bank/load-placement-bank";
import { getOrStartEnglishAttempt, submitEnglishAttempt, type EnglishPlacementState } from "../../src/lib/english-placement/service";
import type { EnglishPlacementActive } from "../../src/lib/english-placement/public";
import type { PrismaClient } from "../../src/generated/prisma/client";

const migration = "20261030000000_english_placement_attempts";
const bank = loadPlacementBankSync();
const dbTest = test.runIf(process.env.MIRROR_TEST_DATABASE_URL);
async function learner(db: PrismaClient, id = randomUUID()) {
  await db.user.create({ data: { id, role: "STUDENT", learningLanguage: "ENGLISH", studentProfile: { create: {} } } });
  return id;
}
async function start(db: PrismaClient, id: string) { return (await getOrStartEnglishAttempt(db, id, async () => bank)).body as EnglishPlacementActive; }
async function answer(db: PrismaClient, id: string, current: EnglishPlacementActive) {
  const correct = bank.find(q => q.id === current.question!.id)!.correctIndex;
  return (await submitEnglishAttempt(db, id, { action: "answer", attemptToken: current.attemptToken, answer: correct })).body as EnglishPlacementActive;
}
async function through(db: PrismaClient, id: string, count: number) {
  let current = await start(db, id);
  for (let i = 0; i < count; i++) current = await answer(db, id, current);
  return current;
}
const finish = (db: PrismaClient, id: string, current: EnglishPlacementActive) => submitEnglishAttempt(db, id, { action: "finish", attemptToken: current.attemptToken });

dbTest("the additive migration preserves existing English and Japanese history", async () => {
  await withIsolatedPostgres(migration, async ({ client, db, applyMigration, verifyDatamodel }) => {
    const id = await learner(db);
    await db.studentProfile.update({ where: { userId: id }, data: { placedLevel: "INTERMEDIATE", placedSubLevel: 2, placementReport: { legacy: true }, placementCompletedAt: new Date("2026-01-01T00:00:00Z") } });
    const before = await db.studentProfile.findUnique({ where: { userId: id } });
    const japanese = await client.query('SELECT md5(COALESCE(jsonb_agg(to_jsonb(t))::text,\'[]\')) AS digest FROM "JapanesePlacementBankSnapshot" t');
    await applyMigration(); await verifyDatamodel();
    expect(await db.studentProfile.findUnique({ where: { userId: id } })).toEqual(before);
    expect((await client.query('SELECT md5(COALESCE(jsonb_agg(to_jsonb(t))::text,\'[]\')) AS digest FROM "JapanesePlacementBankSnapshot" t')).rows).toEqual(japanese.rows);
    expect(await db.englishPlacementAttempt.count()).toBe(0);
    expect(await db.englishPlacementBankSnapshot.count()).toBe(0);
  });
}, 60_000);

dbTest("PostgreSQL serializes competing starts, answer retries and finish retries", async () => {
  await withIsolatedPostgres(migration, async ({ client, db, applyMigration }) => {
    await applyMigration(); const id = await learner(db);
    await client.query(`CREATE TABLE "ProfileWrites" ("id" TEXT);
      CREATE FUNCTION count_profile_write() RETURNS trigger LANGUAGE plpgsql SET search_path FROM CURRENT AS $$ BEGIN INSERT INTO "ProfileWrites" VALUES (NEW."userId"); RETURN NEW; END $$;
      CREATE TRIGGER count_profile_write AFTER UPDATE ON "StudentProfile" FOR EACH ROW EXECUTE FUNCTION count_profile_write();`);
    const starts = await Promise.all([start(db, id), start(db, id)]);
    expect(starts[0]).toEqual({ ...starts[1], serverNow: starts[0].serverNow });
    const retries = await Promise.all([answer(db, id, starts[0]), answer(db, id, starts[0])]);
    expect(retries[0]).toEqual({ ...retries[1], serverNow: retries[0].serverNow });
    expect(retries[0].progress.current).toBe(2);
    let current = retries[0];
    for (let i = 1; i < 24; i++) current = await answer(db, id, current);
    const results = await Promise.all([finish(db, id, current), finish(db, id, current), finish(db, id, starts[0])]);
    expect(results[0].body).toMatchObject({ level: "ADVANCED", subLevel: 3 });
    expect(results.map(r => r.body)).toEqual([results[0].body, results[0].body, results[0].body]);
    expect((await client.query('SELECT count(*)::int AS count FROM "ProfileWrites"')).rows[0].count).toBe(1);
    expect(await db.englishPlacementAttempt.count()).toBe(1);
    const row = await db.englishPlacementAttempt.findFirstOrThrow();
    expect(row).toMatchObject({ status: "COMPLETED", revision: 24, activeLearnerId: null });
    expect((row.state as unknown as EnglishPlacementState).asked).toHaveLength(24);
  });
}, 60_000);

dbTest("a failed profile write rolls back the terminal receipt and permits a safe retry", async () => {
  await withIsolatedPostgres(migration, async ({ client, db, applyMigration }) => {
    await applyMigration(); const id = await learner(db), current = await through(db, id, 24);
    const before = await db.englishPlacementAttempt.findFirstOrThrow();
    await client.query(`CREATE FUNCTION fail_profile_write() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN RAISE EXCEPTION 'forced rollback'; END $$;
      CREATE TRIGGER fail_profile_write BEFORE UPDATE ON "StudentProfile" FOR EACH ROW EXECUTE FUNCTION fail_profile_write();`);
    await expect(finish(db, id, current)).rejects.toThrow("forced rollback");
    expect(await db.englishPlacementAttempt.findFirstOrThrow()).toEqual(before);
    expect((await db.studentProfile.findUniqueOrThrow({ where: { userId: id } })).placedLevel).toBe("UNSET");
    await client.query('DROP TRIGGER fail_profile_write ON "StudentProfile"');
    expect((await finish(db, id, current)).body).toMatchObject({ level: "ADVANCED" });
  });
}, 60_000);

dbTest("timeout/read races preserve accepted evidence and finalize a single penalty", async () => {
  await withIsolatedPostgres(migration, async ({ db, applyMigration }) => {
    await applyMigration(); const id = await learner(db), current = await through(db, id, 15);
    vi.spyOn(Date, "now").mockReturnValue(current.expiresAt);
    try {
      const outcomes = await Promise.allSettled([finish(db, id, current), getOrStartEnglishAttempt(db, id, async () => bank), answer(db, id, current)]);
      const row = await db.englishPlacementAttempt.findFirstOrThrow();
      expect(row).toMatchObject({ status: "COMPLETED", revision: 15 });
      expect(row.result).toMatchObject({ assessment: { answered: 15, minimumAnswers: 15, completionReason: "timeout", timeoutPenaltyPoints: 10 } });
      expect(outcomes[0]).toMatchObject({ status: "fulfilled", value: { body: row.result } });
      expect((await finish(db, id, current)).body).toEqual(row.result);
      expect(await db.englishPlacementAttempt.count()).toBe(1);
    } finally { vi.restoreAllMocks(); }
  });
}, 60_000);

dbTest("the database protects the original deadline, accepted answers, bank and finished results", async () => {
  await withIsolatedPostgres(migration, async ({ db, applyMigration }) => {
    await applyMigration(); const id = await learner(db), current = await through(db, id, 1);
    const row = await db.englishPlacementAttempt.findFirstOrThrow();
    await expect(db.englishPlacementAttempt.update({ where: { id: row.id }, data: { expiresAt: new Date(row.expiresAt.getTime() + 1000) } })).rejects.toThrow();
    const changed = structuredClone(row.state) as unknown as EnglishPlacementState;
    changed.asked[0].answer = (changed.asked[0].answer + 1) % 3;
    await expect(db.englishPlacementAttempt.update({ where: { id: row.id }, data: { state: JSON.parse(JSON.stringify(changed)) } })).rejects.toThrow();
    await expect(db.englishPlacementBankSnapshot.update({ where: { id: row.bankSnapshotId }, data: { content: [] } })).rejects.toThrow();
    vi.spyOn(Date, "now").mockReturnValue(row.expiresAt.getTime());
    try { await finish(db, id, current); } finally { vi.restoreAllMocks(); }
    await expect(db.englishPlacementAttempt.update({ where: { id: row.id }, data: { result: { changed: true } } })).rejects.toThrow();
  });
}, 60_000);

dbTest("missing state and null answer fields cannot create valid evidence", async () => {
  await withIsolatedPostgres(migration, async ({ db, applyMigration }) => {
    await applyMigration(); const id = await learner(db); await start(db, id);
    const row = await db.englishPlacementAttempt.findFirstOrThrow(), other = await learner(db);
    const state = structuredClone(row.state) as unknown as EnglishPlacementState;
    const writes = await Promise.allSettled([
      db.englishPlacementAttempt.create({ data: {
        id: randomUUID(), learnerId: other, activeLearnerId: other, bankSnapshotId: row.bankSnapshotId,
        schemaVersion: 1, scoringVersion: 2, routingRevision: row.routingRevision, state: {},
        startedAt: row.startedAt, expiresAt: row.expiresAt,
      } }),
      db.englishPlacementAttempt.update({ where: { id: row.id }, data: {
        revision: 1, state: { ...JSON.parse(JSON.stringify(state)), asked: [{ id: state.currentQuestionId, answer: null, acceptedAt: Date.now() }] },
      } }),
    ]);
    expect(writes.map(write => write.status)).toEqual(["rejected", "rejected"]);
  });
}, 60_000);
