# Japanese placement question-bank authoring

The independent catalog now contains **470 draft items across all six domains**: 200 reading questions, 100 sentence assemblies, 50 kanji readings, 50 vocabulary choices, 50 grammar choices and twenty N5 kana checks. The original N2/N3 pack supplies 120 items; `remaining-levels/` adds 180 and `word-level/` adds 170 through the same importer. The [content handoff](../../../../docs/japanese-placement-content.md) documents 333 retained external records, licence notices, checksum locks and selection ledgers. Run `yarn japanese-placement:content --strict` from the repository root to verify the declared authoring targets offline. Integration, linguistic checks and calibration remain open; this is not a published bank. See [word-level attribution](word-level/ATTRIBUTION.md) for the selected lexical sources and their limitations.

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
```

The optional database test uses only temporary local PostgreSQL schemas, accepts `MIRROR_TEST_DATABASE_URL` or the local `.env`, refuses remote hosts and removes its schemas/connections. Ordinary unit tests never load database setup. The application migration is applied locally, with no Japanese bank or fixture data published.

The audit currently reports four publication blockers: content review, rights review, placement-calibration review and missing assessment calibration/policy. Strict mode exits 1 while any remain. It does not modify files, fetch sources, load `.env`, use a database or seed tables. Tests disable database setup. The CLI enables the `react-server` condition to use the same server-only validation as the app.

Maintain stable item ids/revisions, the deterministic tie-breaking order and source evidence. For sentence assemblies, use unique tile ids, list all intended accepted orders and require every supplied tile exactly once. Repeated particles may have distinct ids and are interchangeable when they display the same text. Do not include the complete answer in a translated instruction. Content, rights and placement-calibration approvals attest to the full bank digest; text, calibration or policy edits invalidate them.

`loadApprovedJapaneseBank` checks bank readiness. The API service separately authorizes the student from the current database account, loads trusted attempt state, supplies identity/time and serializes concurrent submissions. The original bank and generated result are retained for history. API paths and teacher access rules are documented in the assessment brief.

The schema-v3 core now implements a server-enforced 20-minute assessment, adaptive selection and automatic provisional reading/writing level assignment. The initial learner format target is 24 questions; the approved bank declares domain quotas and minimum evidence. Questions require Japanese reference anchors and six reviewed response likelihoods (below N5 through N1). Kana likelihoods must be equal across N5–N1. Selection and scoring share one replayed response history, and completed results retain their original versions. No learner attempt waits for teacher marking.

These twelve authoring samples deliberately have `assessment: null` and `calibration: null`. They cannot supply a complete adaptive N5–N1 bank. Real content, likelihood calibration and learner validation must be completed before publication. Synthetic test banks are confined to tests/disposable schemas. See the assessment brief for timeout behavior, insufficient-evidence outcomes and the remaining section 4d screens.
