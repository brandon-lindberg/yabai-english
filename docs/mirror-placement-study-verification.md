# Placement and study browser verification

Section **6b**, delivered locally on `the-mirror`, 2026-10-30. This extends [section 6a's onboarding, booking and teacher-note journeys](mirror-release-verification.md). It verifies the existing independent assessment policies and shared study persistence through the application; it introduces no replacement scoring engine or scheduler. Brandon retains staging, commits and pushes.

## Placement journeys

Seven additional browser scenarios bring `yarn test:mirror:e2e` to eleven scenarios.

| Scenario | Actual behavior verified |
| --- | --- |
| English full attempt | The first eight question bands are `A1, A2, A2, A1, A2, A2, A2, B1` for the owner's mixed response pattern. All 24 questions are unique; the deadline stays fixed. Subsequent correct answers produce Advanced 3 automatically. The profile/report persist, Japanese attempt history stays unchanged, and the page redirects to the dashboard on reload during the cooldown. The API independently returns `cooldown`. |
| Japanese full attempt | The corresponding opening is `N5, N4, N4, N5, N4, N4, N4, N3`. All 24 questions and their evidence passages remain unique. Keyboard sentence assembly survives reload with the same attempt/question/deadline and two selected tiles. The mixed path then reaches an automatic N1 result, which survives reload without changing the student's historical English placement fields. |
| English below minimum | At 14 accepted answers, expiry returns insufficient evidence, saves no new placement and allows a fresh A1 attempt through the retry button. The final browser case uses Japanese interface text at 390px. |
| English eligible timeout | At 15 accepted correct answers, expiry saves the award with the ten-point timeout adjustment. The adjusted result and its assessment evidence persist; the cooldown applies. |
| Japanese below minimum | Eleven correct answers remain insufficient evidence. The completed attempt/result persist, English placement fields stay unchanged and the learner can start a fresh attempt. |
| Japanese eligible timeout | Eighteen correct answers yield an unadjusted N1 estimate, then six missing answers apply the Japanese timeout rule and award N2. The Japanese/dark mobile UI explains the adjustment, and reload preserves it. |

Learner responses expose neither English keys/stem IDs nor Japanese keys, accepted orders, bands, passage groups or calibration metadata. Offline fixture tools read the published test-bank snapshot for answering; the application grades every submitted UI answer. Wrong-subject endpoints return 403. The English and Japanese evidence/award rules remain distinct.

### Deadline fixtures and limits

The tests use real server expiry without waiting twenty minutes per case. They do not validate natural twenty-minute pacing or empirical proficiency calibration.

English's 14/15 answers first pass through the actual UI and API. A fixture command verifies that learner's signed accepted state, preserves its questions/answers and re-signs it with a near deadline while retaining the twenty-minute duration. One intercepted opening GET supplies this staged state after reload. Answer and finish requests still reach the real handler, database and server clock; no result is fabricated. This is not evidence of general English reload recovery. English still has no persisted attempt ledger or once-only finish guarantee.

Japanese deadline histories use the released bank, `startJapaneseAttempt`, `nextJapaneseQuestion` and `recordJapaneseResponse` under the current staircase policy. Factory-generated identities, timestamps and responses are stored atomically in the isolated schema with seven seconds remaining. The UI's own expiry read triggers the real locked finalizer; no response interception or simulated browser/server clock is used. The separate full attempt exercises normal HTTP response persistence.

## Independent study progress

One student studies an actual English Beginner 1 card, then changes subjects through the header's switch link and the Japanese landing page's explicit teacher-discovery action. Merely viewing the landing page leaves the account's subject unchanged. The Japanese study hub and queue initially remain unavailable because the track is `DRAFT`.

A namespace-guarded fixture operation publishes only the disposable schema's Japanese track. N1 remains locked for this unplaced student; N5 kanji practice opens. Changing interface locale to Japanese and theme to dark preserves the selected subject. A keyboard answer reaches the actual Japanese review endpoint, returns source on/kun feedback and saves one review. Repeating the identical request returns the same result without adding XP or counters. Reload retains both subjects' card state, and the English progress row, placement profiles and Japanese assessment history compare unchanged. The visible English landing action restores English access and its original XP. Opposite-subject review/overview requests remain blocked. A `finally` operation hides the test track again before later booking scenarios.

This covers representative progress and retry behavior, not a complete curriculum session or every mastery/unlock threshold. The existing unit/database suites retain that broader policy coverage. No test publishes application flashcards.

## Shared fixtures and isolation

The existing runner now also uses `seedStudyTrack` for the real English curriculum. Its reviewed mode imports the unchanged 10,291-card Japanese catalog through the existing importer. Without cached artifacts, or with `--synthetic-draft`, it reuses the existing ten-card prompt/service fixture, which has enough distinct N5 words and kanji for safe distractors. The earlier two-card import-only fixture cannot support a real practice queue; it remains unchanged for its existing tests. These synthetic cards are explicitly test data, not substitute production content.

The fixture CLI adds named, onboarded assessment/study students. Learning-state reads, test publication, answer lookup and deadline staging require the recorded release manifest and an exact `mirror_test_<uuid>` namespace. Learner-specific operations additionally verify manifest membership and the database student role; deadline operations enforce the appropriate subject and boundary counts. There is no new application API, auth bypass or publication flag. The current development-auth test mode remains restricted by the pre-existing owned Playwright configuration.

Japanese answer interaction is extracted into one helper reused by the earlier placement browser suite. English answer selection, sign-in, preferences, screenshots and database lifecycle likewise reuse shared helpers. The header helper now waits for visible account/menu/preferences controls instead of silently skipping a header that has not rendered yet. It retains the normal control interactions and unchanged timeouts. Full-page captures scroll to the origin before rendering sticky chrome.

Public-table protection expands from nineteen to **twenty-two** tables by adding English placement questions, study assessments and study assessment attempts. This covers the additional English seeder writes as well as the previous catalog/progress, placement, account, booking and payment boundaries. Before/after full-row fingerprints match in the final verification runs; this is scoped to the named tables, not every database table.

## TDD, copy and verification

The new study scenario first failed against the absent release learning-state operation. The first complete pass then found a mistaken test expectation about English cooldown presentation: the page redirects to the dashboard by design. Two subsequent failures exposed the shared header helper's render race. Those harness issues were corrected without altering assessment behavior or increasing timeouts.

The batched Impeccable review found one product-copy defect: English placement's introduction promised “15–25 minutes” in both locales despite a fixed twenty-minute timer. Two localized page-render tests failed against the old text. The page now supplies its minutes directly from `ENGLISH_PLACEMENT_POLICY_V2.timeLimitSec` to translated copy, and both tests pass. No second time-limit setting, CSS change or separate localized component is introduced.

Validation:

- **382 mirror, 183 study, 73 English placement and 279 Japanese placement checks pass**: 1,017 unit/component checks. Existing mirror skip/todo and 14/9 database-only skips remain explicit. The Japanese suite passes alone without adjusted thresholds.
- **Eleven isolated browser scenarios pass** with the reviewed catalog and with the shared synthetic CI fixture. Repeats count once: **1,028 distinct passing checks** including the unit/component suites.
- The synthetic eleven-scenario run precedes the final duration-copy correction and Japanese-interface English boundary variant. The final reviewed-catalog eleven-scenario run confirms those changes, the shared authentication environment and all current assertions.
- TypeScript, full ESLint, whitespace and the production build pass. Dedicated database-only suites were not repeated; browser setup replays all migrations and exercises actual persistence.
- CI's existing isolated browser step automatically includes the new spec. No remote CI run, OAuth flow, successful external payment, webhook or calendar/meeting join is claimed.

Impeccable's existing project context and hardening/craft-floor guidance informed the review and narrow copy correction. The session's previously unavailable context launcher was not repeated; historical product/design-context drift remains untouched. Four contact sheets cover the initial thirteen placement/study captures; the bounded confirmation adds a Japanese-interface English opening and verifies the copy correction. Desktop uses 1280px for these new journeys, mobile 390px, across English/Japanese interfaces and light/dark themes. Captures record the actual Archivo/M PLUS 1 stack, no page-level horizontal overflow and a solid 2px focus outline on the sampled control. Sentence tiles and choices also execute by keyboard. This is Chromium viewport emulation and sampled focus verification, not physical-device, full contrast or screen-reader certification. No independent review or clean-detector verdict is claimed.

Local evidence remains ignored under `.impeccable/review/release/`, including the fourteen placement/study PNG/JSON pairs, contact sheets, full-corpus execution log and per-schema fingerprint reports. The twelve section-6a captures are also refreshed by the full command; they are separate from the fourteen new views.

The final reviewed-catalog report is `protected-mirror_test_0d22184cd40a476db28aac8e8c1fc105.json` (twenty-two tables unchanged); the synthetic run report is `protected-mirror_test_4a2f4fe2dbfc459e9aa315d79e60c262.json` (also twenty-two unchanged). The final read-only application check confirms English published with 3,284 cards, Japanese DRAFT with 10,291 cards, assessment version 3 digest `43832badc0f39b039b2d0ffda31481f99774bd6f9035b5b42e65195bb8b9d203`, zero Japanese progress/reviews and zero temporary schemas/connections. The latest migration remains the prior `20261027010000_study_catalog_card_snapshots`.

Final cleanup removes recorded users/products, the fixture manifest, temporary schemas/connections and task-owned browser/server/test/build processes, with port 3100 released. Existing application English content and published Japanese assessment remain unchanged. Japanese flashcards remain **DRAFT**, with no Japanese learner activity written to the application database. No application migration, publication, staging, commit or push occurs in this increment.

## Next

**6c: external-service and release preparation.** Verify environment-backed OAuth, successful Stripe checkout/webhooks and Google Calendar/Meet creation/join behavior, then prepare the release handoff. Existing English attempt persistence/finalization limitations remain documented; section 6b does not silently strengthen them. Flashcard publication remains a separate decision.
