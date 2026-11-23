import { expect, test, vi } from "vitest";
import { readUnlockRates, refreshUnlockSnapshot } from "@/lib/achievements/rarity-snapshot";
import { withIsolatedPostgres } from "../../test/isolated-postgres";

const { callbacks } = vi.hoisted(() => ({ callbacks: [] as Array<() => Promise<void>> }));
vi.mock("next/server", () => ({ after: (callback: () => Promise<void>) => callbacks.push(callback) }));

test.runIf(process.env.MIRROR_TEST_DATABASE_URL)("gallery rarity refreshes for new accounts and new awards without mixing collections", async () => {
  await withIsolatedPostgres("20261122000000_teaching_achievement_collections", async ({ db, applyMigration }) => {
    await applyMigration();
    await db.user.createMany({ data: [
      ...Array.from({ length: 10 }, (_, i) => ({ id: "english-" + i, role: "STUDENT" as const, learningLanguage: "ENGLISH" as const })),
      { id: "japanese", role: "STUDENT", learningLanguage: "JAPANESE" },
      { id: "teacher", role: "TEACHER" },
    ] });
    await db.learningAchievementAward.createMany({ data: [
      { userId: "english-0", learningLanguage: "ENGLISH", achievementId: "cards-0001" },
      { userId: "japanese", learningLanguage: "JAPANESE", achievementId: "cards-0001" },
    ] });
    await db.teachingAchievementAward.create({ data: { userId: "teacher", achievementId: "teach-profile" } });
    for (const scope of ["LEARN_ENGLISH", "LEARN_JAPANESE", "TEACHING"] as const) await refreshUnlockSnapshot(db, scope);
    const englishRate = async () => (await readUnlockRates(db, "LEARN_ENGLISH"))("cards-0001", false);
    const baseline = await englishRate();
    expect(baseline).toMatchObject({ fraction: 0.1, rare: false });
    expect(callbacks).toHaveLength(0);

    const clock = vi.spyOn(Date, "now");
    let now = Date.now();
    const expireEnglishSnapshot = async () => {
      now += 5 * 60_000 + 1;
      clock.mockReturnValue(now);
      await db.achievementUnlockSnapshot.update({
        where: { scope: "LEARN_ENGLISH" }, data: { refreshedAt: new Date(now - 5 * 60_000) },
      });
    };
    const finishRefresh = async () => {
      expect(callbacks).toHaveLength(1);
      await callbacks.shift()!();
    };
    try {
      await db.user.create({ data: { id: "new-english", role: "STUDENT", learningLanguage: "ENGLISH" } });
      expect(await englishRate()).toEqual(baseline);
      expect(callbacks).toHaveLength(0);

      await expireEnglishSnapshot();
      const concurrent = await Promise.all(Array.from({ length: 5 }, englishRate));
      expect(concurrent).toEqual(Array(5).fill(baseline));
      await finishRefresh();
      expect(await englishRate()).toMatchObject({ fraction: 0.0909, rare: true });

      await db.learningAchievementAward.create({
        data: { userId: "new-english", learningLanguage: "ENGLISH", achievementId: "cards-0001" },
      });
      await expireEnglishSnapshot();
      await englishRate();
      await finishRefresh();
      expect(await englishRate()).toMatchObject({ fraction: 0.1818, rare: false });
      expect((await readUnlockRates(db, "LEARN_JAPANESE"))("cards-0001", false)).toMatchObject({ fraction: 1, rare: false });
      expect((await readUnlockRates(db, "TEACHING"))("teach-profile", false)).toMatchObject({ fraction: 1, rare: false });
    } finally {
      clock.mockRestore();
      callbacks.length = 0;
    }
  });
}, 30_000);
