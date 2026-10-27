import { canonicalJson } from "../canonical-json";
import { requireUnique } from "../unique";
import { prepareJapaneseStudyImport } from "../study/japanese-import";
import { describeJapaneseUsage, japaneseUsageLabels, japaneseVocabularyUsage } from "../study/japanese-usage";
import { dictionarySenseAllowsPair, japaneseVocabularyPairKey, normalizeDictionaryText as normalize, type DictionaryWord } from "./dictionary";
import { sha256 } from "./digest";
import type { JapaneseFlashcardCatalog, JapaneseVocabularyCard } from "./flashcard-catalog";
import type { JapaneseStudyCatalog } from "./study-catalog";
import path from "node:path";
import { loadJapaneseStudyArtifacts } from "./study-artifacts";
import { loadJapaneseCorpus, parseSourceLock } from "./source-files";
import { verifyAttestedVocabularyCorrection, verifyVocabularyMeaningReview, type VocabularyMeaningReview } from "./vocabulary-corrections";

export const serializeJapaneseContentReviewRows = (rows: readonly unknown[]) => rows.map(row => JSON.stringify(row)).join("\n") + "\n";
type SenseEvidence = { entryId: string; sense: number; gloss: string };
type MeaningReview = { text: string; status: "exact" | "reviewed-equivalent" | "needs-review" | "construction" | "phrase-attested"; evidence: SenseEvidence[] };

function reviewMeanings(card: JapaneseVocabularyCard, dictionary: ReadonlyMap<string, DictionaryWord>, review?: VocabularyMeaningReview) {
  const pair = card.dictionaryEvidence.acceptedPairs.find(pair => japaneseVocabularyPairKey(pair.written, pair.reading) === japaneseVocabularyPairKey(card.content.word, card.content.reading));
  const derivations = pair?.evidence.filter(evidence => evidence.kind !== "direct") ?? [];
  const dictionarySenses = card.dictionaryEvidence.entryIds.flatMap(entryId => {
    const entry = dictionary.get(entryId);
    if (!entry) throw new Error(`Missing review dictionary entry: ${entryId}`);
    return (entry.sense ?? []).map((sense, index) => ({ entryId, number: index + 1, pairAllowed: dictionarySenseAllowsPair(entry, index + 1, card.content.word, card.content.reading), ...sense }));
  });
  const senses = dictionarySenses.filter(sense => sense.pairAllowed).flatMap(sense => sense.gloss.filter(gloss => gloss.lang === "eng").map(gloss => ({ entryId: sense.entryId, sense: sense.number, gloss: gloss.text })));
  const meanings: MeaningReview[] = card.content.meanings.map(text => {
    const evidence = senses.filter(sense => normalize(sense.gloss) === normalize(text));
    // Decisions were verified against the snapshot; keep their selected sense authoritative.
    const selected = review?.meanings.find(item => item.text === text);
    if (selected) {
      const exact = evidence.some(sense => sense.entryId === selected.entryId && sense.sense === selected.sense && sense.gloss === selected.gloss);
      return { text, status: exact ? "exact" : "reviewed-equivalent", evidence: [{ entryId: selected.entryId, sense: selected.sense, gloss: selected.gloss }] };
    }
    // Construction and phrase evidence supports the form, not an exact meaning equivalence.
    return { text, evidence, status: evidence.length ? "exact" : card.phraseEvidence ? "phrase-attested" : derivations.length ? "construction" : "needs-review" };
  });
  return { meanings, dictionarySenses };
}

/** Reproducible review signals, not content corrections or pedagogical approval. */
export function reviewJapaneseStudyContent(source: JapaneseFlashcardCatalog, study: JapaneseStudyCatalog, dictionaryWords: DictionaryWord[]) {
  const plan = prepareJapaneseStudyImport(source, study);
  requireUnique(dictionaryWords.map(entry => entry.id), "review dictionary identity");
  const dictionary = new Map(dictionaryWords.map(entry => [entry.id, entry]));
  const decisions = source.corrections?.meaningReviews ?? [];
  requireUnique(decisions.map(review => review.id), "content meaning review");
  const vocabularyCards = source.cards.filter(card => card.kind === "vocabulary");
  requireUnique(vocabularyCards.map(card => card.content.id), "content vocabulary identity");
  const reviews = new Map<string, VocabularyMeaningReview>();
  const phraseSourceIds = new Set(source.corrections?.phraseSources.map(item => item.id));
  const phraseReviews = new Map<string, { sourceId: string; locator: string; keep: Array<{ index: number; reason: string }>; omit: Array<{ index: number; reason: string }> }>();
  for (const change of source.corrections?.records ?? []) if (change.status === "attested" && change.exampleReview) {
    const card = vocabularyCards.find(card => card.content.id === change.id);
    if (!card?.originalContent) throw new Error(`Missing phrase example source snapshot: ${change.id}`);
    const expected = verifyAttestedVocabularyCorrection(card.originalContent, change, phraseSourceIds);
    if (canonicalJson(expected) !== canonicalJson(card.content) || canonicalJson(change.attestation) !== canonicalJson(card.phraseEvidence)) throw new Error(`Phrase example effective content drift: ${change.id}`);
    if (phraseReviews.has(card.id)) throw new Error(`Duplicate phrase example review: ${change.id}`);
    phraseReviews.set(card.id, { sourceId: change.attestation.sourceId, locator: change.attestation.locator, ...change.exampleReview });
  }
  for (const review of decisions) {
    const card = vocabularyCards.find(card => card.content.id === review.id);
    if (!card?.meaningReviewBefore) throw new Error(`Missing meaning review source snapshot: ${review.id}`);
    const expected = verifyVocabularyMeaningReview(card.meaningReviewBefore, dictionary, review, {
      dictionaryIds: card.dictionaryEvidence.entryIds,
      derivations: card.dictionaryEvidence.acceptedPairs.flatMap(pair => pair.evidence.filter(item => item.kind !== "direct")),
    });
    if (canonicalJson(expected) !== canonicalJson(card.content)) throw new Error(`Meaning review effective content drift: ${card.id}`);
    reviews.set(card.id, review);
  }
  const units = new Map(study.units.map(unit => [unit.id, unit]));
  const sourceIds = new Map<number, Set<string>>();
  for (const card of source.cards) if (card.kind === "vocabulary") for (const example of card.content.examples) if (example.tatoeba_id) {
    const variants = sourceIds.get(example.tatoeba_id) ?? new Set<string>();
    variants.add(canonicalJson({ ja: normalize(example.ja), en: normalize(example.en) }));
    sourceIds.set(example.tatoeba_id, variants);
  }
  const usage = new Map<string, Set<string>>();
  const records = source.cards.toSorted((a,b) => a.id < b.id ? -1 : a.id > b.id ? 1 : 0).map(card => {
    const unit = units.get(study.recordToUnit[card.id])!;
    const base = { id: card.id, unitId: unit.id, kind: card.kind, sourceFileId: card.sourceFileId, sourceRecordSha256: sha256(canonicalJson(card)), sourceLevel: card.content.level, introductionLevel: unit.level.code };
    if (card.kind === "kanji") return { ...base, meanings: [] as MeaningReview[], dictionarySenses: [], examples: [], usage: [] as string[] };
    const labels = japaneseVocabularyUsage(card);
    for (const label of labels) { const ids = usage.get(label) ?? new Set<string>(); ids.add(card.id); usage.set(label, ids); }
    const seen = new Set<string>();
    const examples = card.content.examples.map((example, index) => {
      const key = canonicalJson({ ja: normalize(example.ja), en: normalize(example.en) });
      const duplicate = seen.has(key); seen.add(key);
      // A nonliteral match may be an inflected form. This is a signal for review, not a rejection.
      const literalTarget = [card.content.word, card.content.reading, ...card.dictionaryEvidence.acceptedPairs.map(pair => pair.written)].some(form => example.ja.normalize("NFC").includes(form.normalize("NFC")));
      return { index, source: example, duplicate, literalTarget, sourceIdHasVariants: !!example.tatoeba_id && (sourceIds.get(example.tatoeba_id)?.size ?? 0) > 1 };
    });
    const review = reviews.get(card.id);
    return { ...base, written: card.content.word, reading: card.content.reading, ...reviewMeanings(card, dictionary, review), examples, usage: labels,
      ...(review ? { meaningReview: review, meaningReviewBefore: card.meaningReviewBefore } : {}),
      ...(phraseReviews.has(card.id) ? { phraseExampleReview: phraseReviews.get(card.id) } : {}),
    };
  });
  const vocabulary = records.filter(row => row.kind === "vocabulary");
  const meanings = vocabulary.flatMap(row => row.meanings);
  const examples = vocabulary.flatMap(row => row.examples);
  const usageInventory = [...usage].toSorted(([a],[b]) => a < b ? -1 : a > b ? 1 : 0).map(([value, ids]) => ({ value, records: ids.size, en: describeJapaneseUsage(value, "en"), ja: describeJapaneseUsage(value, "ja") }));
  const summary = {
    schemaVersion: 1, purpose: "review-inventory", publicationChanged: false,
    sourceCatalogSha256: study.sourceCatalogSha256, studyCatalogSha256: plan.snapshot.studyCatalogSha256,
    sourceLockSha256: study.sourceLockSha256, usageLabelsSha256: sha256(canonicalJson(japaneseUsageLabels)),
    rowsSha256: sha256(serializeJapaneseContentReviewRows(records)),
    counts: {
      units: study.units.length, sourceRecords: records.length, vocabulary: vocabulary.length, kanji: records.length - vocabulary.length,
      meanings: meanings.length, meaningsWithExactEvidence: meanings.filter(item => item.status === "exact").length,
      reviewedEquivalentMeanings: meanings.filter(item => item.status === "reviewed-equivalent").length,
      meaningsToReview: meanings.filter(item => !["exact", "reviewed-equivalent"].includes(item.status)).length,
      correctedMeaningRecords: decisions.filter(review => review.action === "correct").length,
      retainedMeaningRecords: decisions.filter(review => review.action === "retain").length,
      selectedReviewExamples: decisions.reduce((sum, review) => sum + (review.examples?.keep.length ?? 0), 0),
      omittedReviewExamples: decisions.reduce((sum, review) => sum + (review.examples?.omit.length ?? 0), 0),
      reviewedPhraseExampleRecords: phraseReviews.size,
      selectedPhraseExamples: [...phraseReviews.values()].reduce((sum, review) => sum + review.keep.length, 0),
      omittedPhraseExamples: [...phraseReviews.values()].reduce((sum, review) => sum + review.omit.length, 0),
      constructionMeanings: meanings.filter(item => item.status === "construction").length,
      phraseAttestedMeanings: meanings.filter(item => item.status === "phrase-attested").length,
      sourceExamples: examples.length, recordsWithoutExamples: vocabulary.filter(row => !row.examples.length).length,
      duplicateExamples: examples.filter(row => row.duplicate).length,
      examplesWithoutLiteralTarget: examples.filter(row => !row.literalTarget).length,
      exampleSourceIdVariants: [...sourceIds.values()].filter(variants => variants.size > 1).length,
      usageValues: usageInventory.length, translatedUsageValues: usageInventory.filter(item => item.en.translated && item.ja.translated).length,
    }, usageInventory,
  };
  return { summary, records };
}

/** Same pinned-artifact/source loading for the command and full-corpus regression. */
export async function loadJapaneseStudyContentReview(webRoot: string) {
  const { source, study } = await loadJapaneseStudyArtifacts(webRoot);
  const ids = [...new Set(source.cards.flatMap(card => card.kind === "vocabulary" ? card.dictionaryEvidence.entryIds : []))];
  const input = await loadJapaneseCorpus(parseSourceLock(source.sourceLock), path.join(webRoot, ".cache/japanese-content"), ids);
  return reviewJapaneseStudyContent(source, study, input.dictionaryWords);
}
