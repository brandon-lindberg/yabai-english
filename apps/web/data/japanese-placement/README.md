# Japanese placement question-bank authoring

**Current release, 2026-10-23:** the owner-authorized schema-v5 bank version 3 is active in the local application database. The [release handoff](../../../../docs/japanese-placement-release.md) records its digest, content/source-term/policy evidence and exact activation. `release.json` adds explicit owner authorization with AI-assisted checks; it never invents a teacher signoff. `yarn --silent japanese-placement:publish` validates that release and its public notices offline; `--publish` explicitly activates it locally through the shared publisher. Raw catalog/rubric exports below intentionally remain unapproved authoring views. Statements below about unpublished drafts and disposable-only integration describe those authoring/earlier implementation stages, not the active v5 release. Production deployment and the flashcard corpus remain separate.

The independent catalog now contains **470 draft items across all six domains**: 200 reading questions, 100 sentence assemblies, 50 kanji readings, 50 vocabulary choices, 50 grammar choices and twenty N5 kana checks. The original N2/N3 pack supplies 120 items; `remaining-levels/` adds 180 and `word-level/` adds 170 through the same importer. The [content handoff](../../../../docs/japanese-placement-content.md) documents 333 retained external records, licence notices, checksum locks and selection ledgers. Run `yarn japanese-placement:content --strict` from the repository root to verify authoring coverage and full bank integration offline. Linguistic checks and calibration remain open; this is not a published bank. See [word-level attribution](word-level/ATTRIBUTION.md) for the selected lexical sources and their limitations.

`yarn japanese-placement:content --bank` writes the compiled schema-v4 private bank to stdout, including authoring `referenceBand`, reading `passageId` and deterministic sequence, with null calibration, assessment policy and reviews. There is no second checked-in question copy. The v4 bank supports up to 1,000 items while the learner target remains 24 questions in twenty minutes (maximum sixty from quotas). The 200 reading questions share 100 passages; at most one question from a passage is served per attempt, including skips. Preserve these private fields when saving an export outside `public/`.

The catalog and its three source packs are now revision 2 after an [initial editorial screen](../../../../docs/japanese-placement-quality.md). Eleven records were corrected, with stable IDs and unchanged source excerpt bytes. The sale notice retains its exact source text privately in `original` while displaying a disclosed wording correction; source quotations must match the displayed text. The screen records remaining difficulty/guessing limits and does not assign content approvals or calibration.

The [offline pilot workflow](../../../../docs/japanese-placement-pilot.md) generates twenty versioned fixed collection forms from this catalog without copying question files. `yarn --silent japanese-placement:pilot forms` exports their manifest; `form` exports a learner-safe question projection and public source notices, and `diagnose` validates collected response files and reports descriptive counts, timing and coverage. No learner evidence, fitted model or production level is manufactured. Preserve the exact bank/forms digests and applicable attribution/licence files when preparing a controlled pilot.

## Current rule-based policy

The [rubric-v1 handoff](../../../../docs/japanese-placement-rubric.md) documents schema 5 with a transparent JLPT-aligned placement policy and no empirical likelihood requirement. `rubric-alignment.json` binds fifty reading/construction anchors and rationales to the unchanged v4 catalog. The shared compiler retains all 470 items; fifty core anchors plus 170 kana/word choices are eligible for this initial policy. The other 250 core items remain supplementary drafts. Run `yarn japanese-placement:audit --rubric --json` or export with `yarn japanese-placement:content --rubric-bank`. The export has bank version 3, null likelihoods and no fabricated review approvals. An in-house pilot is optional. Existing unflagged v4 exports/pilot digests remain stable, and the likelihood requirements described below apply to historical v3/v4 policies. No bank is published.

## Earlier format samples

These are **twelve original, AI-assisted draft questions**, two per domain. All are text-based and automatically scored. The writing domain uses cut-up sentence tiles: learners arrange supplied words/phrases, and the server checks the order against accepted answers. There are no free-text responses, recordings or individual marking steps.

The samples are not a released test, exhaustive N5–N1 bank, validated test length or calibrated level mapping. Content and rights checks are pending for the reusable question bank. Those checks do not create a review queue for student attempts.

See the [assessment brief](../../../../docs/japanese-placement.md) for the scope, source findings and remaining work. This directory is outside `public/`; answer keys and accepted tile orders remain server-side.

From the repository root:

```sh
yarn test:japanese-placement
yarn test:japanese-placement:db
yarn japanese-placement:audit
yarn japanese-placement:audit --json
yarn japanese-placement:audit --strict
yarn japanese-placement:audit --samples --json
```

The optional database test uses only temporary local PostgreSQL schemas, accepts `MIRROR_TEST_DATABASE_URL` or the local `.env`, refuses remote hosts and removes its schemas/connections. Ordinary unit tests never load database setup. The storage, timing and grouped-bank migrations are applied locally, with no Japanese bank or fixture data published. The actual 470-item catalog is exercised only in a disposable schema with a test-fixture model; no synthetic likelihoods or approvals are added to application data.

The default audit now inspects the full 470-item catalog; `--samples` selects the twelve legacy examples. Both report four publication blockers: content review, rights review, placement-calibration review and missing assessment calibration/policy. Strict mode exits 1 while any remain. It does not modify files, fetch sources, load `.env`, use a database or seed tables. Tests disable database setup. The CLI enables the `react-server` condition to use the same server-only validation as the app.

Maintain stable item ids/revisions, the deterministic tie-breaking order and source evidence. For sentence assemblies, use unique tile ids, list all intended accepted orders and require every supplied tile exactly once. Repeated particles may have distinct ids and are interchangeable when they display the same text. Do not include the complete answer in a translated instruction. Content, rights and placement-calibration approvals attest to the full bank digest; text, calibration or policy edits invalidate them.

`loadApprovedJapaneseBank` checks bank readiness. The API service separately authorizes the student from the current database account, loads trusted attempt state, supplies identity/time and serializes concurrent submissions. The original bank and generated result are retained for history. API paths and teacher access rules are documented in the assessment brief.

The core supports immutable schema-v3 history and passage-aware schema-v4 banks through the same timing, adaptive selection and automatic provisional reading/writing level assignment. Version 3 retains its original 120-item limit, snapshot hashes and policy/scoring behavior. Version 4 uses `japanese-posterior-passages-v2` and `japanese-reading-writing-passages-v2`; authoring reference bands remain separate from calibrated difficulty. The initial learner format target is 24 questions; the approved bank declares domain quotas and minimum evidence. Questions require Japanese reference anchors and six reviewed response likelihoods (below N5 through N1). Kana likelihoods must be equal across N5–N1. Selection and scoring share one replayed response history, and completed results retain their original versions. No learner attempt waits for teacher marking.

These twelve authoring samples deliberately have `assessment: null` and `calibration: null`. They cannot supply a complete adaptive N5–N1 bank. Real content, likelihood calibration and learner validation must be completed before publication. Synthetic test banks are confined to tests/disposable schemas. See the assessment brief for timeout behavior, insufficient-evidence outcomes and the remaining section 4d screens.
