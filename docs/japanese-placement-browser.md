# Japanese assessment browser verification — 2026-10-23

The published version-3 bank now passes the complete local student/teacher browser path. The earlier dashboard/sign-in and Japanese-locale failures were reproduced, traced to the local preview origin configuration, and resolved. Browser testing also found and fixed loss of an unfinished sentence after reload. This completes the local assessment journey work in section 4; production activation remains a separate deployment operation.

## Reproduced failures and narrow fixes

Two new browser regressions first failed: an authenticated dashboard lacked its assessment entry, and `/ja/japanese-placement` entered a redirect loop. Server diagnostics established that the browser started on `127.0.0.1`, while the journey callback redirected to `localhost`; the dashboard then received no session cookie. The explicit `--hostname 127.0.0.1` preview also caused the default-locale rewrite to be handled as another network request, which redirected to the original path again.

The installed Next.js URL implementation normalizes loopback hostnames to `localhost`. The preview binding and ignored test override disagreed with that origin. This matches the mechanism documented in [Next.js issue #94745](https://github.com/vercel/next.js/issues/94745); the conclusion here is supported by the actual request headers/redirects and red/green browser runs, not solely that report.

The checked-in shared mirror Playwright configuration now starts its own preview using `localhost:3100`, matching its browser base URL. Explicit process-only environment settings enable the existing dev credentials provider and disable OAuth for these local tests. It refuses to reuse an occupied port and shuts down its process group gracefully after success/failure. No authentication, locale-routing, Google credential file or production provider behavior was changed. Temporary diagnostics were removed.

The actual-bank journey then found that sentence tiles survived a focus refresh but disappeared after a full page reload. The existing `useSessionDraft` hook now stores the unfinished selection per attempt/question in tab-scoped session storage. Stored selections must contain distinct, currently supplied tile IDs; malformed, duplicate and unknown values are discarded. Another attempt cannot inherit the draft. Storage failures preserve the existing in-memory interaction.

The assessment clears the draft only after the server confirms that the question/attempt has advanced or completed, including successful retries and expiry recovery. A failed save retains it. One shared storage-clearing helper and one Japanese draft-key function avoid duplicate persistence logic. No timer, server progress, answer key, free-text response or level calculation is stored in this draft. Component tests demonstrated red/green for reload restoration and cleanup after an uncertain save/retry. The visuals and controls retain the incumbent design system.

## Actual application evidence

The real-bank browser test uses the existing catalog compiler privately in the test runner to choose answers. It never sends answer keys into the browser or intercepts assessment responses. It verifies:

- Dashboard entry, explicit start, 24 questions, a 1,200-second budget and server-owned deadline.
- Progression through N3/N2/N1 reference tasks for an all-correct mechanics profile; one response per reading passage and no private metadata in API views.
- Choice clicks and keyboard sentence assembly, reload resume, unfinished-tile restoration across reload and English/Japanese locale switches, with the deadline unchanged.
- An immediate provisional N1 result for that mechanics profile, saved and identical after refresh. This demonstrates application behavior, not measured learner accuracy.
- The eligible Japanese teacher sees the identical automatic result through the existing private booking. An unrelated English teacher receives 404; another Japanese learner receives 404 for the attempt; an English learner receives 403. Teachers cannot take the student assessment, and guests receive 401.
- The Japanese learner cannot access English placement. Their existing English placement fields remain exactly unchanged.

A separate browser test stages an owned, already-running attempt four seconds before its original twenty-minute deadline. Its deadline is assigned on creation and never rewritten. The actual browser/server clocks and application expiry path finalize it automatically. With no answers it returns insufficient evidence; a late submission returns the already-completed result and leaves the answer count/result unchanged. This fixture avoids waiting twenty minutes and uses no shortened production policy, simulated server clock or published fixture bank.

The remaining browser cases cover the dashboard/session regression, Japanese default-locale routing, the existing intercepted keyboard/resume/timeout contract, and the bounded capture matrix. Empty/unavailable/network and illustrative N3 screenshot states use explicit API fixtures; the N1 teacher captures use the real completed local attempt. No per-student marking, recordings or preliminary teacher review exists.

## Visual verification

Impeccable hardening/craft/polish guidance was applied. The context launcher remained unavailable, including its permitted retry, so PRODUCT.md, DESIGN.md and the surface brief were read directly. The existing ink/paper tokens, Archivo/M PLUS 1 stack, ruled layout and controls were preserved.

The bounded matrix passed **19 full-app captures** at 390, 524 and 1440px across both interface locales/themes, covering intro, choices, sentence tiles, results, expiry, unavailable/network states and actual teacher results. Each capture has a separate fixture attempt identity, so restored draft selections cannot contaminate another capture. Locale/theme and overflow assertions pass. All captures were reviewed together in two contact sheets, with Japanese mobile tiles, English desktop result and the Japanese teacher result also inspected at full size. No style changes or independent reviewer/detector-clean claim is made.

Artifacts are ignored under `.impeccable/review/japanese-placement/`, including `browser-review-captures.json` and `browser-review-{1,2}.png`. Earlier partial/failed runs do not supply the successful verification claim.

## Run locally

Requires the current local migrations and published version-3 bank. From `apps/web`:

```sh
node --conditions=react-server --import tsx scripts/mirror-journey-fixtures.ts create --japanese-placement
JAPANESE_PLACEMENT_CAPTURE=1 yarn test:japanese-placement:e2e
node --conditions=react-server --import tsx scripts/mirror-journey-fixtures.ts cleanup
```

Run cleanup after a failed test as well. The fixture command refuses a second recorded fixture set, restricts writes to local PostgreSQL and records ownership before creating rows. The suite owns its preview/browser processes; it never reuses a user server. The root `test:japanese-placement:e2e` script forwards to this same configuration. Do not use the earlier ignored IP-based preview override.

## Checks and limits

262 Japanese unit/API/component tests, 372 mirror/shared-hook regressions, six Japanese browser tests and six existing mirror browser journeys pass (**646 tests**). The optional landing capture remains skipped in the mirror suite; existing TODO/opt-in database tests retain their status. TypeScript, focused ESLint, whitespace checks and the production build pass. No migration, question-bank content or scoring change is part of this increment. The PostgreSQL/corpus suites were not repeated for this client-state/test-setup change; actual local persistence and authorization were exercised through the browser.

These are Chromium local dev-credentials checks. They do not establish live Google OAuth/payment/calendar behavior, other browser engines or production deployment. Those remain cross-product release checks in section 6. Section 5, Japanese flashcard import/study, has not started.

Cleanup is verified: recorded task processes exited, port 3100 is free and the fixture manifest is removed. Owned users/teacher profiles/bookings/products, application Japanese attempts/responses, temporary test schemas and fixture connections are all zero. The original published bank remains the only active snapshot with its unchanged version/digest. No commit or push was made.
