import { expect, test } from "vitest";
import { withIsolatedPostgres } from "../../test/isolated-postgres";

test.runIf(process.env.MIRROR_TEST_DATABASE_URL)("backfills compact immutable references and derives them for future snapshots without changing published data", async () => {
  await withIsolatedPostgres("20261113000000_study_runtime_references", async ({ client, applyMigration, verifyDatamodel }) => {
    const reference = { sourceRow: "N5:2", sourceFileId: "ref", level: "N5", status: "matched", kana: "ねこ", kanji: "猫", candidateCardIds: ["cat"], authoringOnly: "large audit detail" };
    const provenance = { source: { reconciliation: [reference], sourceLock: { retained: true } }, study: { unchanged: true } };
    await client.query(`INSERT INTO "StudyCatalogSnapshot" (id,"studyCatalogSha256","sourceCatalogSha256","sourceLockSha256","policySha256","provenanceJson") VALUES ('snapshot','study','source','lock','policy',$1)`, [JSON.stringify(provenance)]);
    await client.query(`INSERT INTO "StudyTrack" (id,slug,"titleJa","titleEn","learningLanguage","publicationStatus","catalogSnapshotId") VALUES ('track','japanese-flashcards','日本語','Japanese','JAPANESE','PUBLISHED','snapshot')`);
    const before = (await client.query(`SELECT * FROM "StudyCatalogSnapshot"`)).rows;
    const tracks = (await client.query(`SELECT * FROM "StudyTrack"`)).rows;
    await applyMigration();
    await verifyDatamodel();
    expect((await client.query(`SELECT * FROM "StudyCatalogSnapshot"`)).rows).toEqual(before);
    expect((await client.query(`SELECT * FROM "StudyTrack"`)).rows).toEqual(tracks);
    const { authoringOnly: _authoringOnly, ...compact } = reference;
    expect((await client.query(`SELECT * FROM "StudyCatalogReference"`)).rows).toEqual([{ snapshotId: "snapshot", sourceRow: "N5:2", referenceJson: compact }]);
    await expect(client.query(`UPDATE "StudyCatalogReference" SET "referenceJson" = '{}'`)).rejects.toThrow(/immutable/i);
    await expect(client.query(`DELETE FROM "StudyCatalogReference"`)).rejects.toThrow(/immutable/i);
    await client.query(`INSERT INTO "StudyCatalogSnapshot" (id,"studyCatalogSha256","sourceCatalogSha256","sourceLockSha256","policySha256","provenanceJson") VALUES ('future','future','source','lock','policy',$1)`, [JSON.stringify(provenance)]);
    expect((await client.query(`SELECT "referenceJson" FROM "StudyCatalogReference" WHERE "snapshotId" = 'future'`)).rows).toEqual([{ referenceJson: compact }]);
    const duplicate = { source: { reconciliation: [reference, reference] } };
    await expect(client.query(`INSERT INTO "StudyCatalogSnapshot" (id,"studyCatalogSha256","sourceCatalogSha256","sourceLockSha256","policySha256","provenanceJson") VALUES ('bad','bad','source','lock','policy',$1)`, [JSON.stringify(duplicate)])).rejects.toThrow(/unique|duplicate/i);
    expect((await client.query(`SELECT id FROM "StudyCatalogSnapshot" WHERE id = 'bad'`)).rows).toEqual([]);
  });
}, 30_000);
