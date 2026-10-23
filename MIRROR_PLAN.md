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

### 2. Shared learning-language foundation — complete

Design and test persisted learner intent, teacher teaching-language/offerings scope, authorization boundaries, and compatible migration of the existing English records. Shared account/session behavior must preserve the selected subject independently of UI locale. Establish regressions for the existing English journeys before implementation.

Delivered decisions and behavior:

- Keep one account and shared contact/roster/payment history. `User.learningLanguage` is the current learning preference, not an entitlement or a second account. A strict authenticated student-only endpoint changes only this preference; database sessions and refreshed development JWTs preserve it independently of `locale`. A learner can switch subjects without rewriting old lessons or English progress. Japanese progress will have its own models in sections 4–5.
- Use `TeacherLessonOffering.learningLanguage` as the teaching-subject authority. A teacher can offer either or both subjects. Do not duplicate that list on the teacher profile or infer it from nationality or `instructionLanguages`. Teacher-authored and admin-granted offerings accept an explicit subject. Editing a class preserves its subject; changing subjects requires a new class.
- Apply shared subject query rules to discovery, direct teacher pages, lesson prices, booking creation, and availability. Compose subject and privacy clauses with `AND`, so roster access cannot bypass the subject boundary. An invalid teacher id never falls back to another teacher; an explicit invalid or wrong-subject offering id never falls back to another class.
- Snapshot the selected subject on each new booking. Rescheduling uses that snapshot, even after the learner switches subjects. Historical lessons remain accessible and retain their original payment/calendar behavior. The existing once-per-student-and-teacher trial policy remains shared across subjects.
- The additive migration defaults all existing accounts, offerings, and bookings to English, including users with an English UI. Historical unlinked availability is English only; legacy English trial hours remain usable when priced classes are retired. Existing organization/school workflows remain English; this mirror work is centered on private marketplace lessons.
- Japanese intent cannot enter the English placement/study page trees or call their read/write APIs. The assessment algorithms, banks, levels, and English progress remain independent of the future Japanese systems.

Verification: 147 existing booking/product regressions passed before implementation. New behavior was introduced with demonstrated red/green cycles. The resulting mirror suite has 212 passing tests; the separate PostgreSQL test replays all prior migrations in an isolated temporary schema, checks historical data preservation and subject/roster/availability boundaries, then verifies schema and connection cleanup. The 35 corpus tests, full TypeScript check, focused ESLint, and Prisma schema validation also pass. Prisma's generated schema diff matches the additive migration. Three pre-existing booking test placeholders remain TODO; end-to-end journeys remain section 6.

Migration status: verified in isolation and **applied to the local application database during section 3 browser verification**. The existing English rows retain the additive migration's English defaults. Production deployment and migration remain release work. No deployment, commit, or push was performed.

Re-run from the repository root with `yarn test:mirror`, `yarn test:mirror:migration`, and `yarn test:japanese-content`. The migration command accepts `MIRROR_TEST_DATABASE_URL`, otherwise reads the local `.env` database URL, refuses non-local hosts, and creates/removes its own random schema. The ordinary mirror suite never loads the database-seeding global setup; the database test is opt-in.

### 3. Distinct landing and signup journeys — complete

Use impeccable to design the two landing surfaces with visibly clear subjects, distinct URLs and metadata, language-specific calls to action, and an explicit way to switch subject. Share presentation primitives and genuinely common sections; represent subject-specific copy and composition as data/variants. Test browser refreshes, direct links, language switching, OAuth round trips, and wrong-language teacher access. Verify desktop/mobile and both themes in bounded visual passes.

Connect the section 2 foundation to guest intent and OAuth signup. Add explicit subject choices to teacher onboarding/class creation and free-trial scheduling. Make onboarding, dashboard proficiency/study summaries, teacher links, booking labels, and navigation use the chosen subject so English progress never appears as Japanese proficiency. These interfaces are not a Japanese launch yet. Browser verification requires the migration on the local application database.

Delivered:

- `/learn-english` and `/learn-japanese` are separate canonical landing paths with subject-specific metadata, headlines, signup and teacher actions. UI locale prefixes are independent of the learning subject. The guest root and an unspecified sign-in offer an explicit choice; signed-in root routing remains compatible.
- Shared landing sections, navigation rendering, product-name formatting and account infrastructure carry subject variants without duplicating the app. The established Alphabet Storm world, fonts, tokens and primitives remain in use. The surface contract is in [learning-journeys.md](docs/design/learning-journeys.md).
- Explicit teacher browsing saves guest intent in an HttpOnly cookie. Signup prepares a short-lived, per-flow HttpOnly intent cookie and returns through a callback bridge before onboarding. The authenticated account remains authoritative; visiting a landing page cannot silently change its preference. Callback validation, expiry, one-time consumption, role checks, concurrent tabs and OAuth error recovery have targeted regressions.
- Guest discovery and direct teacher pages use the selected subject. Onboarding and dashboard headings name it, Japanese learners do not see or initialize English proficiency/review summaries, and their checklist omits the English assessment and study paths. Locale changes preserve the subject and wizard draft; document language also updates during client navigation. Existing English wizard drafts remain compatible.
- New teacher classes require an explicit subject; edits preserve it. Class summaries and scheduling choices identify the subject, and derived free trials follow actual teaching offerings. Learner teacher links, checkout and next-lesson summaries use subject-aware data and labels. Historical access still follows the booking's saved subject.

Verification: demonstrated red/green cycles; 356 mirror tests and 35 corpus tests pass. Five browser journeys pass using recorded, disposable local accounts: root/locale navigation, guest discovery and wrong-subject teacher denial, first Japanese sign-in/onboarding, an existing English learner deliberately switching subjects with English APIs still blocked, and explicit Japanese class creation. A further browser regression verifies intact Japanese words at 390px, 524px and 1440px. Full TypeScript, changed-file ESLint and the final production build pass. The design detector returned no findings. The final production capture matrix contains both landing pages at desktop, mobile and the user's 524px width, plus root/sign-in at desktop/mobile, in both themes where applicable. The independent reviewer inspected all 18 captures, requested one Japanese headline correction, then scored that fix resolved with disposition `ship` at fix-list scope. The existing design system is preserved; compatibility evidence is recorded in the surface brief.

Cleanup: recorded disposable accounts and their related fixture rows have been removed, and task-owned preview/dev servers have been stopped. No commit or push was performed.

Release boundaries: real Google OAuth, completed learner consent/onboarding, payment/calendar flows, mixed historical schedule labels and lesson completion still require section 6 verification. Development credentials exercised the callback bridge locally; no real Google account was signed in for the browser tests. Japanese placement and flashcards remain sections 4–5; these pages make no claim that those systems are ready.

Local browser QA is opt-in. From `apps/web`, create the recorded fixtures with `./node_modules/.bin/tsx scripts/mirror-journey-fixtures.ts create`, run the app on `localhost:3100` with the local development authentication configuration, then run `./node_modules/.bin/playwright test --config playwright.mirror.config.ts`. Use `MIRROR_CAPTURE=1` for the bounded capture test. Always run `./node_modules/.bin/tsx scripts/mirror-journey-fixtures.ts cleanup` and stop the task-owned server afterward. The fixture helper refuses non-local databases and removes only its recorded users and related rows. Without that manifest this dedicated browser suite skips safely.

#### Header refinement — 2026-10-22

The user's screenshot feedback replaces the earlier header settings arrangement. Desktop language/theme controls are subtle icons beside sign-in; mobile guest navigation and preferences live inside a hamburger disclosure. The dedicated settings row is removed. Learning-subject context and its change action stay with the wordmark, distinct from interface language. Account menus reuse the same controls, and all menus share keyboard/outside dismissal. Theme state stays synchronized between desktop and mobile controls when resizing.

Red/green verification covers the icon/disclosure behavior, retained query parameters, saved theme and synchronized controls. The expanded mirror suite has 366 passing tests; three guest browser journeys, TypeScript, ESLint and the production build pass. The bounded capture matrix covers 320, 390, 524, 664 and 1440px, both themes, closed/open menus and Japanese copy. A fresh Impeccable reviewer inspected all 30 full-viewport captures and returned `ship` with no material findings in the guest-header scope. Signed-in account-menu visuals and live motion were outside that visual verdict. The [header brief](docs/design/header-preferences.md) owns the refinement and compatibility documentation. No database fixtures were needed, task-owned processes are stopped, and port 3100 is released. No commit or push was performed.

### 4. Independent Japanese placement — engine, storage and surfaces delivered; bank validation pending

Create a Japanese-specific, automatically scored reading/writing assessment that gives teachers an approximate starting level before their first conversation with a student. Writing means assembling cut-up word/phrase tiles into a sentence. Cover kana, kanji readings, vocabulary, grammar, reading and sentence building. There are no recordings, listening tasks, free-text answers, individual response review or oral-confirmation steps. Japanese item models, banks, progression, scoring, attempts and results remain independent of English.

**Format correction — 2026-10-22:** match the English assessment's flow: a timed assessment, difficulty that adapts as the student answers, and an automatically awarded level at the end. Use its 20-minute limit and 24-question length as the initial format target; validate Japanese timing and domain coverage before release. Matching this experience does not mean copying the English engine, CEFR bands or scoring thresholds. Section 4c now implements this flow at the engine/API layer; the bank and learner surfaces remain pending.

The intended teacher-facing result is an automatically generated provisional reading/writing study band and skill breakdown. Use N5–N1 references only where the Japanese bank supports them, with below-N5 and insufficient-evidence outcomes. Determine coverage, length and interpretation through Japanese-specific scoring design and learner data. No English thresholds, official JLPT score conversion, speaking inference or per-student manual marking.

#### 4a. Assessment contract, source research and independent core — initial scaffold delivered

The [assessment brief](docs/japanese-placement.md) records the corrected scope, source findings and remaining implementation. The initial fixed, versioned survey scores both selected answers and sentence assemblies immediately. At that stage, its level mapping was still pending and the initial core returned `unavailable / bank_not_calibrated`. Section 4c supersedes that fixed progression and unavailable-level scaffold with timed adaptive delivery and automatic level assignment. It does not place an attempt in a teacher marking queue.

Delivered:

- Independent Japanese bank/item contracts, explicit progression, serializable attempts and automatically scored six-domain summaries. No English engine, bank, enum, thresholds or progress models are imported or modified.
- Sentence assemblies use unique tile ids and registered valid orders. Every supplied tile must be used exactly once. Repeated particles with different identities are interchangeable by their text. Complete wrong orders are scored incorrect; unknown, missing or repeated ids are rejected. Accepted orders stay server-side.
- Exact exercise/option duplication checks, source references and snapshot-bound question-bank content/rights approvals. These concern reusable content quality before release, not approval of individual student responses. Content edits invalidate the approvals. The earlier audio machinery and free-text drafts have been removed.
- Current-question projection protects keys, accepted orders and explanations. Attempts reject foreign/edited banks, invalid response types, out-of-order answers and conflicting retries. Identical retries are idempotent. Skips remain separate from incorrect answers. No result contains free-writing samples, pending student review or oral confirmation.
- [Twelve original, AI-assisted draft questions](apps/web/data/japanese-placement/README.md), two per domain, including two sentence-building tasks. They demonstrate the formats, not complete N5–N1 coverage, a validated length or a published assessment. At this initial delivery the audit reported the two question-bank content/rights blockers; section 4c adds calibration requirements.

Verification: demonstrated red/green cycles; 58 Japanese-placement tests, 35 corpus tests and 366 mirror regressions pass. Full TypeScript, focused ESLint and whitespace checks pass. `yarn test:japanese-placement` and `yarn japanese-placement:audit` run without credentials or database setup. `yarn japanese-placement:audit --strict` intentionally exits 1 while the reusable bank awaits content/rights approval. The ordinary mirror run still skips its opt-in migration test and retains three pre-existing TODO placeholders.

No application database, learner-facing UI or navigation changed in this subphase. No commit or push was performed. No preview server was needed; verification processes have exited.

#### 4b. Persistent attempts, transactional submissions and access — complete

Delivered Japanese-specific bank snapshots, attempts, ordered responses and retained completion results. The additive migration is verified in isolated PostgreSQL schemas and **applied to the local application database**. No draft bank or learner fixture data was published; production deployment remains release work.

- Added start/current/resume/response APIs and an authorized teacher-result API. They use the current database account, independent Japanese student intent and ownership, rather than trusting browser identity or stale session role/subject fields. Teacher access requires a confirmed/completed private Japanese booking; roster-only, English, unpaid and cancelled relationships do not grant access. No teacher marking step exists.
- A shared per-learner transaction boundary serializes starts, reads and submissions. Request UUIDs make starts idempotent, response retries do not append twice, changed/out-of-order submissions conflict, and final response/result writes are atomic. One active attempt per learner is also enforced in PostgreSQL.
- Snapshots retain original content and scoring versions; finished results are returned without regrading. Database constraints/triggers protect identities, content, response ordering and finished state. Revocation blocks active delivery while preserving completed results; a new start can replace a revoked active bank. User deletion still cascades through assessment rows.
- Shared HTTP handling keeps answers/accepted orders server-side, returns private non-cacheable views, rejects cross-site mutations and bounds JSON inputs. No application seed/startup route publishes the draft samples, so the empty local bank returns an unavailable state.
- Reused one local database-test runner and isolated-schema lifecycle for both the new persistence tests and existing mirror migration regression. There is no duplicated assessment engine, account system or migration-test lifecycle.

Verification: red/green cycles; 68 Japanese-placement tests, 366 mirror tests and 35 corpus tests pass, plus 2 opt-in Japanese PostgreSQL tests and the existing migration regression (472 passing tests in total across these runs). The PostgreSQL checks exercise concurrent identical/conflicting submissions, completion rollback, version/history preservation, subject/teacher/ownership boundaries, revocation/replacement, account deletion and unchanged English progress. Prisma reports no difference between the isolated migrated schema and its model. TypeScript, focused ESLint, schema validation, whitespace checks and the production build pass. The first sandboxed build could not fetch existing Google Fonts; the permitted network-enabled rerun passed without source changes.

Re-run `yarn test:japanese-placement:db` for opt-in local verification. Temporary schemas/connections are removed; standard unit suites remain database-free. No UI/style changes, commit, push or production deployment were performed. Task-owned verification/build processes have exited.

#### 4c. Timed adaptive progression and automatic placement level — engine complete; bank calibration pending

Replaced the fixed survey with one independent Japanese adaptive implementation, using demonstrated TDD red/green cycles. No learner-facing UI/style changes were made in this subphase.

- Attempts now persist a server-owned 20-minute deadline, policy revision and question budget. Resume, retries and concurrent tabs preserve that deadline. Starts, learner reads/submissions and authorized teacher reads atomically finalize expired attempts using only accepted responses. Late submissions return the retained timeout result without appending an answer. A disconnected learner needs no background worker; the next authorized interaction settles the result at the original deadline.
- Banks carry Japanese difficulty anchors, response likelihoods and domain quotas. Selection balances domain coverage and chooses questions by expected information gain; final reading/construction probes verify the candidate difficulty range. Replay derives state from the saved responses, avoiding a duplicated adaptive-state store. Kana cannot distinguish advanced bands, and exercise/item repetition is blocked.
- Normal completion automatically produces a provisional Japanese study band and skill breakdown. Below-N5 through N1 are covered by synthetic behavior tests. Partial/expired attempts also estimate a band when evidence is sufficient; empty, all-skipped or sparse attempts explicitly report insufficient evidence. Skips, wrong answers and unanswered items remain distinct. No individual marking step, recording, listening or free-writing workflow exists.
- The model uses the complete response pattern, with an explicit uncertainty range and bounds on extrapolation beyond reading/sentence-building questions actually administered. Bank calibration/level interpretation requires its own digest-bound approval in addition to content and rights checks. These are reusable bank publication gates, not student reviews. The twelve drafts have null calibration/policy and remain unpublished; synthetic probabilities are never used for learner delivery.
- The follow-up migration `20261022010000_japanese_placement_adaptive` adds immutable timing/policy/budget fields and response constraints. It is verified in isolation and applied locally. Old completed results and exact retries retain their original interpretation; unsupported active surveys can be replaced only when a supported bank is available. The section 4b migration was not edited. No English engine, thresholds, bank or progress models were copied or changed.

Verification: 85 Japanese unit/API tests, five isolated PostgreSQL tests, 366 mirror regressions, 35 corpus tests and the existing PostgreSQL migration regression pass (492 passing tests across these runs). Coverage includes six synthetic level boundaries, mixed skill profiles, timing boundaries, unchanged deadlines, concurrent expiry/retries, rollback, teacher-triggered completion after disconnect, actual 24-question completion from a larger bank and v2 history preservation. TypeScript, focused ESLint, Prisma validation/schema diff, whitespace checks and the production build pass. The ordinary suites skip opt-in DB tests and retain the three pre-existing TODOs.

The [assessment brief](docs/japanese-placement.md) specifies the model and API semantics. Before publication, validate the Japanese bank, likelihoods, quotas, timing and evidence rules against real learner data. There is still no learner assessment page or published Japanese bank. Local application tables still contain zero Japanese banks, attempts and responses. Temporary test schemas/connections are gone, task-owned processes have exited and ports 3000–4000 have no listeners. No commit, push or deployment was performed.

#### 4d. Learner and teacher assessment surfaces — complete

Delivered with Impeccable in the established Alphabet Storm system and demonstrated TDD red/green cycles:

- A separate `/{locale}/japanese-placement` page and Japanese student dashboard/header entry. The route requires a Japanese-learning student who has completed onboarding; the APIs retain their fresh database authorization. The English placement cooldown does not control Japanese access. Opening the page resumes saved progress without starting a timer.
- An explicit start, one question at a time, responded/total progress, server-budget countdown and automatic expiry-result fetch. The display accounts for device sleep and client clock skew; the server owns the deadline. Refresh and tab return preserve the attempt and same-question sentence draft. An uncertain start retries its UUID, an uncertain answer freezes edits and retries exactly, and conflicts reload saved progress. Failed timeout recovery remains manual rather than looping.
- Accessible cut-up sentence assembly through visibly labelled groups and ordinary buttons, with remove, undo, clear and complete-set submission. Repeated words retain unique tile identities. Reading/choice questions and sentence assembly share the public input/projection contracts; no answer keys, accepted orders, audio, free-text writing or teacher marking enter the browser flow.
- Shared learner/teacher result presentation: provisional awarded band, model range, six skill rows, skips/unanswered counts and completion time. The authorized teacher's student-profile page shows that same result without learner actions, or an honest empty state. Existing booking authorization remains unchanged. A separate lesson-detail assessment panel was not added.
- Localized English/Japanese instructions and loading, network, unavailable-bank and unsupported-version states. Existing tokens, fonts and UI primitives remain canonical. The floating chat launcher is hidden on the assessment route to avoid covering mobile controls/results; other routes retain it.

Verification: 108 isolated Japanese tests, five Japanese PostgreSQL tests, 367 mirror regressions, 35 corpus tests and the existing PostgreSQL migration regression pass (516 tests across these runs), plus three browser tests. Browser checks exercise the real unpublished-bank state and eligible teacher empty state, keyboard sentence assembly/resume/automatic timeout through intercepted API contracts, and an opt-in 18-capture matrix at 390, 524 and 1440px across both themes/locales. Active questions and sample awarded bands are browser-only fixtures, not a published or calibrated assessment. Completed teacher results are covered by the shared renderer and access tests; the teacher browser journey verifies the eligible empty state. Full TypeScript, focused ESLint, whitespace checks and the final production build pass. The fresh Impeccable finish reviewer inspected all 18 captures and returned `ship` with no material findings within this extension's scope. The detector launcher failed with permission denied even after an escalated retry, so no detector-clean claim is made. The [surface brief](docs/design/japanese-placement.md) records compatibility with the incumbent system; PRODUCT.md/DESIGN.md drift is preserved rather than repaired.

Cleanup: recorded browser accounts, related rows and the owned booking/product have been removed. Local Japanese bank, attempt and response counts remain zero. Temporary test schemas/connections are gone; the task-owned server is stopped and port 3100 is released. No commit, push or deployment was performed.

#### 4e. Bank content, calibration and release — remaining

Expand the twelve format drafts into a sufficiently broad bank; resolve content/accepted-order ambiguity and source rights, then validate difficulty likelihoods, quotas, evidence minima, timing and level interpretations against real learner data. Publish only the approved snapshot, and verify the real-bank browser completion and completed-result teacher journeys. No teacher action is needed to score an individual attempt. Section 4 is not live or complete; section 5 has not started. Section 6 retains the final cross-product release checks.

Repository research follow-up — 2026-10-22: [the assessment source report](docs/japanese-assessment-research.md) identifies a real N5–N1 diagnostic repo (`christopherliu830/jlpt-check`), but its official-workbook question content has no verified redistribution grant. Original licensed N5/N4 questions from JLPTSuccess and N1 reading/construction from Yomitaku/Kumitaku are better import candidates. Nihongo-mono (1,031 grammar entries/2,062 examples) and Hanabira's separate content repo (828 grammar entries) provide five-level source material. Prioritize adapting these sources into one Japanese bank rather than authoring everything from scratch. N2/N3 passage and fully keyed construction coverage remain open in the directly reusable collections checked; no complete calibrated drop-in instrument was verified. Question accuracy, alternative sentence orders and source-specific content terms still need an import audit. This pass changes research documentation only and publishes no content.

Before implementation, the user requested a concrete N2/N3 solution. The accepted [targeted proposal](docs/japanese-n2-n3-solution.md) uses Japaneseness's CC BY-SA N3 reading collection, Kotonoha's original MIT N2 seed, and nihongo-mono's explicitly MIT grammar examples. A larger generated repo was rejected after inspecting placeholder readings and malformed assembly data. The initial authoring targets are now met as drafts, as detailed below; publication remains separate.

##### 4e content increment — initial N2/N3 authoring delivered (2026-10-22)

The accepted target is now implemented as a private draft pack: **twenty passages/twenty sentence assemblies per level**, with two keyed questions per passage — eighty reading questions plus forty construction items, 120 items total. N3 retains Japaneseness's twenty passage texts with selected/adapted comprehension tasks. N2 retains Kotonoha's three passages/six questions and adds seventeen original fictional passages/thirty-four questions. All forty constructions preserve distinct nihongo-mono examples from their own source bands. No free-response or listening content is imported.

[The content handoff](docs/japanese-placement-content.md) records source pins, 63 retained excerpts, MIT notices, CC BY-SA attribution/change notices, evidence quotes, accepted orders and remaining release work. One shared importer reuses the existing Japanese item validation and corpus integrity checker. Correct choice positions are balanced; tiles have opaque identities, incorrect initial orders and explicit alternatives where identified. The offline `japanese-placement:content --strict` check verifies authoring coverage and integrity, while the separate publication audit still fails until its existing requirements are satisfied. There are no fabricated calibrations, content approvals, database writes or learner publication.

TDD red/green covers the import contract, rejection paths, checksum drift, retained source text/levels/keys, alternative tile scoring, answer positions and the checked-in coverage target. Remaining work is N5/N4/N1 and other-domain content, linguistic/rights checks across the assembled pool, bank capacity and passage grouping during integration, learner calibration, and real-bank browser/result journeys. Authoring completion does not complete section 4e or start section 5. No teacher reviews or marks an individual attempt.

Verification: 124 Japanese placement tests, 35 corpus tests and 367 mirror regressions pass (526 total), with full TypeScript and focused ESLint passing. Content strict mode passes; publication strict mode continues to reject the unpublished sample bank. No database or browser process was started for this content increment; existing opt-in database checks were not repeated.

##### 4e content increment — N5/N4/N1 reading and construction delivered (2026-10-22)

The remaining-level pack adds **180 draft items** through the same Japanese importer: twenty passages with forty reading keys, plus twenty constructions at each of N5, N4 and N1. The combined catalog now contains **100 passages, 200 reading questions and 100 sentence-building tasks (300 items)** across all five reference bands. Coverage is explicitly scoped to reading and construction; it does not assert a complete six-domain bank or calibrated proficiency.

N5 uses twenty original JLPTSuccess reading texts, sixteen reworked explicit-order tasks, and four nihongo-mono examples. N4 uses Japaneseness's twenty-passage collection and twenty nihongo-mono examples; JLPTSuccess's empty standalone N4 bank is not presented as coverage. N1 uses ten Yomitaku arguments, five paired-text sets and five notices, plus twenty nihongo-mono examples. Starred-position Kumitaku keys are not used as full-order answers. Eight N5 constructions include additional natural word orders. Ambiguous applicant conditions, overlapping comparison questions and a problematic distractor are adjusted and recorded.

The new pack retains 120 source excerpts, bringing the catalog to 183. Its source-selection ledger accounts for 1,439 passage/question/grammar-first-example candidates: 120 selected, 1,305 deferred (including 254 N5 word-level MCQs), and fourteen free-text tasks excluded. The shared loader verifies both role-based locks and source text/level/ledger correspondence. Catalog merging rejects conflicting source notices and duplicate exercises. Multiple supporting quotes retain both sides of paired-text questions. All items remain private with null calibration; no database writes, bank activation, recordings or individual teacher marking are introduced.

Next is kana, kanji-reading, vocabulary and grammar-choice curation, followed by full-bank integration (capacity and passage grouping), content checks, learner calibration and real-bank journeys. The [content handoff](docs/japanese-placement-content.md) documents the files, source terms, changes and remaining limits. Section 4e remains in progress and section 5 has not started.

Verification: demonstrated red/green cycles; 132 Japanese placement tests, 35 corpus tests and 367 mirror regressions pass (534 total), plus full TypeScript and focused ESLint. The five-level content check passes; publication remains blocked by the existing bank readiness check. Database/browser suites were not repeated for this private content/import change, and no persistent process was started. No commit or push was made.

##### 4e content increment — kana and word-level drafts delivered (2026-10-23)

The third pack adds **170 automatically scored draft choices**: twenty original N5 kana checks, and ten each kanji-reading, vocabulary and grammar choices per N5–N1 band. The combined catalog now has **470 items across all six domains** (200 reading, 100 sentence assemblies, 50 each kanji-reading/vocabulary/grammar, twenty kana). Kana remains an N5 literacy floor; it supplies no advanced-band distinction.

The 100 distinct lexical selections reuse the section 1 corpus audit and dictionary matcher: dictionary-verified OpenJLPT spelling/reading pairs, full pinned JMdict restrictions, and matched same-band Waller reference rows. Whole-word readings are never manufactured from character on-yomi/kun-yomi. All lexical contexts/distractors are original; no Tatoeba examples are imported. New guards rejected valid alternate readings for 図書館 and 案内 as distractors and retain both supported 共存 readings without marking either wrong. This selected subset does not resolve the full flashcard corpus review queues.

Ten N5 grammar choices retain JLPTSuccess source keys; forty N4–N1 clozes retain different nihongo-mono second-example sentences as their exact completion. Authored distractors and Japanese disambiguating contexts are recorded. Twenty kana choices enforce the requested opposite script. Generic English instructions provide no translated answer. Source bands remain provisional, especially where grammatical-form recognition may be easier than the source tag suggests.

The shared importer, loader and private export now cover all six domains without another engine or duplicate dictionary logic. New evidence retains 150 external records, sixteen upstream file hashes and a 394-row ledger (150 selected, 244 deferred); totals are 333 retained records and nine source notices. The earlier ledger's N5 deferrals describe its earlier stage and are preserved. Rights, change notices and limits are in the [content handoff](docs/japanese-placement-content.md) and [word-level attribution](apps/web/data/japanese-placement/word-level/ATTRIBUTION.md).

TDD red/green covers choice projection, dictionary restrictions/IDs/source bands, valid alternatives, cloze completion, kana script/band constraints, provenance, coverage, keys and position balance. **145 Japanese placement tests, 35 corpus tests and 367 mirror regressions pass (547 total)**; full TypeScript, focused ESLint and the offline content strict check pass. Publication strict mode still rejects the unpublished sample bank as expected. Existing opt-in PostgreSQL suites were not rerun for this private data/import change. No database writes, browser server, persistent process, commit or push was introduced.

Next is full-bank integration: increase the current 120-item storage/validation capacity, retain passage identities and prevent correlated questions on the same passage from being treated as independent evidence. Then complete linguistic/content checks, learner calibration and real-bank journeys. All 470 items retain null calibration and remain unpublished. Section 4e is in progress; section 5 has not started. Teachers never mark or review individual responses.

### 5. Japanese flashcard import and study

Resolve the section 1 review queues before publishing the full corpus. Model vocabulary and kanji separately, with stable identities, source attribution, accepted readings/forms, and level provenance. Reuse shared review/scheduling infrastructure where appropriate; generalize English-specific assumptions instead of copying that implementation. Review examples, senses, and learner-facing reading presentation with Japanese teachers.

### 6. Cross-product verification and release preparation

Complete real onboarding-to-booking and teacher lesson-completion journeys for each subject; verify lesson scope, placement independence, study progress, payment/calendar behavior, locale changes, and data isolation. Run the appropriate CI checks and impeccable visual verification. Brandon reviews, commits, and pushes.

## Source completeness standard

Modern JLPT has no published exhaustive official vocabulary/kanji list. The measurable target is full, traceable coverage of a named, versioned community corpus, with every merge/correction explained and zero unreviewed omissions. Preserve level source and supplementary/inferred classifications. Multiple repositories inheriting Waller's lists are not independent pedagogical validation.

## Publication gates

Downloading a repository or passing structural validation does not approve its content for learners. Publication requires resolved dictionary/reconciliation issues, appropriate attribution, and teacher review of readings, meanings, levels, and examples. Section 1 produces research artifacts, not production study data.
