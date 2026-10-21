# The Mirror — implementation plan

Working branch: `the-mirror`. Brandon owns all commits and pushes.

## Binding rules

- Work one section at a time and report its evidence and remaining work.
- For every implementation change: write a behavioral test, confirm red, implement, confirm green, then refactor while green.
- Use impeccable for every design and style decision. Inherit the established design system unless a specific surface needs a deliberate new direction.
- Keep shared application behavior in one implementation. Japanese and English placement are independently designed domains; do not copy the English assessment engine, bank, progression, score thresholds, or level subdivisions.
- Preserve the existing English product while introducing Japanese learning.
- Record and stop task-owned servers, watchers, and background work before handoff.

## Product boundaries

The service remains centered on private online lessons with a teacher.

- Provide distinct English-learning and Japanese-learning landing pages. Planned canonical paths are `/learn-english` and `/learn-japanese`, independent of UI locale prefixes.
- Each landing page names the language being learned before the signup action and carries that intent through signup, onboarding, and booking.
- Teacher discovery and direct booking authorization must respect the selected learning language. A query-string filter alone is insufficient.
- Treat UI locale, learning language, teacher instruction languages, and teacher origin as separate concepts.
- The latest requirement is two clear paths within the shared site. The earlier suggestion of two independent deployments/databases is not an implementation decision. Cross-language memberships, teacher offerings, and data boundaries must be designed before signup or marketplace changes.
- The English product's existing entry links need a compatibility/redirect plan. A neutral root, if used, must offer an explicit language choice.

## Sections and acceptance criteria

### 1. Japanese source corpus and reconciliation — audit complete; content review open

Deliver a reproducible, database-free audit of pinned N5–N1 vocabulary and kanji sources; source-verified card samples; full unresolved-issue reports; and attribution.

- Use OpenJLPT as an import candidate, JMdict/KANJIDIC2 as dictionary references, and Waller-derived Yomitan lists for coverage reconciliation.
- Verify every downloaded byte against a pinned Git blob or SHA-256 digest. Reuse verified cached downloads; reject modified caches.
- Account for every reference row as a unique match, an ambiguous match, or an unresolved row. Never silently omit entries or auto-merge homonyms.
- Check primary word/readings against valid dictionary spelling/reading pairs. Keep compound readings separate from per-character on/kun readings.
- Compare character on/kun readings with KANJIDIC2; preserve okurigana and prefix/suffix notation. Empty on or kun categories can be legitimate.
- Report duplicates, conflicting references, missing dictionary links, absent examples, inferred levels, and dictionary-version drift.
- Samples must be labeled source-verified and pending teacher review. Automated checks do not establish pedagogical suitability, semantic accuracy, or official exam completeness.
- Do not seed application tables, publish decks, alter the English placement system, or implement landing pages in this section.

Delivered: [reproducible tooling](apps/web/data/japanese-content/README.md), [audit report](apps/web/data/japanese-content/reports/README.md), complete reference-row ledger, source lock/attribution, and ten sample records. All 8,293 reference rows are accounted for: 8,155 unique candidate matches, 3 ambiguous rows, and 135 unmatched rows. All 2,383 kanji reading sets match the pinned dictionary; 7,778 of 7,811 vocabulary records pass primary/variant spelling-and-reading checks. The other 33, level disagreements, missing examples, and reference-source gaps remain explicit review queues. Nothing is approved for publication.

Verification: 35 isolated tests passed after demonstrated red/green cycles; full TypeScript check and focused ESLint passed. Offline audit reproduced all four report files byte-for-byte, and strict mode correctly refused publication. No application database or learner-facing UI was changed.

### 2. Shared learning-language foundation

Design and test persisted learner intent, teacher teaching-language/offerings scope, authorization boundaries, and compatible migration of the existing English records. Shared account/session behavior must preserve the selected subject independently of UI locale. Establish regressions for the existing English journeys before implementation.

### 3. Distinct landing and signup journeys

Use impeccable to design the two landing surfaces with visibly clear subjects, distinct URLs and metadata, language-specific calls to action, and an explicit way to switch subject. Share presentation primitives and genuinely common sections; represent subject-specific copy and composition as data/variants. Test browser refreshes, direct links, language switching, OAuth round trips, and wrong-language teacher access. Verify desktop/mobile and both themes in bounded visual passes.

### 4. Independent Japanese placement

Create Japanese-specific item models, question banks, progression, scoring, attempts, and results. Cover kana literacy, kanji/readings, vocabulary, grammar, reading, listening, and first-lesson oral confirmation as agreed in the assessment brief. Determine test length and score interpretation through Japanese-specific design and pilot evidence. JLPT study tags do not constitute certification or a direct measure of speaking ability.

### 5. Japanese flashcard import and study

Resolve the section 1 review queues before publishing the full corpus. Model vocabulary and kanji separately, with stable identities, source attribution, accepted readings/forms, and level provenance. Reuse shared review/scheduling infrastructure where appropriate; generalize English-specific assumptions instead of copying that implementation. Review examples, senses, and learner-facing reading presentation with Japanese teachers.

### 6. Cross-product verification and release preparation

Complete real onboarding-to-booking and teacher lesson-completion journeys for each subject; verify lesson scope, placement independence, study progress, payment/calendar behavior, locale changes, and data isolation. Run the appropriate CI checks and impeccable visual verification. Brandon reviews, commits, and pushes.

## Source completeness standard

Modern JLPT has no published exhaustive official vocabulary/kanji list. The measurable target is full, traceable coverage of a named, versioned community corpus, with every merge/correction explained and zero unreviewed omissions. Preserve level source and supplementary/inferred classifications. Multiple repositories inheriting Waller's lists are not independent pedagogical validation.

## Publication gates

Downloading a repository or passing structural validation does not approve its content for learners. Publication requires resolved dictionary/reconciliation issues, appropriate attribution, and teacher review of readings, meanings, levels, and examples. Section 1 produces research artifacts, not production study data.
