import { z } from "zod";
import { requireUnique, sameStringMembers } from "../unique";
import { JLPT_LEVELS, type JapaneseLevel } from "./corpus-audit";
import { dictionarySenseAllowsPair, japaneseVocabularyPairKey, toHiragana, type DictionaryWord } from "./dictionary";
import { sha256 } from "./digest";
import { serializeJapaneseFlashcards, type JapaneseFlashcardCatalog, type JapaneseVocabularyCard } from "./flashcard-catalog";
import { sourceLockDigest } from "./source-files";
import { vocabularyPairEvidence } from "./vocabulary-evidence";

const text = z.string().trim().min(1);
const digest = z.string().regex(/^[a-f0-9]{64}$/);
const schema = z.object({
  schemaVersion: z.literal(1), id: z.literal("japanese-study-groups-v1"), levelPolicy: z.literal("earliest-matching-community-evidence-v1"),
  sourceCatalogSha256: digest, sourceLockSha256: digest,
  overlaps: z.array(z.object({ entryId: text, memberIds: z.array(text).min(2), reason: text,
    groups: z.array(z.object({ anchorId: text, memberIds: z.array(text).min(1), senses: z.array(z.number().int().positive()) }).strict()).min(1),
  }).strict()),
}).strict();
export const parseJapaneseStudyPolicy = (value: unknown) => schema.parse(value);
type StudyPolicy = z.infer<typeof schema>;
type SourceCard = JapaneseFlashcardCatalog["cards"][number];
type Reference = JapaneseFlashcardCatalog["reconciliation"][number];
type Scope = "record" | "declared-pair" | "kana-reference" | "different-reading" | "unconfirmed-form" | "multi-sense-reference" | "character-reference";
type LevelEvidence = { source: "record" | "reference"; recordId: string; sourceFileId: string; sourceRow?: string; code: JapaneseLevel; used: boolean; scope: Scope };
type SharedSense = { entryId: string; number: number; content: NonNullable<DictionaryWord["sense"]>[number] };
export type JapaneseStudyUnit = {
  id: string; kind: SourceCard["kind"]; recordIds: string[]; answerPolicy: "member-specific";
  sharedSenses: SharedSense[];
  level: { code: JapaneseLevel; evidence: LevelEvidence[] };
};
export type JapaneseStudyCatalog = {
  schemaVersion: 1; status: "draft"; learningLanguage: "JAPANESE";
  sourceCatalogSha256: string; sourceLockSha256: string; attribution: string;
  policySha256: string; policy: StudyPolicy; units: JapaneseStudyUnit[];
  recordToUnit: Record<string, string>; referenceToUnits: Record<string, string[]>;
  levelDecisions: Array<{ sourceRow: string; recordId: string; unitId: string; sourceLevel: JapaneseLevel; referenceLevel: JapaneseLevel; unitLevel: JapaneseLevel; used: boolean; scope: Scope }>;
};
const compare = (a: string, b: string) => a < b ? -1 : a > b ? 1 : 0;
const sortedUnique = (values: string[]) => [...new Set(values)].sort(compare);

/** Dictionary co-membership is a review queue, never an automatic synonym merge. */
export function findJapaneseStudyOverlaps(catalog: JapaneseFlashcardCatalog) {
  const byEntry = new Map<string, string[]>();
  for (const card of catalog.cards) if (card.kind === "vocabulary") for (const id of new Set(card.dictionaryEvidence.entryIds)) {
    const ids = byEntry.get(id) ?? []; ids.push(card.id); byEntry.set(id, ids);
  }
  return [...byEntry].filter(([, ids]) => ids.length > 1).map(([entryId, ids]) => ({ entryId, memberIds: ids.sort(compare) })).sort((a,b)=>compare(a.entryId,b.entryId));
}

function referenceScope(card: SourceCard, row: Reference): { used: boolean; scope: Scope } {
  if (card.kind === "kanji") return { used: false, scope: "character-reference" };
  if (row.status !== "matched") return { used: false, scope: "multi-sense-reference" };
  if (toHiragana(row.kana) !== toHiragana(card.content.reading)) return { used: false, scope: "different-reading" };
  const key = japaneseVocabularyPairKey(row.kanji || row.kana, row.kana);
  if (card.dictionaryEvidence.acceptedPairs.some(pair=>japaneseVocabularyPairKey(pair.written,pair.reading)===key)) return { used:true, scope:"declared-pair" };
  if (!row.kanji && (card.dictionaryEvidence.verified || card.phraseEvidence)) return { used: true, scope: "kana-reference" };
  return { used: false, scope: "unconfirmed-form" };
}

function verifyMerge(cards: JapaneseVocabularyCard[], entry: DictionaryWord | undefined, senses: number[], dictionary: ReadonlyMap<string, DictionaryWord>) {
  requireUnique(senses.map(String), "shared sense");
  if (!entry || !senses.length || new Set(cards.map(card=>toHiragana(card.content.reading))).size !== 1) throw new Error("Unsupported study merge: reading or sense");
  const modes = new Set<string>();
  for (const card of cards) {
    const key = japaneseVocabularyPairKey(card.content.word, card.content.reading);
    const pair = card.dictionaryEvidence.acceptedPairs.find(pair=>japaneseVocabularyPairKey(pair.written,pair.reading)===key);
    const derivations = pair?.evidence.filter(item=>item.kind!=="direct") ?? [];
    const support = vocabularyPairEvidence(card.content.word,card.content.reading,dictionary,{ dictionaryIds:[entry.id], derivations });
    if (!card.dictionaryEvidence.verified || senses.some(number=>!support.some(item=>item.kind==="direct"
      ? dictionarySenseAllowsPair(entry,number,card.content.word,card.content.reading)
      : item.sense===number))) throw new Error(`Unsupported study merge: ${card.id}`);
    modes.add(support.some(item=>item.kind==="direct") ? "direct" : derivations.map(item=>item.kind).sort().join(","));
  }
  if (modes.size !== 1) throw new Error("Unsupported study merge: construction differs");
}

/** Canonical study identities reference immutable source records; they do not flatten answer sets. */
export function buildJapaneseStudyCatalog(source: JapaneseFlashcardCatalog, dictionaryWords: DictionaryWord[], value: unknown): JapaneseStudyCatalog {
  const policy = parseJapaneseStudyPolicy(value);
  const sourceCatalogSha256 = sha256(serializeJapaneseFlashcards(source));
  if (policy.sourceCatalogSha256 !== sourceCatalogSha256) throw new Error("Study source catalog drift");
  if (policy.sourceLockSha256 !== sourceLockDigest(source.sourceLock)) throw new Error("Study source lock drift");
  requireUnique(source.cards.map(card=>card.id), "study source identity");
  requireUnique(dictionaryWords.map(entry=>entry.id), "study dictionary identity");
  requireUnique(policy.overlaps.map(overlap=>overlap.entryId), "study overlap entry");
  const overlaps = findJapaneseStudyOverlaps(source);
  if (!sameStringMembers(overlaps.map(o=>o.entryId),policy.overlaps.map(o=>o.entryId))) throw new Error("Study overlap coverage drift");
  const cards = new Map(source.cards.map(card=>[card.id,card]));
  const dictionary = new Map(dictionaryWords.map(entry=>[entry.id,entry]));
  const expected = new Map(overlaps.map(overlap=>[overlap.entryId,overlap.memberIds]));
  const assigned = new Set<string>();
  const partitions: Array<{ id:string; recordIds:string[]; sharedSenses:SharedSense[] }> = [];
  for (const overlap of policy.overlaps) {
    requireUnique(overlap.memberIds, "study overlap member");
    if (!sameStringMembers(expected.get(overlap.entryId)!,overlap.memberIds)) throw new Error("Study overlap membership drift");
    const members = overlap.groups.flatMap(group=>group.memberIds);
    requireUnique(members, "study partition member");
    if (!sameStringMembers(members,overlap.memberIds)) throw new Error("Study partition omits or adds a source record");
    for (const group of overlap.groups) {
      if (!group.memberIds.includes(group.anchorId)) throw new Error("Study anchor must be a group member");
      for (const id of group.memberIds) {
        if (assigned.has(id)) throw new Error("Duplicate study membership across dictionary overlaps");
        assigned.add(id);
      }
      const sharedSenses: SharedSense[] = [];
      if (group.memberIds.length > 1) {
        const words = group.memberIds.map(id=>cards.get(id)!);
        if (words.some(card=>card.kind!=="vocabulary")) throw new Error("Unsupported study merge: mixed kinds");
        const entry = dictionary.get(overlap.entryId);
        verifyMerge(words as JapaneseVocabularyCard[],entry,group.senses,dictionary);
        for (const number of group.senses) sharedSenses.push({ entryId:overlap.entryId,number,content:entry!.sense![number-1] });
      } else if (group.senses.length) throw new Error("Singleton study partition cannot declare a merge sense");
      partitions.push({ id:group.anchorId,recordIds:[...group.memberIds].sort(compare),sharedSenses });
    }
  }
  for (const card of source.cards) if (!assigned.has(card.id)) partitions.push({ id:card.id,recordIds:[card.id],sharedSenses:[] });
  requireUnique(partitions.map(group=>group.id), "study identity");
  const recordToUnit = Object.fromEntries(partitions.flatMap(group=>group.recordIds.map(id=>[id,group.id])).sort(([a],[b])=>compare(a,b)));
  const referencesByRecord = new Map<string, Reference[]>();
  const referenceToUnits: Record<string,string[]> = {};
  for (const row of source.reconciliation) {
    const ids = row.resolution?.cardIds ?? row.candidateCardIds;
    if (!ids.length || ids.some(id=>!cards.has(id))) throw new Error(`Unresolved study reference: ${row.sourceRow}`);
    referenceToUnits[row.sourceRow] = sortedUnique(ids.map(id=>recordToUnit[id]));
    for (const id of ids) { const rows=referencesByRecord.get(id)??[]; rows.push(row); referencesByRecord.set(id,rows); }
  }
  const units = partitions.sort((a,b)=>compare(a.id,b.id)).map((group):JapaneseStudyUnit=>{
    const evidence: LevelEvidence[] = [];
    for (const id of group.recordIds) {
      const card=cards.get(id)!;
      evidence.push({ source:"record",recordId:id,sourceFileId:card.sourceFileId,code:card.content.level,used:true,scope:"record" });
      for (const row of referencesByRecord.get(id)??[]) evidence.push({source:"reference",recordId:id,sourceFileId:row.sourceFileId,sourceRow:row.sourceRow,code:row.level,...referenceScope(card,row)});
    }
    const code=JLPT_LEVELS.find(level=>evidence.some(item=>item.used&&item.code===level))!;
    return { ...group,kind:cards.get(group.id)!.kind,answerPolicy:"member-specific",level:{code,evidence} };
  });
  const unitById = new Map(units.map(unit=>[unit.id,unit]));
  const rowById = new Map(source.reconciliation.map(row=>[row.sourceRow,row]));
  const levelDecisions = source.issues.filter(issue=>issue.code==="LEVEL_DISAGREEMENT").map(issue=>{
    const row=rowById.get(issue.id);
    const card=row?.status==="matched"&&row.candidateCardIds.length===1 ? cards.get(row.candidateCardIds[0]) : undefined;
    if (!row||!card) throw new Error(`Missing study level decision: ${issue.id}`);
    const unitId=recordToUnit[card.id];
    return { sourceRow:row.sourceRow,recordId:card.id,unitId,sourceLevel:card.content.level,referenceLevel:row.level,unitLevel:unitById.get(unitId)!.level.code,...referenceScope(card,row) };
  }).sort((a,b)=>compare(a.sourceRow,b.sourceRow));
  requireUnique(levelDecisions.map(decision=>decision.sourceRow), "study level decision");
  return { schemaVersion:1,status:"draft",learningLanguage:"JAPANESE",sourceCatalogSha256,sourceLockSha256:policy.sourceLockSha256,attribution:source.attribution,
    policySha256:sha256(JSON.stringify(policy)),policy,units,recordToUnit,referenceToUnits,levelDecisions };
}

export const serializeJapaneseStudyCatalog = (catalog: JapaneseStudyCatalog) => JSON.stringify(catalog)+"\n";
export function summarizeJapaneseStudyCatalog(catalog: JapaneseStudyCatalog) {
  return { schemaVersion:catalog.schemaVersion,status:catalog.status,learningLanguage:catalog.learningLanguage,sourceCatalogSha256:catalog.sourceCatalogSha256,sourceLockSha256:catalog.sourceLockSha256,
    policySha256:catalog.policySha256,catalogSha256:sha256(serializeJapaneseStudyCatalog(catalog)),
    counts:{ units:catalog.units.length,sourceRecords:Object.keys(catalog.recordToUnit).length,referenceRows:Object.keys(catalog.referenceToUnits).length,
      vocabulary:catalog.units.filter(unit=>unit.kind==="vocabulary").length,kanji:catalog.units.filter(unit=>unit.kind==="kanji").length,
      overlapFamilies:catalog.policy.overlaps.length,mergedGroups:catalog.units.filter(unit=>unit.recordIds.length>1).length,
      mergedRecords:catalog.units.filter(unit=>unit.recordIds.length>1).reduce((sum,unit)=>sum+unit.recordIds.length,0),
      levelDecisions:catalog.levelDecisions.length,usedLevelReferences:catalog.levelDecisions.filter(decision=>decision.used).length,
      retainedVariantLevels:catalog.levelDecisions.filter(decision=>!decision.used).length,
      byLevel:Object.fromEntries(JLPT_LEVELS.map(level=>[level,{vocabulary:catalog.units.filter(unit=>unit.kind==="vocabulary"&&unit.level.code===level).length,kanji:catalog.units.filter(unit=>unit.kind==="kanji"&&unit.level.code===level).length}])),
    } };
}
