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
