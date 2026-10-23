# Japanese placement surfaces

Scope: `/japanese-placement`, its student dashboard/navigation entry, and the Japanese result in the teacher's student context. Operate mode. The authorized mirror plan supersedes PRODUCT.md's older English-only/frozen-functionality scope.

Browser completion, 2026-10-23: the [local browser handoff](../japanese-placement-browser.md) supersedes the earlier sign-in/default-locale verification limitations. Nineteen full-app captures now pass across both locales/themes and 390/524/1440px, including actual teacher results. The selected sentence tiles now survive reload and locale changes through the existing tab-scoped draft hook, validated/scoped by attempt and question. Saved progress or expiry clears the old draft; failed saves preserve it. No style, typography, layout, timing or scoring changes were needed. The bounded Impeccable review used contact sheets plus full-size Japanese tiles/teacher and English result captures; no independent-review or clean-detector claim is made.

Release extension, 2026-10-23: the assessment now retains a small, underlined “Sources and licences” / “出典・ライセンス” link below every assessment state. It uses existing muted/foreground tokens, a 24px minimum target and the global keyboard focus ring; the public versioned notice opens separately so the assessment stays in place. Four isolated current-component renders with production CSS/fonts cover 390/524/1440px, both themes and locales, with no overflow and successful keyboard activation. Desktop English and mobile Japanese captures were visually inspected. This verifies the link refinement; earlier full authenticated browser limitations remain. Impeccable's launcher was unavailable, so existing context and clarify/craft/polish guidance were read directly; no independent reviewer or clean-detector claim is made.

## Direction contract

THESIS: One readable question at a time, with an unambiguous deadline and an automatic starting-level result.

OWN-WORLD: Inherit Alphabet Storm, Archivo/M PLUS 1, ink/paper tokens, rules, space and shared controls. Students use phones in varied light; both themes must work. No new visual identity or raster assets.

STORY: Understand the reading/sentence-building task, explicitly start the timer, answer or assemble tiles, then receive the saved result. Resume preserves the deadline. Teachers see the same result through existing authorization.

FIRST VIEWPORT: A restrained page title above an open, ruled assessment area. Progress and a tabular clock sit together above the Japanese text. Answers follow at reading width. Sentence tiles move into a clearly labelled sentence area through ordinary buttons. On completion, the awarded band leads and six domain rows explain the evidence.

FORM: Extend the user-specified English assessment format and existing app shell with Japanese interactions. Code-led; seed/comp selection is not applicable to this precisely specified extension. One shared result view and existing primitives avoid parallel presentation implementations.

FINISH: unreviewed and undocumented is unfinished; this build ends with the finish review, the verdict, DESIGN.md, and every shipping raster carrying its provenance

## Acceptance and boundaries

TDD red/green covers explicit start, resume, idempotent retry, conflict recovery, automatic timeout completion, accessible sentence assembly, localized states and authorized teacher presentation. Never show accepted orders, recordings, free-text writing or per-student marking. An unavailable bank is an honest product state; no fixture bank is published. Verify desktop/mobile, both themes/locales, keyboard operation and narrow-width overflow in a bounded capture matrix. Keep PRODUCT.md/DESIGN.md unchanged for this extension; record pre-existing drift rather than repairing it.

## Built compatibility

The finished surface preserves Alphabet Storm rather than introducing a new visual world. `globals.css` remains the token authority: ink/paper inversion, muted text and neutral rules carry the interface in both themes; the established warning token supplements the final-minute text notice. Archivo and M PLUS 1 continue to share one per-glyph font stack. The page uses `PageHeader`, a reading-width `max-w-2xl` main, open space and horizontal rules. It adds no card-based page structure, shadows, decorative material or palette.

The implemented type hierarchy is the shared page title, a compact prompt, larger Japanese stimulus, ordinary control labels and a display-scale result band through `Outcome`. Changing figures use tabular numerals. `Button`, `Choice`/`ChoiceList`, `ProgressBar`, `InlineAlert`, `Outcome`, `Skeleton` and `LocalDateTime` supply the shared interaction and presentation patterns. Sentence tiles are the ordinary secondary/ghost button variants, with wrapping space rather than a separate tile design system. The result's six domain rows use the same rules and spacing as the rest of the page.

The desktop and narrow captures support this compatibility: the task remains readable at 390, 524 and 1440px, both interface locales reflow, and light/dark retain the same hierarchy. These are surface findings, not a new set of global design tokens. `DESIGN.md`, `PRODUCT.md` and the absent `.impeccable/design.json` are preserved.

## Behavior and route invariants

- `/{locale}/japanese-placement` is a separate authenticated, onboarded Japanese-student route. Its student dashboard and header entries follow the selected learning language. The English assessment and its cooldown are independent.
- Opening or returning to the route reads saved state. Only the explicit start action begins the immutable 20-minute deadline. The initial format target is 24 questions; the published bank policy owns its actual domain quotas and question budget. One adaptive question is shown at a time.
- The server supplies the deadline and remains authoritative. The client counts down using the received time budget, accounts for device sleep, disables submissions at expiry and fetches the automatic result. It does not reset the timer on resume. An offline expiry fetch has a manual retry, not an automatic retry loop.
- An uncertain start reuses its request UUID. An uncertain answer retains the exact response and freezes editing; retry resends it. Conflicts reload the saved question. Loading, signed-out/access, unsupported-version, network and unavailable-bank states explain the next action in English and Japanese.
- `app-chat-panel.tsx` omits the floating chat panel only on `/japanese-placement`, preserving the assessment's question and result space. Other routes retain the existing panel.
- `JapanesePlacementResult` is the single learner/teacher result presentation. It leads with a provisional starting band when evidence permits, then the model range, six domain counts and localized completion time. Skips and unanswered items remain distinct. Insufficient evidence receives an explicit outcome rather than an invented level. No speaking/listening claim, official JLPT result, free-text submission, recording or individual marking step is introduced.
- The teacher's student-profile page reuses that component without learner controls. Authorization still requires a confirmed or completed private Japanese booking with that student; roster membership alone is insufficient. An ineligible teacher gets no section; an eligible teacher without a completed result gets the empty state. No separate lesson-detail result panel was added.
- The shared public contracts in `src/lib/japanese-placement/public.ts` carry only the projected current question or completed summary. Answer keys, accepted tile orders, likelihoods, stored responses and bank source material stay server-side.

## Accessibility and motion

Sentence construction uses native buttons, not drag gestures. The sentence and source-tile groups have visible labels; ordered selected tiles have position-specific removal labels; source buttons expose pressed state. A learner can add/remove tiles, undo, clear and submit with the keyboard. Submission requires the complete tile set, and unique tile identities allow repeated words or particles. Choice answers use the established native button primitive.

Each new question moves focus to its prompt. Japanese answer text uses a Japanese language annotation. The progress bar has an accessible name and value text. The tabular timer has `role="timer"` with live announcement disabled; the final-minute notice, save/recovery status and errors use the existing status/alert patterns. The shared controls retain visible focus treatment and their existing touch-target sizes.

This extension adds no authored transition or settle animation. It inherits the controls' brief color transitions, progress width transition and loading treatment. The shared progress bar removes width animation for reduced motion; the skeleton stops its shimmer. Captures were taken with reduced motion and animations disabled, so they establish static layout and states, not live motion quality.

## Verification evidence

The implementation and browser-contract tests are in `apps/web/src/components/japanese-placement`, `apps/web/src/lib/japanese-placement`, `apps/web/tests/japanese-placement` and `apps/web/tests/e2e/japanese-placement.e2e.spec.ts`. The recorded completed checks are 108 isolated Japanese tests plus five PostgreSQL tests, 367 mirror regressions plus the PostgreSQL migration regression, 35 corpus tests and three browser tests. TypeScript, focused ESLint and the final production build passed. This document records that completed evidence; the documentation pass did not rerun those suites.

All 18 required full-page captures are saved under `.impeccable/review/japanese-placement/`. The finish reviewer opened every required image and recorded them as valid. The documenter sampled the desktop tile view, Japanese mobile tile view, dark mobile result and Japanese teacher empty state against the source and incumbent system.

| State | Capture filenames |
| --- | --- |
| Intro | `intro-en-1440-light.png`, `intro-en-390-dark.png` |
| Choice | `choice-en-1440-light.png`, `choice-en-390-dark.png` |
| Sentence tiles | `tiles-en-1440-light.png`, `tiles-en-390-dark.png`, `tiles-en-524-light.png`, `tiles-ja-390-light.png`, `tiles-ja-524-dark.png` |
| Result | `result-en-1440-light.png`, `result-en-390-dark.png`, `result-ja-524-light.png` |
| Timeout | `timeout-en-390-light.png` |
| Unavailable | `unavailable-en-1440-dark.png`, `unavailable-ja-390-light.png` |
| Network recovery | `network-en-390-dark.png` |
| Eligible teacher empty state | `teacher-empty-en-1440-light.png`, `teacher-empty-ja-390-dark.png` |

The active questions and result bands in these captures use intercepted public-contract fixtures: draft item formats and a synthetic N3 result. They verify presentation, keyboard assembly, resume and timeout handling; they do not publish a bank, insert a learner attempt or validate a proficiency estimate. The real browser journey verifies the unpublished-bank state and eligible teacher empty state. A completed teacher result is supported by shared-component, unit and authorization tests; it was not demonstrated by a completed-result teacher browser capture.

The independent [finish review](../../.impeccable/review/japanese-placement-finish-review.md) records `disposition: ship`, with the five required sections (`persistence`, `fidelity`, `ceiling`, `material_fixes`, `keep`) and no material fixes. Preserve the open ruled layout, paired progress/deadline, button-based sentence assembly, shared result view and honest unavailable/provisional states. This disposition applies to the implemented surface and its stated evidence boundaries.

The context loader was unavailable earlier in the session, so existing context was read directly. The design detector was attempted once and retried with escalation; its launcher exited 126 with permission denied. Detector evidence is therefore unavailable, not clean. No additional scan or polish loop is implied by this record.

## Assets and provenance

This is code-led work. There is no approved composition image, concept seed, decision comp or QUALITY BAR card, and no measured comp comparison applies. No generated, stock or other raster asset ships with the surface. The PNG files above are browser evidence only; they are not product assets. Type, rules, shared primitives and the public contract carry the design, so no shipping-raster provenance manifest is required.

## Publication boundary and preserved drift

The learner and teacher surfaces are implemented, but no approved Japanese bank is published. The twelve draft format samples do not establish N5–N1 coverage, calibrated likelihoods, sufficient item depth, valid timing or a validated placement instrument. Content/answer quality, source rights, ambiguity, quotas, evidence minima and calibration against real learner data remain bank-publication requirements. They concern each reusable bank revision, not teacher approval of individual learners. After publication, a real-bank start/resume/timeout/completion journey and completed-result teacher browser journey remain release checks. Section 4 of the mirror plan remains in progress; surface completion is not bank release.

Verification fixtures, their owned accounts/products/bookings and temporary database schemas were removed. Japanese bank, attempt and response counts remained zero. The task-owned preview server was stopped and port 3100 released; this documentation pass started no background process.

Pre-existing drift is reported without repair or canonization:

- `PRODUCT.md` still describes an English-only product and frozen functionality. The authorized Japanese mirror request supersedes those older scope statements for this extension.
- `DESIGN.md` retains its legacy numbered structure and historical audit snapshots rather than the current canonical frontmatter/eight-section format. `.impeccable/design.json` is absent. This ordinary extension does not authorize a system-format migration or sidecar creation.
- `DESIGN.md` names JetBrains Mono, while the current root font setup and CSS use Geist Mono. The placement surface uses the incumbent sans stack and does not make that unrelated mono discrepancy a new rule.
- The shell's notification glyph and the existing teacher-page Messages/footer overlap remain outside this assessment extension. The assessment route's chat omission addresses its own reading space; it does not authorize a shell redesign.

## Rubric-v1 result copy — 2026-10-23

The shared renderer now handles `basis: jlpt_aligned_rules` without a statistical range and explains unconfirmed reading/construction evidence separately from too few answers. English and Japanese component tests cover both messages; legacy posterior results retain their range. The incumbent typography, spacing, tokens and ruled breakdown remain unchanged. The [rubric verification record](../japanese-placement-rubric.md#verification-and-browser-limits) distinguishes the passing interaction test, English app captures and isolated Japanese component captures from the broader browser suite's unresolved local dashboard/session and locale redirect failures. Current evidence does not extend the earlier finish-review disposition to real-bank delivery.
