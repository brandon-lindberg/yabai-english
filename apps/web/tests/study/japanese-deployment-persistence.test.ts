import { expect, test } from "vitest";
import { withIsolatedPostgres } from "../../test/isolated-postgres";
import { japaneseStudyFixture } from "../../test/japanese-study-fixture";
import { publishJapaneseDeployment } from "@/lib/japanese-content/deployment";
import { loadReleasedJapaneseBank } from "@/lib/japanese-placement/release";
import { japaneseStudyPublicationGuard, prepareJapaneseStudyImport } from "@/lib/study/japanese-import";

test.runIf(process.env.MIRROR_TEST_DATABASE_URL)("deployment retries preserve published cards, learner progress and existing English records after an interrupted bank publication", async () => {
  const fixture = japaneseStudyFixture();
  const data = { source: fixture.source, study: fixture.build(), bank: await loadReleasedJapaneseBank("data/japanese-placement", "public") };
  const plan = prepareJapaneseStudyImport(data.source, data.study);
  const publication = japaneseStudyPublicationGuard(plan);
  await withIsolatedPostgres("20261106030000_teacher_invitation_email", async ({ db, client, applyMigration, verifyDatamodel }) => {
    await applyMigration();
    await verifyDatamodel();
    await db.user.createMany({ data: [{ id: "english", role: "STUDENT" }, { id: "japanese", role: "STUDENT", learningLanguage: "JAPANESE" }] });
    await db.studentProfile.create({ data: { userId: "english", placedLevel: "INTERMEDIATE", placedSubLevel: 2, placementCompletedAt: new Date("2026-11-01T00:00:00Z") } });
    await db.studyTrack.create({ data: { id: "english", slug: "english-flashcards", titleEn: "English", titleJa: "英語" } });
    await db.studyLevel.create({ data: { id: "english-level", trackId: "english", levelCode: "BEGINNER_1", titleEn: "Beginner", titleJa: "初級" } });
    await db.userStudyLevelProgress.create({ data: { userId: "english", levelId: "english-level", xp: 120 } });
    const protectedRows = () => Promise.all([
      db.user.findMany({ orderBy: { id: "asc" } }), db.studentProfile.findMany(),
      db.studyTrack.findUnique({ where: { id: "english" } }), db.userStudyLevelProgress.findMany(),
    ]);
    const before = await protectedRows();
    await client.query(`CREATE FUNCTION failDeploymentBank() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN RAISE EXCEPTION 'forced bank failure'; END; $$;
      CREATE TRIGGER failDeploymentBank BEFORE INSERT ON "JapanesePlacementBankSnapshot" FOR EACH ROW EXECUTE FUNCTION failDeploymentBank()`);
    await expect(publishJapaneseDeployment(db, data, publication)).rejects.toThrow(/forced bank failure/);
    expect(await db.studyTrack.findUnique({ where: { id: plan.track.id } })).toMatchObject({ publicationStatus: "PUBLISHED", catalogSnapshotId: plan.snapshot.id });
    expect(await db.japanesePlacementBankSnapshot.count()).toBe(0);
    expect(await protectedRows()).toEqual(before);
    await client.query("DROP TRIGGER failDeploymentBank ON \"JapanesePlacementBankSnapshot\"; DROP FUNCTION failDeploymentBank()");

    await db.userStudyCardState.create({ data: { userId: "japanese", cardId: plan.cards[0].id, reps: 2 } });
    const studyRows = () => Promise.all([
      db.studyCard.findMany({ orderBy: { id: "asc" } }), db.studyCatalogSnapshot.findMany(),
      db.studyCatalogCardSnapshot.findMany({ orderBy: [{ snapshotId: "asc" }, { cardId: "asc" }] }), db.userStudyCardState.findMany(),
    ]);
    const savedStudy = await studyRows();
    const first = await publishJapaneseDeployment(db, data, publication);
    const second = await publishJapaneseDeployment(db, data, publication);
    expect(first.study).toMatchObject({ published: false, cards: 2 });
    expect(second).toEqual(first);
    expect(await db.japanesePlacementBankSnapshot.count()).toBe(1);
    expect(await studyRows()).toEqual(savedStudy);
    expect(await protectedRows()).toEqual(before);
  });
}, 30_000);
