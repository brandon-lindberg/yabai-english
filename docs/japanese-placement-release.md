# Japanese assessment release — 2026-10-23

**Browser follow-up:** the subsequent [browser verification handoff](japanese-placement-browser.md) resolves the earlier local sign-in/locale limitations and verifies the actual bank through the student and eligible teacher interfaces. It also fixes unfinished sentence drafts across reload/locale switches. The publication snapshot and digest below are unchanged; production deployment remains separate.

The project owner explicitly authorized publication in the current conversation: “this is fine, you can publish this.” This supersedes the earlier requirement to obtain a separate human teacher signoff before releasing this version. It does not authorize commits, pushes or a production deployment. The publication target for this increment is the configured **local application database**.

## Exact release

- Bank `japanese-content-catalog`, version **3**, schema **5**.
- Content SHA-256: `43832badc0f39b039b2d0ffda31481f99774bd6f9035b5b42e65195bb8b9d203`.
- Policy `japanese-jlpt-rubric-v1`; scoring `japanese-reading-writing-rubric-v1`.
- 470 retained items; 220 eligible for serving, including fifty reading/construction anchors. Twenty minutes, 24 adaptive questions, six domains, N5–N1 reference coverage.
- Release record: `apps/web/data/japanese-placement/release.json`. It explicitly records **owner authorization with AI-assisted checks**, not an independent teacher review. The historical `japaneseTeacher`, `rights` and `placement` review fields remain null. Legacy approval requirements remain unchanged.

The authorization, evidence references and notice checksum travel inside the immutable database snapshot. They do not alter the existing content digest. Changed content/source terms, missing evidence, incompatible schemas, inadequate anchor coverage and stale notices still fail. No likelihoods, learner data, human reviewers or JLPT certification claims are invented.

## Content and policy evidence

The [editorial screen](japanese-placement-quality.md) covers all 470 items and 110 accepted construction orders and records the fourteen affected items. The [content handoff](japanese-placement-content.md) records the three locked source packs, 333 retained external excerpt records, dictionary checks and source-specific adaptations. The [rubric handoff](japanese-placement-rubric.md) and digest-bound alignment manifest document the selected anchors and automatic band rules.

Passing checks establish importer integrity, unique exercises/keys, accepted-order handling, declared reference bands, policy mechanics and persistence behavior. They do not establish empirical accuracy for real learners or exhaustively enumerate every natural sentence order. The existing provisional-result wording remains applicable; neither a pilot nor per-student teacher marking is required for this release.

TDD red/green covers the owner-release contract, stale authorization, missing/modified notices, database-free checks, explicit publication, remote-target refusal, idempotent publication and revoked-snapshot refusal. The PostgreSQL suite uses the actual release without synthetic signoffs, completes 24 questions and preserves historical v4 attempts/results. Existing timing, one-passage and private-key guards remain enforced.

## Rights and public attribution

The nine source records retain original credits, source URLs/pins, licence labels and adaptation descriptions. No unlicensed official past-paper content is imported.

| Material | Existing basis checked | Release treatment |
| --- | --- | --- |
| Japaneseness N3/N4 | Site-wide CC BY-SA 4.0 grant | Credits, original URLs, adaptation notices and CC BY-SA terms |
| Kotonoha, nihongo-mono original grammar, Yomitaku original readings | Retained MIT notices; nihongo-mono's explicit original-data notice | Complete copyright/permission/warranty notices retained |
| JLPTSuccess original N5 material | Retained educational-content CC BY-SA grant and original-content disclosure | Credits and adaptation notices; AI-persona labels are not human endorsements |
| OpenJLPT, Waller reference rows and selected JMdict-derived fields | Retained OpenJLPT/reference notices and EDRDG dictionary terms | Upstream credits, CC BY-SA terms, dictionary documentation/licence links and pinned edition |
| Original N2/kana material and adaptations | Project contributions under CC BY-SA 4.0 | Same licence and disclosed changes |

On 2026-10-23 the primary [Japaneseness grant](https://japaneseness.com/about/), [EDRDG licence](https://www.edrdg.org/edrdg/licence.html) and [CC BY-SA terms](https://creativecommons.org/licenses/by-sa/4.0/) were checked alongside the retained repository notices. This is a source-term check, not legal certification. Original rights holders retain their rights and give no endorsement.

Public `/japanese-placement/v3/NOTICE.txt` is generated from the existing source records and retained full notices, with no keys, question text, permission evidence or private release metadata. Its SHA-256 is `da96a65c8599b31ba0739e73ca84d95bc23c123fa70a2ddf0d45339fa4f98c42`. The assessment links it in both UI locales and every assessment state, opening separately so reading credits does not navigate away from the running assessment. Licensed assessment content retains its reuse rights; no extra restriction is imposed by this notice.

JMdict's pinned edition is 2026-10-19. Maintain a monthly dictionary-update procedure: obtain the latest dictionary through the existing corpus tooling, recheck the selected spelling/reading restrictions and glosses, curate any changes in the single authoring catalog, rerun content/policy checks, and release a new version/digest with fresh notices when content changes. Record checks even when selected records are unchanged. Never rewrite historical snapshots. This increment creates no recurring automation and publishes no flashcard corpus.

## Reproduce and operate

From the repository root:

```sh
yarn --silent japanese-placement:publish
yarn --silent japanese-placement:publish --write-notices
yarn --silent japanese-placement:publish --publish
```

The default operation validates the exact release and public notices without reading database credentials or opening a connection. `--write-notices` regenerates only the versioned public notice after checking its declared checksum. `--publish` explicitly reads `DATABASE_URL` (environment first, otherwise `apps/web/.env`), restricts this command to local PostgreSQL and invokes the existing shared publisher. No seed, startup hook or HTTP publication route is added. The client disconnects in `finally`.

The publisher reuses an identical version/digest, refuses conflicting content and refuses a revoked snapshot. Revocation remains an explicit administrative operation; republishing does not silently reactivate it. Production activation is a separate deployment operation using the deployed code, public notices, migrations and an explicitly chosen database; this local command deliberately does not target a remote database.

The [production content deployment workflow](japanese-study-publication.md#production-deployment) now provides that separate operation, using the same publisher alongside the approved flashcard importer and publisher. Its default is offline verification, with explicit database targeting and pinned publication required for production writes.

The raw `japanese-placement:audit --rubric` and content exports intentionally remain authoring/draft views. Use `japanese-placement:publish` to check the owner-authorized release; a draft audit does not query database activation state.

## Verification and activation record

255 Japanese unit/API/component tests, eight PostgreSQL tests, 367 mirror regressions and 35 corpus tests passed (665 total). TypeScript, focused ESLint, strict source-content/checksum and whitespace checks passed. The production build compiled and generated all 145 pages successfully. Prisma reports all 81 migrations applied locally.

Activated at `2026-10-23T02:02:44.881Z` in `localhost / english_platform`, immutable snapshot `cmvkbrxg00000cb0pvfkotonp`, version 3, exact digest above, not revoked. A real service smoke check against that snapshot started and resumed an assessment, preserved the deadline, answered all 24 questions without exposing keys, and read back the saved provisional N1 result for an all-correct mechanics profile. The owned verification user and its attempt/responses were removed in `finally`. This is delivery/mechanics evidence, not measured placement accuracy for a learner cohort.

The subtle public-credit link passed keyboard activation, a visible 2px focus outline, a 24px minimum target and overflow checks in four current-component renders with production CSS/fonts: English desktop/light and mobile/dark, Japanese mobile/dark and intermediate/light. The actual public question comes from the service smoke check. Credits opened separately and contained the retained notices. Desktop English and mobile Japanese captures were visually inspected at `.impeccable/review/japanese-placement/release-credits-*`. These are isolated component/asset fixtures; no preview server was started. The task-owned browser was closed.

The earlier rubric handoff's browser/auth/locale limitations remain separate from database publication. No claim of a successful production deployment or a complete cross-product browser release is made here.

Final cleanup verification: one active published bank; application attempts/responses, owned verification users, temporary test schemas and task database connections are all zero. All recorded task processes exited, the task-owned browser closed, and port 3100 has no listener. No commit or push was performed.
