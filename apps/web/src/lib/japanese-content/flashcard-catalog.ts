import { requireUnique } from "../unique";
import {
  auditJapaneseCorpus, japaneseVocabularyPairKey, kanjiSchema, vocabularySchema,
  type JapaneseCorpusInput, type JapaneseCorpusReport, type Kanji, type Vocabulary,
} from "./corpus-audit";
import { parseSourceLock, sourceLockDigest, type SourceLock } from "./source-files";
import { sha256 } from "./digest";
import { applyVocabularyCorrections, type VocabularyCorrections } from "./vocabulary-corrections";
import { vocabularyPairEvidence, type VocabularyPairEvidence } from "./vocabulary-evidence";
import { type PhraseAttestation } from "./phrase-evidence";
import { type ReferenceCoverage } from "./reference-coverage";
import { applyReferenceDecisions, type ReferenceDecisions, type ReferenceDecision, type ReferenceSupplement } from "./reference-decisions";

type DictionaryEvidence = { sourceFileId: string; entryId: string | null; verified: boolean };
type CardBase = { id: string; sourceFileId: string; referenceRows: string[] };
export type JapaneseVocabularyCard = CardBase & {
  kind: "vocabulary";
  content: Vocabulary;
  originalContent?: Vocabulary;
  meaningReviewBefore?: Vocabulary;
  phraseEvidence?: PhraseAttestation;
  referenceSupplement?: ReferenceSupplement;
  dictionaryEvidence: DictionaryEvidence & {
    entryIds: string[]; support: "direct" | "derived" | "unverified";
    acceptedPairs: Array<{ written: string; reading: string; evidence: VocabularyPairEvidence[] }>;
  };
};
export type JapaneseKanjiCard = CardBase & {
  kind: "kanji";
  content: Kanji;
  /** Verification covers the complete on/kun sets, not meanings, levels, or name readings. */
  dictionaryEvidence: DictionaryEvidence;
};
export type JapaneseFlashcardCatalog = {
  schemaVersion: 4;
  status: "draft";
  learningLanguage: "JAPANESE";
  teacherReview: "pending";
  attribution: "data/japanese-content/ATTRIBUTION.md";
  sourceLock: SourceLock;
  counts: JapaneseCorpusReport["counts"];
  sourceCounts: Pick<JapaneseCorpusReport["counts"], "vocabulary" | "kanji" | "referenceRows">;
  cards: Array<JapaneseVocabularyCard | JapaneseKanjiCard>;
  reconciliation: Array<JapaneseCorpusReport["reconciliation"][number] & { sourceFileId: string; candidateCardIds: string[]; coverage?: ReferenceCoverage; resolution?: ReferenceDecision & { cardIds: string[] } }>;
  issues: JapaneseCorpusReport["issues"];
  corrections?: { sha256: string; records: VocabularyCorrections["records"]; phraseSources: VocabularyCorrections["phraseSources"]; referenceResolutions: VocabularyCorrections["referenceResolutions"]; meaningReviews?: VocabularyCorrections["meaningReviews"] };
  referenceDecisions?: ReferenceDecisions & { sha256: string };
};

const vocabularyId = (id: string) => `ja-vocabulary:${id}`;

/**
 * Complete draft import with an optional source-bound correction overlay. Upstream
 * files remain unchanged; the shared audit verifies support and unresolved rows survive.
 */
export function buildJapaneseFlashcardCatalog(rawInput: JapaneseCorpusInput, sourceLock: SourceLock, corrections?: unknown, referenceDecisions?: unknown): JapaneseFlashcardCatalog {
  const lock = parseSourceLock(sourceLock);
  const changes = corrections === undefined ? undefined : applyVocabularyCorrections(rawInput, lock, corrections);
  const corrected = changes?.input ?? rawInput;
  const references = referenceDecisions === undefined ? undefined : applyReferenceDecisions(corrected, lock, referenceDecisions);
  const input = references?.input ?? corrected;
  const report = references ? auditJapaneseCorpus(input, { preferPrimaryForms: true }) : changes?.report ?? auditJapaneseCorpus(input);
  const invalid = report.issues.find((issue) => issue.code.startsWith("DUPLICATE_") || issue.code.startsWith("MISSING_VOCABULARY_LEVEL") || issue.code.startsWith("MISSING_KANJI_LEVEL"));
  if (invalid) throw new Error(`Cannot prepare import: ${invalid.code}: ${invalid.id}`);
  requireUnique(input.referenceVocabulary.map((row) => row.sourceRow), "reference row");
  requireUnique(input.dictionaryWords.map((row) => row.id), "JMdict entry");
  requireUnique(input.dictionaryKanji.map((row) => row.literal), "KANJIDIC2 entry");
  const fileId = (role: SourceLock["files"][number]["role"], level?: string) => {
    const file = lock.files.find((entry) => entry.role === role && (level === undefined || entry.level === level));
    if (!file) throw new Error(`Missing source file: ${role}/${level ?? "dictionary"}`);
    return file.id;
  };
  const dictionary = new Map(input.dictionaryWords.map((word) => [word.id, word]));
  const verifiedWords = new Set(report.dictionaryVerifiedVocabularyIds);
  const verifiedKanji = new Set(report.dictionaryVerifiedKanji);
  const referencesByWord = new Map<string, string[]>();
  for (const row of report.reconciliation) for (const id of row.allCandidateIds ?? row.candidateIds) {
    const rows = referencesByWord.get(id) ?? [];
    rows.push(row.sourceRow);
    referencesByWord.set(id, rows);
  }
  const cards: JapaneseFlashcardCatalog["cards"] = input.vocabulary.map((raw): JapaneseVocabularyCard => {
    const content = vocabularySchema.parse(raw);
    const entryId = content.jmdict_id ? String(content.jmdict_id) : null;
    const evidence = input.vocabularyEvidence?.[content.id] ?? { dictionaryIds: entryId ? [entryId] : [], derivations: [] };
    const acceptedPairs: JapaneseVocabularyCard["dictionaryEvidence"]["acceptedPairs"] = [];
    const seen = new Set<string>();
    for (const written of [content.word, ...content.other_forms]) for (const reading of [content.reading, ...content.other_readings]) {
      const key = japaneseVocabularyPairKey(written, reading);
      const support = vocabularyPairEvidence(written, reading, dictionary, evidence);
      if (!seen.has(key) && support.length) {
        acceptedPairs.push({ written, reading, evidence: support });
        seen.add(key);
      }
    }
    return {
      id: vocabularyId(content.id), kind: "vocabulary", sourceFileId: fileId(references?.supplements[content.id] ? "reference" : "vocab", content.level), content,
      ...(changes?.originals[content.id] ? { originalContent: changes.originals[content.id] } : {}),
      ...(changes?.meaningReviewBefore[content.id] ? { meaningReviewBefore: changes.meaningReviewBefore[content.id] } : {}),
      ...(input.phraseEvidence?.[content.id] ? { phraseEvidence: input.phraseEvidence[content.id] } : {}),
      ...(references?.supplements[content.id] ? { referenceSupplement: references.supplements[content.id] } : {}),
      referenceRows: referencesByWord.get(content.id) ?? [],
      dictionaryEvidence: { sourceFileId: fileId("jmdict"), entryId, entryIds: evidence.dictionaryIds, verified: verifiedWords.has(content.id),
        support: !verifiedWords.has(content.id) ? "unverified" : acceptedPairs.some((pair) => !pair.evidence.some((item) => item.kind === "direct")) ? "derived" : "direct", acceptedPairs },
    };
  });
  for (const raw of input.kanji) {
    const content = kanjiSchema.parse(raw);
    cards.push({
      id: `ja-kanji:${content.character.normalize("NFC")}`, kind: "kanji", sourceFileId: fileId("kanji", content.level), content,
      referenceRows: Object.entries(references?.characterReferences ?? {}).filter(([, character]) => character === content.character).map(([sourceRow]) => sourceRow),
      dictionaryEvidence: { sourceFileId: fileId("kanjidic"), entryId: content.character, verified: verifiedKanji.has(content.character) },
    });
  }
  requireUnique(cards.map((card) => card.id), "card identity");
  cards.sort((a, b) => a.id < b.id ? -1 : a.id > b.id ? 1 : 0);
  const coverage = new Map(changes?.referenceCoverage.map((decision) => [decision.sourceRow, decision]));
  const decisions = new Map(references?.ledger.records.map((decision) => [decision.sourceRow, decision]));
  const supplementByRow = new Map(Object.entries(references?.supplements ?? {}).map(([id, supplement]) => [supplement.sourceRow, id]));
  for (const [sourceRow, id] of supplementByRow) {
    const row = report.reconciliation.find((row) => row.sourceRow === sourceRow);
    if (row?.status !== "matched" || row.candidateIds[0] !== id) throw new Error(`Reference supplement did not reconcile: ${sourceRow}`);
  }
  return {
    schemaVersion: 4, status: "draft", learningLanguage: "JAPANESE", teacherReview: "pending",
    attribution: "data/japanese-content/ATTRIBUTION.md", sourceLock: lock, counts: report.counts, cards,
    sourceCounts: { vocabulary: rawInput.vocabulary.length, kanji: rawInput.kanji.length, referenceRows: rawInput.referenceVocabulary.length },
    reconciliation: report.reconciliation.map((row) => {
      const decision = decisions.get(row.sourceRow);
      const cardIds = decision?.kind === "character-reading" ? [`ja-kanji:${references!.characterReferences[row.sourceRow]}`] : row.candidateIds.map(vocabularyId);
      return {
        ...row, sourceFileId: fileId("reference", row.sourceRow.split(":")[0]), candidateCardIds: row.candidateIds.map(vocabularyId),
        ...(coverage.has(row.sourceRow) ? { coverage: coverage.get(row.sourceRow) } : {}),
        ...(decision ? { resolution: { ...decision, cardIds } } : {}),
      };
    }),
    issues: report.issues,
    ...(changes ? { corrections: { sha256: sha256(JSON.stringify(changes.ledger)), records: changes.ledger.records, phraseSources: changes.ledger.phraseSources, referenceResolutions: changes.ledger.referenceResolutions, ...(changes.ledger.meaningReviews ? { meaningReviews: changes.ledger.meaningReviews } : {}) } } : {}),
    ...(references ? { referenceDecisions: { ...references.ledger, sha256: sha256(JSON.stringify(references.ledger)) } } : {}),
  };
}

/** No timestamps or machine-specific paths: the same pinned input must yield identical bytes. */
export function serializeJapaneseFlashcards(catalog: JapaneseFlashcardCatalog): string {
  return JSON.stringify(catalog) + "\n";
}

export function summarizeJapaneseFlashcards(catalog: JapaneseFlashcardCatalog) {
  const vocabulary = catalog.cards.filter((card) => card.kind === "vocabulary");
  const kanji = catalog.cards.filter((card) => card.kind === "kanji");
  const issueCounts = new Map<string, number>();
  for (const issue of catalog.issues) issueCounts.set(issue.code, (issueCounts.get(issue.code) ?? 0) + 1);
  return {
    schemaVersion: catalog.schemaVersion, status: catalog.status, learningLanguage: catalog.learningLanguage,
    teacherReview: catalog.teacherReview, attribution: catalog.attribution,
    sourceLockSha256: sourceLockDigest(catalog.sourceLock),
    catalogSha256: sha256(serializeJapaneseFlashcards(catalog)),
    counts: catalog.counts,
    sourceCounts: catalog.sourceCounts,
    referenceSupplementVocabulary: vocabulary.filter((card) => card.referenceSupplement).length,
    dictionarySupportedVocabulary: vocabulary.filter((card) => card.dictionaryEvidence.verified).length,
    supportedVocabulary: vocabulary.filter((card) => card.dictionaryEvidence.verified || card.phraseEvidence).length,
    attestedPhraseVocabulary: vocabulary.filter((card) => card.phraseEvidence).length,
    directDictionaryVocabulary: vocabulary.filter((card) => card.dictionaryEvidence.support === "direct").length,
    derivedVocabulary: vocabulary.filter((card) => card.dictionaryEvidence.support === "derived").length,
    dictionaryVerifiedKanji: kanji.filter((card) => card.dictionaryEvidence.verified).length,
    dictionaryUnverifiedVocabularyIds: vocabulary.filter((card) => !card.dictionaryEvidence.verified).map((card) => card.id),
    unsupportedVocabularyIds: vocabulary.filter((card) => !card.dictionaryEvidence.verified && !card.phraseEvidence).map((card) => card.id),
    unverifiedKanjiIds: kanji.filter((card) => !card.dictionaryEvidence.verified).map((card) => card.id),
    referenceCoverage: {
      primaryFormSelections: catalog.reconciliation.filter((row) => row.selection === "primary-form-and-reading").length,
      coveredAmbiguousRows: catalog.reconciliation.filter((row) => row.status === "ambiguous" && row.coverage).length,
      unresolvedAmbiguousRows: catalog.reconciliation.filter((row) => row.status === "ambiguous" && !row.coverage).length,
      supplementedRows: catalog.reconciliation.filter((row) => row.resolution?.kind === "dictionary-supplement").length,
      characterRows: catalog.reconciliation.filter((row) => row.resolution?.kind === "character-reading").length,
      unresolvedUnmatchedRows: catalog.reconciliation.filter((row) => row.status === "unmatched" && !row.resolution).length,
    },
    issuesByCode: Object.fromEntries([...issueCounts].sort(([a], [b]) => a < b ? -1 : a > b ? 1 : 0)),
    corrections: catalog.corrections ? {
      sha256: catalog.corrections.sha256,
      corrected: catalog.corrections.records.filter((record) => record.status === "corrected").length,
      attested: catalog.corrections.records.filter((record) => record.status === "attested").length,
      deferred: catalog.corrections.records.filter((record) => record.status === "deferred").length,
      deferredIds: catalog.corrections.records.filter((record) => record.status === "deferred").map((record) => vocabularyId(record.id)),
      ...(catalog.corrections.meaningReviews ? { meaningReviews: {
        corrected: catalog.corrections.meaningReviews.filter(review => review.action === "correct").length,
        retained: catalog.corrections.meaningReviews.filter(review => review.action === "retain").length,
        selectedExamples: catalog.corrections.meaningReviews.reduce((sum, review) => sum + (review.examples?.keep.length ?? 0), 0),
        omittedExamples: catalog.corrections.meaningReviews.reduce((sum, review) => sum + (review.examples?.omit.length ?? 0), 0),
      } } : {}),
    } : null,
    referenceDecisions: catalog.referenceDecisions ? {
      sha256: catalog.referenceDecisions.sha256,
      rows: catalog.referenceDecisions.records.length,
      correctedGlossRows: catalog.referenceDecisions.records.filter((record) => record.kind === "dictionary-supplement" && record.glossStatus === "corrected").length,
      missingGlossRows: catalog.referenceDecisions.records.filter((record) => record.kind === "dictionary-supplement" && record.glossStatus === "missing").length,
    } : null,
  };
}
