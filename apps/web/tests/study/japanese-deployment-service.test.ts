import { beforeEach, expect, test, vi } from "vitest";
import type { PrismaClient } from "@/generated/prisma/client";
import { japaneseStudyFixture } from "../../test/japanese-study-fixture";
import { canonicalJson } from "@/lib/canonical-json";
import { sha256 } from "@/lib/japanese-content/digest";
import { loadReleasedJapaneseBank } from "@/lib/japanese-placement/release";
import { prepareJapaneseStudyImport } from "@/lib/study/japanese-import";

const mocks = vi.hoisted(() => ({ importStudy: vi.fn(), publishStudy: vi.fn(), publishBank: vi.fn() }));
vi.mock("@/lib/study/japanese-import", async original => ({
  ...await original<typeof import("@/lib/study/japanese-import")>(),
  importJapaneseStudyDraft: mocks.importStudy, publishJapaneseStudyDraft: mocks.publishStudy,
}));
vi.mock("@/lib/japanese-placement/service", () => ({ publishJapaneseBank: mocks.publishBank }));

const bank = await loadReleasedJapaneseBank("data/japanese-placement", "public");
const fixture = japaneseStudyFixture();
const source = fixture.source;
const study = fixture.build();
const plan = prepareJapaneseStudyImport(source, study);
const publication = { expectedSnapshotId: plan.snapshot.id,
  expectedCardsSha256: sha256(canonicalJson(plan.cards.map(card => ({ ...card, exerciseJson: null })))) };
const data = { bank, source, study };
const findTrack = vi.fn();
const db = { studyTrack: { findUnique: findTrack } } as unknown as PrismaClient;
const deploy = async () => (await import("@/lib/japanese-content/deployment")).publishJapaneseDeployment(db, data, publication);

beforeEach(() => {
  vi.clearAllMocks();
  findTrack.mockResolvedValue(null);
  mocks.importStudy.mockResolvedValue({ imported: true, cards: 2 });
  mocks.publishStudy.mockResolvedValue({ published: true, cards: 2, snapshotId: plan.snapshot.id });
  mocks.publishBank.mockResolvedValue({ id: "bank", digest: "digest", version: 3 });
});

test("deploys through the existing import and publication functions", async () => {
  await deploy();
  expect(mocks.importStudy).toHaveBeenCalledWith(db, source, study);
  expect(mocks.publishStudy).toHaveBeenCalledWith(db, source, study, publication);
  expect(mocks.publishBank).toHaveBeenCalledWith(db, bank);
});

test("resuming after a completed study publication only verifies it before retrying the bank", async () => {
  mocks.publishBank.mockRejectedValueOnce(new Error("interrupted"));
  await expect(deploy()).rejects.toThrow("interrupted");
  findTrack.mockResolvedValue({ publicationStatus: "PUBLISHED" });
  mocks.publishStudy.mockResolvedValue({ published: false, cards: 2, snapshotId: plan.snapshot.id });
  await deploy();
  expect(mocks.importStudy).toHaveBeenCalledTimes(1);
  expect(mocks.publishStudy).toHaveBeenCalledTimes(2);
  expect(mocks.publishBank).toHaveBeenCalledTimes(2);
});

test("a saved draft uses the existing publication verifier", async () => {
  findTrack.mockResolvedValue({ publicationStatus: "DRAFT" });
  await deploy();
  expect(mocks.importStudy).not.toHaveBeenCalled();
  expect(mocks.publishStudy).toHaveBeenCalledWith(db, source, study, publication);
});

test("invalid publication pins cannot insert a draft or publish either feature", async () => {
  const { publishJapaneseDeployment } = await import("@/lib/japanese-content/deployment");
  await expect(publishJapaneseDeployment(db, data, { ...publication, expectedCardsSha256: "0".repeat(64) })).rejects.toThrow("Publication content pins differ");
  expect(findTrack).not.toHaveBeenCalled();
  expect(mocks.importStudy).not.toHaveBeenCalled();
  expect(mocks.publishStudy).not.toHaveBeenCalled();
  expect(mocks.publishBank).not.toHaveBeenCalled();
});
