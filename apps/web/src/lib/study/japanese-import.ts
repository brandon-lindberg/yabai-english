import type { Prisma, PrismaClient } from "@/generated/prisma/client";
import { isDeepStrictEqual } from "node:util";
import { requireUnique, sameStringMembers } from "../unique";
import { sha256 } from "../japanese-content/digest";
import { sourceLockDigest } from "../japanese-content/source-files";
import { serializeJapaneseFlashcards, type JapaneseFlashcardCatalog } from "../japanese-content/flashcard-catalog";
import { serializeJapaneseStudyCatalog, type JapaneseStudyCatalog } from "../japanese-content/study-catalog";
import { JAPANESE_STUDY_LEVEL_ORDER } from "./constants";
import { canonicalJson } from "../canonical-json";
import { parseJapaneseDraftRefreshGuard, type JapaneseDraftRefreshGuard } from "./japanese-import-options";

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

type ImportPlan = ReturnType<typeof prepareJapaneseStudyImport>;
const cardSelection = { id: true, deckId: true, kind: true, frontJa: true, backEn: true, sortOrder: true, contentJson: true, exerciseJson: true } as const;
type StoredCards = Prisma.StudyCardGetPayload<{ select: typeof cardSelection }>[];
const plannedCards = (plan: ImportPlan): StoredCards => plan.cards.map(card => ({ ...card, contentJson: card.contentJson as Prisma.JsonValue, exerciseJson: null }));
export const japaneseStudyCardsDigest = (cards: StoredCards) => sha256(canonicalJson(cards));

async function readDraft(tx: Prisma.TransactionClient) {
  const track = await tx.studyTrack.findUnique({ where: { slug: "japanese-flashcards" } });
  if (!track) return null;
  const cards = await tx.studyCard.findMany({ where: { deck: { level: { trackId: track.id } } }, orderBy: { sortOrder: "asc" }, select: cardSelection });
  const levels = await tx.studyLevel.findMany({ where: { trackId: track.id }, orderBy: { sortOrder: "asc" } });
  const decks = await tx.studyDeck.findMany({ where: { level: { trackId: track.id } }, orderBy: [{ levelId: "asc" }, { sortOrder: "asc" }] });
  const snapshot = track.catalogSnapshotId ? await tx.studyCatalogSnapshot.findUnique({ where: { id: track.catalogSnapshotId } }) : null;
  return { track, cards, levels, decks, snapshot };
}

async function learnerActivity(tx: Prisma.TransactionClient, trackId: string, snapshotId: string | null) {
  const card = { deck: { level: { trackId } } };
  const counts = await Promise.all([
    tx.userStudyCardState.count({ where: { card } }),
    tx.userStudyLevelProgress.count({ where: { level: { trackId } } }),
    tx.studyReviewPrompt.count({ where: { OR: [{ card }, { catalogSnapshotId: snapshotId ?? "" }] } }),
    tx.studyQuickReviewDay.count({ where: { learningLanguage: "JAPANESE" } }),
    tx.userStudyAssessmentAttempt.count({ where: { assessment: { level: { trackId } } } }),
  ]);
  return Object.fromEntries(["cardStates", "levelProgress", "issuedPrompts", "dailyReviews", "assessmentAttempts"].map((key, i) => [key, counts[i]]));
}

/** Read-only operator inspection. The default artifact verification never connects to a DB. */
export async function inspectJapaneseStudyDraft(db: PrismaClient, plan?: ImportPlan) {
  return db.$transaction(async tx => {
    const saved = await readDraft(tx);
    if (!saved) throw new Error("Japanese draft does not exist");
    if (plan) {
      assertStructure(saved, plan);
      if (saved.track.catalogSnapshotId !== plan.snapshot.id) assertRefreshIdentity(saved, plan);
      else assertExactDraft(saved, plan);
    }
    return { snapshotId: saved.track.catalogSnapshotId, publicationStatus: saved.track.publicationStatus,
      learningLanguage: saved.track.learningLanguage, cards: saved.cards.length,
      cardsSha256: japaneseStudyCardsDigest(saved.cards), learnerActivity: await learnerActivity(tx, saved.track.id, saved.track.catalogSnapshotId),
      ...(plan ? { targetSnapshotId: plan.snapshot.id, changedCards: saved.cards.filter((card, i) => !isDeepStrictEqual(card.contentJson, plan.cards[i].contentJson)).length } : {}) };
  }, { isolationLevel: "RepeatableRead", timeout: 60_000 });
}

function assertExactDraft(saved: NonNullable<Awaited<ReturnType<typeof readDraft>>>, plan: ImportPlan) {
  if (!isDeepStrictEqual(saved.cards, plannedCards(plan)) || !saved.snapshot || Object.entries(plan.snapshot).some(([key, value]) => !isDeepStrictEqual(saved.snapshot![key as keyof typeof saved.snapshot], value))) throw new Error("Existing draft content drift; explicit migration required");
}

function assertStructure(saved: NonNullable<Awaited<ReturnType<typeof readDraft>>>, plan: ImportPlan) {
  const { catalogSnapshotId: _snapshotId, ...track } = saved.track;
  const { catalogSnapshotId: _nextId, ...nextTrack } = plan.track;
  if (!isDeepStrictEqual(track, { ...nextTrack, sortOrder: 0 })
    || !isDeepStrictEqual(saved.levels, plan.levels.map(level => ({ ...level, referenceMarkdown: null })))
    || !isDeepStrictEqual([...saved.decks].sort((a, b) => a.id.localeCompare(b.id)), plan.decks.map(deck => ({ ...deck, ownerUserId: null, visibility: "SYSTEM" })).sort((a, b) => a.id.localeCompare(b.id)))) {
    throw new Error("Japanese draft track/level/deck structure drift");
  }
}

async function retainCardHistory(tx: Prisma.TransactionClient, snapshotId: string, cards: StoredCards, allowCreate: boolean, allowMissing = false) {
  const history = await tx.studyCatalogCardSnapshot.findMany({ where: { snapshotId } });
  if (history.length) {
    const byId = new Map(history.map(row => [row.cardId, row.cardJson]));
    if (history.length !== cards.length || cards.some(card => !isDeepStrictEqual(byId.get(card.id), card))) throw new Error("Immutable draft card history drift");
  } else if (allowCreate) {
    for (let offset = 0; offset < cards.length; offset += 250) await tx.studyCatalogCardSnapshot.createMany({
      data: cards.slice(offset, offset + 250).map(card => ({ snapshotId, cardId: card.id, cardJson: json(card) })),
    });
  } else if (!allowMissing) throw new Error("Missing immutable draft card history");
}

function assertRefreshIdentity(saved: NonNullable<Awaited<ReturnType<typeof readDraft>>>, plan: ImportPlan) {
  const snapshot = saved.snapshot;
  const previous = snapshot?.provenanceJson as unknown as { study?: Omit<JapaneseStudyCatalog, "units"> };
  const next = plan.snapshot.provenanceJson as unknown as { study: Omit<JapaneseStudyCatalog, "units"> };
  if (!snapshot || snapshot.id !== `ja-study:${snapshot.studyCatalogSha256}` || snapshot.sourceLockSha256 !== plan.snapshot.sourceLockSha256
    || !previous?.study || previous.study.sourceCatalogSha256 !== snapshot.sourceCatalogSha256 || previous.study.policySha256 !== snapshot.policySha256
    || !isDeepStrictEqual(previous.study.recordToUnit, next.study.recordToUnit)
    || !isDeepStrictEqual(previous.study.referenceToUnits, next.study.referenceToUnits)
    || !isDeepStrictEqual(previous.study.levelDecisions, next.study.levelDecisions)
    || !isDeepStrictEqual({ ...previous.study.policy, sourceCatalogSha256: next.study.sourceCatalogSha256 }, next.study.policy)) {
    throw new Error("Japanese draft source/policy/member/level identity drift");
  }
  if (saved.cards.length !== plan.cards.length || saved.cards.some((card, i) => {
    const nextCard = plan.cards[i];
    const content = card.contentJson as unknown as { schemaVersion: number; unit: unknown } | null;
    const nextContent = nextCard.contentJson as unknown as { unit: unknown };
    return card.id !== nextCard.id || card.deckId !== nextCard.deckId || card.kind !== nextCard.kind || card.sortOrder !== nextCard.sortOrder
      || card.frontJa !== "" || card.backEn !== "" || card.exerciseJson !== null || content?.schemaVersion !== 1
      || !isDeepStrictEqual(content.unit, nextContent.unit);
  })) throw new Error("Japanese draft card identity/member/level structure drift");
}

/** Atomic initial insert, identical verification, or explicitly pinned unused-draft refresh. */
export async function importJapaneseStudyDraft(db: PrismaClient, source: JapaneseFlashcardCatalog, study: JapaneseStudyCatalog, refresh?: JapaneseDraftRefreshGuard) {
  if (refresh) parseJapaneseDraftRefreshGuard(refresh);
  const plan = prepareJapaneseStudyImport(source, study);
  return db.$transaction(async tx => {
    const saved = await readDraft(tx);
    if (saved) {
      const existing = saved.track;
      if (existing.id !== plan.track.id || existing.learningLanguage !== "JAPANESE" || existing.publicationStatus !== "DRAFT") throw new Error("Refusing to replace an existing or published study catalog");
      assertStructure(saved, plan);
      if (existing.catalogSnapshotId === plan.snapshot.id) {
        assertExactDraft(saved, plan);
        if (!saved.snapshot) throw new Error("Missing draft snapshot");
        if (refresh && saved.snapshot.previousSnapshotId !== refresh.expectedSnapshotId) throw new Error("Draft refresh snapshot mismatch");
        if (saved.snapshot.previousSnapshotId) {
          const previous = await tx.studyCatalogCardSnapshot.findMany({ where: { snapshotId: saved.snapshot.previousSnapshotId } });
          const ordered = previous.map(row => row.cardJson as unknown as StoredCards[number]).sort((a, b) => a.sortOrder - b.sortOrder);
          if (previous.length !== saved.cards.length || (refresh && japaneseStudyCardsDigest(ordered) !== refresh.expectedCardsSha256)) throw new Error("Draft refresh previous content digest mismatch");
        }
        await retainCardHistory(tx, saved.snapshot.id, saved.cards, false, !saved.snapshot.previousSnapshotId);
        return { imported: false, refreshed: false, cards: saved.cards.length, digest: plan.snapshot.studyCatalogSha256 };
      }
      if (!refresh) throw new Error("Refusing to replace an existing or published study catalog");
      if (existing.catalogSnapshotId !== refresh.expectedSnapshotId) throw new Error("Draft refresh snapshot mismatch");
      if (japaneseStudyCardsDigest(saved.cards) !== refresh.expectedCardsSha256) throw new Error("Draft refresh content digest mismatch");
      assertRefreshIdentity(saved, plan);
      if (Object.values(await learnerActivity(tx, existing.id, existing.catalogSnapshotId)).some(count => count !== 0)) throw new Error("Refusing draft refresh with learner activity");
      await retainCardHistory(tx, existing.catalogSnapshotId!, saved.cards, true);
      await tx.studyCatalogSnapshot.create({ data: { ...plan.snapshot, previousSnapshotId: existing.catalogSnapshotId } });
      await retainCardHistory(tx, plan.snapshot.id, plannedCards(plan), true);
      for (const card of plan.cards) {
        if (!isDeepStrictEqual(saved.cards[card.sortOrder].contentJson, card.contentJson)) await tx.studyCard.update({ where: { id: card.id }, data: { contentJson: card.contentJson } });
      }
      const updated = await tx.studyTrack.updateMany({ where: { id: existing.id, publicationStatus: "DRAFT", catalogSnapshotId: refresh.expectedSnapshotId }, data: { catalogSnapshotId: plan.snapshot.id } });
      if (updated.count !== 1) throw new Error("Draft refresh snapshot changed concurrently");
      return { imported: false, refreshed: true, cards: plan.cards.length, digest: plan.snapshot.studyCatalogSha256 };
    }
    if (refresh) throw new Error("Draft refresh requires an existing pinned snapshot");
    await tx.studyCatalogSnapshot.create({ data: plan.snapshot });
    await tx.studyTrack.create({ data: plan.track });
    await tx.studyLevel.createMany({ data: plan.levels });
    await tx.studyDeck.createMany({ data: plan.decks });
    for (let offset = 0; offset < plan.cards.length; offset += 250) {
      await tx.studyCard.createMany({ data: plan.cards.slice(offset, offset + 250) });
    }
    await retainCardHistory(tx, plan.snapshot.id, plannedCards(plan), true);
    return { imported: true, refreshed: false, cards: plan.cards.length, digest: plan.snapshot.studyCatalogSha256 };
  }, { isolationLevel: "Serializable", timeout: 60_000 });
}
