import { JLPT_LEVELS, type JapaneseCorpusReport, type JapaneseSample } from "./corpus-audit";

const cell = (value: string) => value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/\|/g, "\\|").replace(/[\r\n]+/g, " ");

export function renderJapaneseAudit(report: JapaneseCorpusReport, samples: JapaneseSample[]): string {
  const issueCounts = new Map<string, number>();
  for (const issue of report.issues) issueCounts.set(issue.code, (issueCounts.get(issue.code) ?? 0) + 1);
  const sampleRows = samples.map((sample) => {
    const content = sample.content;
    const written = "word" in content ? content.word : content.character;
    const reading = "reading" in content ? content.reading : `On: ${content.onyomi.join("、") || "—"}; Kun: ${content.kunyomi.join("、") || "—"}`;
    return `| ${sample.level} | ${sample.kind} | ${cell(written)} | ${cell(reading)} | ${cell(content.meanings.join("; "))} |`;
  });
  return `# Japanese content — source reconciliation

This is a research artifact for section 1 of [the mirror plan](../../../../../MIRROR_PLAN.md).

Teacher review: **pending**. Publication: **blocked**.

Every input is pinned in [source-lock.json](../source-lock.json) and checked before use. The full JMdict English dataset is used; its common-only subset can omit JLPT-listed words. A successful audit command means the report was generated, not that the content was approved.

## Corpus counts

| Community level | Vocabulary | Kanji |
|---|---:|---:|
${JLPT_LEVELS.map((level) => `| ${level} | ${report.counts.vocabularyByLevel[level]} | ${report.counts.kanjiByLevel[level]} |`).join("\n")}
| Total | ${report.counts.vocabulary} | ${report.counts.kanji} |

Supplementary/inferred kanji classifications: **${report.counts.supplementaryKanji}**. These are preserved separately from Waller's community classifications.

## Dictionary and coverage checks

- Dictionary-verified vocabulary records: **${report.dictionaryVerifiedVocabularyIds.length}**.
- Dictionary-verified kanji records: **${report.dictionaryVerifiedKanji.length}**.
- Reference rows accounted for: **${report.counts.referenceRows}**.
- Uniquely matched reference rows: **${report.counts.matched}**.
- Ambiguous reference rows: **${report.counts.ambiguous}**.
- Unmatched reference rows: **${report.counts.unmatched}**.

Vocabulary verification checks primary and declared variant spelling/reading compatibility. Kanji verification compares complete on/kun reading sets with KANJIDIC2, retaining dot/hyphen notation. It does not validate the meanings of every word, example suitability, level assignments, or every possible cross-combination of alternative forms. A dictionary match is evidence for a reviewer, not pedagogical approval.

All source rows, including unresolved ones, appear in [reconciliation.jsonl](./reconciliation.jsonl). A unique match records a candidate correspondence; it does not silently merge or delete records. [audit.json](./audit.json) contains every issue, including dictionary-version differences and level disagreements.

## Findings requiring review

| Code | Records/issues |
|---|---:|
${[...issueCounts].sort(([a], [b]) => a.localeCompare(b)).map(([code, count]) => `| ${code} | ${count} |`).join("\n") || "| None | 0 |"}

The corpus and dictionary releases are independently pinned. Changed dictionary IDs/readings and source corrections require reconciliation; the audit never rewrites the downloaded data. Review each ambiguity, unmatched row, invalid pair, missing dictionary link, and level disagreement before deciding the final import corpus. Missing examples remain explicit.

## Source-verified sample card data

These are data samples, not UI designs or published cards. Primary/variant word pairs and kanji reading sets pass the pinned dictionary checks. Meanings, examples, and levels remain pending Japanese-teacher review; an N5 target word does not make its source sentence an N5 sentence.

| Level | Kind | Written form | Readings | Source meanings |
|---|---|---|---|---|
${sampleRows.join("\n")}

Full records and provenance are in [samples.json](./samples.json). Each carries an explicit pending teacher-review state. Example sentences are source material and have not been adapted or generated.

## Scope and attribution

Modern JLPT does not publish an exhaustive official vocabulary/kanji list. The coverage target is a named community corpus with every source row accounted for. Vocabulary and kanji study alone do not constitute a complete Japanese placement assessment.

See [ATTRIBUTION.md](../ATTRIBUTION.md) for the data licence and upstream credits. No application database was read or seeded, no cards were published, and no English placement implementation was imported by this tooling.
`;
}
