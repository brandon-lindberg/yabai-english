# Shared study hub and Japanese practice

Section 5i of `MIRROR_PLAN.md`, 2026-10-24. Branch: `the-mirror`. Brandon owns commits and pushes.

## Entry and access

`/[locale]/learn/study` is the shared flashcard hub. It reads the authenticated account's current persisted learning language, independently of UI locale or stale session subject fields. Missing or inactive accounts cannot render study pages. Japanese overview reads retain the service's active-student and published-catalog checks; English retains its existing study permissions.

The shared study layout no longer redirects every Japanese learner to booking. Each page now enforces its own subject boundary. Japanese `N5`–`N1` practice URLs use the Japanese overview and review API. English curriculum URLs use the existing English track/API. A wrong-subject level is rejected before reading the other track. Locked Japanese practice redirects to the hub; Japanese learners cannot enter English exit assessments. Existing English placement, practice, exit assessments and progression remain separate.

The Japanese dashboard links to the shared hub without reading or creating English study state. Section 5j adds [Japanese dashboard summaries and daily review](japanese-dashboard-study.md) using the same practice components.

## Hub

One `StudyLevelList` renders both curricula using subject-specific view data. Japanese rows show N5–N1, current mastery percentage, track-scoped XP, unique cards studied, earned completion and access. A retained **Completed** milestone remains distinct from current mastery, which can decrease later. Japanese rows offer mixed, vocabulary, kanji, weak-card and mastered-card practice where appropriate; locked rows explain how access opens. English rows retain their level-test links.

The hub reuses the existing rank calculation, progress bar, status marks and button primitives. Japanese rank XP comes only from its own levels. No English exit assessment or English placement value is used to label Japanese proficiency.

The local Japanese catalog remains **DRAFT**. Its hub and direct practice routes show a preparation state with links to Japanese placement and private lessons. They do not expose draft questions, pretend practice is available, or ask learners to resolve internal content/policy work. This increment does not publish the corpus.

## Practice and recovery

- The Japanese client posts level/kind/focus to the existing queue endpoint, then validates the public queue schema and requested level. It never receives answer keys or grades locally.
- Meaning tasks show the exact word and its reading. Reading tasks preserve the task's meaning context without exposing the answer. Source usage text remains attached to the question; English glosses and Japanese readings carry explicit language attributes.
- Feedback is automatic and remains until **Next card**. Vocabulary readings/meanings and kanji on/kun/name readings stay separate. Source dot/hyphen notation is retained and explained. No recordings, free writing or teacher pre-review are introduced.
- A submission locks choices immediately. Busy guards prevent double clicks, and the exact serialized request is retained after uncertain save failures. Retrying cannot change the answer or timing, and session credit appears only after a validated result for that prompt.
- Expired/stale/conflicting questions offer a fresh queue without inventing correctness or XP. Loading/invalid-response failures offer retry. Signed-out, changed-account and unpublished-catalog responses replace answer controls with the appropriate recovery state.
- Queue and review requests are aborted on unmount; generation checks ignore stale responses. No watcher, polling loop or assessment timer is added. Pending answers are held in the mounted session, not persisted in browser storage. Reloading uses server-owned active-question/progress state rather than trusting a browser score.
- Question and feedback headings receive focus as the task changes. Status/error messages are announced. Noninteractive focus targets avoid input-like outlines; button and link focus rings remain intact.

`StudyPracticeLoading`, `StudyPromptCard`, `StudySessionProgress` and `StudyRankProgress` are shared with English practice. `Choice`, `Outcome`, `Status`, `Button`, `InlineAlert` and existing XP utilities remain the single implementations of their behavior. The Japanese response schema moved from its service to the public-contract module so the client and server validate the same result shape. The English controller, grading contract and automatic advance behavior are preserved.

## Verification

Demonstrated red/green covers missing Japanese components, fresh subject routing, the former English-only layout, dashboard discovery, queue failures, retained completion and preparation copy. **161 study tests, six isolated PostgreSQL study tests and 372 mirror regressions pass: 539 targeted tests.** These include both UI locales, exact retries, duplicate clicks, stale/conflicting prompts, account/publication changes, wrong/malformed response identities, filtered empty queues, new-session score reset and English review/advance compatibility. TypeScript, focused ESLint, whitespace checks and the production build pass.

Fifteen full-page component captures cover 1440px desktop/light, 390px mobile/dark and 320px Japanese/light, including hub, vocabulary, kanji feedback, uncertain save, preparation and English comparisons. The second bounded capture confirms no overflow or browser errors, loaded production fonts and comfortable button targets. The evidence uses actual production components/CSS with synthetic test data and API responses; it does not claim a complete authenticated browser journey or approve the draft content. Those journeys belong to section 6.

Impeccable uses the existing Operate design system. Its context launcher and detector could not execute; project context and references were read directly. The separate finish reviewer returned **ship**, with no material findings across the 15 captured component views and sampled source. This is component-scope approval, not corpus publication or an authenticated full-app journey. The separate documentation handoff found no material mismatch and preserved the incumbent system files. It recorded pre-existing PRODUCT/DESIGN documentation drift and the absent design sidecar without repairing unrelated context. No new visual identity or design-token change is part of this extension.

No migration, application learner row or publication change is needed for this increment. The published Japanese assessment remains unchanged. All commits and pushes remain with Brandon.

Section 5j now delivers [Japanese dashboard quick review and study summaries](japanese-dashboard-study.md). Next is learner-facing usage/sense/example review and corpus release preparation. Keep the flashcard publication decision separate from the owner's earlier assessment publication authorization.
