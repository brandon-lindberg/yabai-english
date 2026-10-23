import type { Prisma, PrismaClient } from "@/generated/prisma/client";
import { isDeepStrictEqual } from "node:util";
import { requireUnique, sameStringMembers } from "../unique";
import { sha256 } from "../japanese-content/digest";
import { sourceLockDigest } from "../japanese-content/source-files";
import { serializeJapaneseFlashcards, type JapaneseFlashcardCatalog } from "../japanese-content/flashcard-catalog";
import { serializeJapaneseStudyCatalog, type JapaneseStudyCatalog } from "../japanese-content/study-catalog";
import { JAPANESE_STUDY_LEVEL_ORDER } from "./constants";

const json = (value: unknown) => JSON.parse(JSON.stringify(value)) as Prisma.InputJsonValue;
const levelId = (code: string) => `ja-study:level:${code}`;
const deckId = (code: string, kind: string) => `ja-study:deck:${code}:${kind}`;

/** Compile validated artifacts into a draft persistence plan, without database access. */
export function prepareJapaneseStudyImport(source: JapaneseFlashcardCatalog, study: JapaneseStudyCatalog) {
  if (source.schemaVersion !== 4 || study.schemaVersion !== 1 || source.status !== "draft" || study.status !== "draft" || source.learningLanguage !== "JAPANESE" || study.learningLanguage !== "JAPANESE") throw new Error("Only supported Japanese draft catalogs can be imported");
  if (sha256(serializeJapaneseFlashcards(source)) !== study.sourceCatalogSha256 || sourceLockDigest(source.sourceLock) !== study.sourceLockSha256 || sha256(JSON.stringify(study.policy)) !== study.policySha256) throw new Error("Study import source/policy digest drift");
  requireUnique(source.cards.map(card => card.id), "import source identity");
  requireUnique(study.units.map(unit => unit.id), "import canonical identity");
  const records = new Map(source.cards.map(card => [card.id, card]));
  const members = study.units.flatMap(unit => unit.recordIds);
  requireUnique(members, "import member ownership");
  if (!sameStringMembers(members, [...records.keys()]) || !sameStringMembers(Object.keys(study.recordToUnit), members)) throw new Error("Study import must cover every source identity");
  const digest = sha256(serializeJapaneseStudyCatalog(study));
  const snapshotId = `ja-study:${digest}`;
  const { cards: _sourceCards, ...sourceProvenance } = source;
  const { units: _units, ...studyProvenance } = study;
  const snapshot = {
    id: snapshotId, studyCatalogSha256: digest, sourceCatalogSha256: study.sourceCatalogSha256,
    sourceLockSha256: study.sourceLockSha256, policySha256: study.policySha256,
    provenanceJson: json({ source: sourceProvenance, study: studyProvenance }),
  };
  const track = { id: "ja-study:track", slug: "japanese-flashcards", titleJa: "日本語フラッシュカード", titleEn: "Japanese flashcards", learningLanguage: "JAPANESE" as const, publicationStatus: "DRAFT" as const, catalogSnapshotId: snapshotId };
  const levels = JAPANESE_STUDY_LEVEL_ORDER.map((levelCode, sortOrder) => ({ id: levelId(levelCode), trackId: track.id, levelCode, titleJa: levelCode, titleEn: levelCode, sortOrder }));
  const decks = levels.flatMap(level => (["vocabulary", "kanji"] as const).map((kind, sortOrder) => ({ id: deckId(level.levelCode, kind), levelId: level.id, titleJa: kind === "kanji" ? "漢字" : "語彙", titleEn: kind === "kanji" ? "Kanji" : "Vocabulary", sortOrder })));
  const cards = study.units.map((unit, sortOrder) => {
    if (!unit.recordIds.includes(unit.id) || unit.answerPolicy !== "member-specific" || !JAPANESE_STUDY_LEVEL_ORDER.includes(unit.level.code)) throw new Error(`Invalid canonical unit: ${unit.id}`);
    const unitRecords = unit.recordIds.map(id => {
      const record = records.get(id);
      if (!record || record.kind !== unit.kind || study.recordToUnit[id] !== unit.id) throw new Error(`Invalid study member: ${id}`);
      return record;
    });
    return { id: unit.id, deckId: deckId(unit.level.code, unit.kind), kind: unit.kind === "kanji" ? "JAPANESE_KANJI" as const : "JAPANESE_VOCABULARY" as const,
      frontJa: "", backEn: "", sortOrder, contentJson: json({ schemaVersion: 1, unit, records: unitRecords }) };
  });
  return { snapshot, track, levels, decks, cards };
}

/** Atomic, idempotent draft insert. No deletion, replacement, publication or progress writes. */
export async function importJapaneseStudyDraft(db: PrismaClient, source: JapaneseFlashcardCatalog, study: JapaneseStudyCatalog) {
  const plan = prepareJapaneseStudyImport(source, study);
  return db.$transaction(async tx => {
    const existing = await tx.studyTrack.findUnique({ where: { slug: plan.track.slug } });
    if (existing) {
      if (existing.id !== plan.track.id || existing.learningLanguage !== "JAPANESE" || existing.publicationStatus !== "DRAFT" || existing.catalogSnapshotId !== plan.snapshot.id) throw new Error("Refusing to replace an existing or published study catalog");
      const saved = await tx.studyCard.findMany({ where: { deck: { level: { trackId: existing.id } } }, orderBy: { sortOrder: "asc" },
        select: { id: true, deckId: true, kind: true, frontJa: true, backEn: true, sortOrder: true, contentJson: true, exerciseJson: true } });
      const snapshot = await tx.studyCatalogSnapshot.findUniqueOrThrow({ where: { id: plan.snapshot.id } });
      if (!isDeepStrictEqual(saved, plan.cards.map(card => ({ ...card, exerciseJson: null }))) || !isDeepStrictEqual(snapshot.provenanceJson, plan.snapshot.provenanceJson)) throw new Error("Existing draft content drift; explicit migration required");
      return { imported: false, cards: saved.length, digest: plan.snapshot.studyCatalogSha256 };
    }
    await tx.studyCatalogSnapshot.create({ data: plan.snapshot });
    await tx.studyTrack.create({ data: plan.track });
    await tx.studyLevel.createMany({ data: plan.levels });
    await tx.studyDeck.createMany({ data: plan.decks });
    for (let offset = 0; offset < plan.cards.length; offset += 250) {
      await tx.studyCard.createMany({ data: plan.cards.slice(offset, offset + 250) });
    }
    return { imported: true, cards: plan.cards.length, digest: plan.snapshot.studyCatalogSha256 };
  }, { isolationLevel: "Serializable", timeout: 60_000 });
}
