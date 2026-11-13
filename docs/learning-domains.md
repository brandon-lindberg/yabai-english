# Learning domains — local setup

Implemented on `the-mirror`, November 5, 2026. One Next.js app, database, auth adapter and payment integration serve both learning paths. This section does not configure Render or public DNS.

## Open the local app

From the repository root, run `yarn dev`. The existing ignored `apps/web/.env.local` now enables these addresses:

| Local address | Learning path | Eventual public address |
| --- | --- | --- |
| http://englishstudiojapan.localhost:3000/en | English | https://www.englishstudiojapan.com |
| http://japanesestudio.localhost:3000/en | Japanese | https://japanesestudio.love |
| http://localhost:3000/en/choose-language | Shared language chooser | Third domain remains undecided; the chooser also exists on each site |

Removing `/en` selects the Japanese interface. Interface language and learning subject are independent. Modern Chromium resolves `.localhost` names to loopback; no hosts-file edit or public DNS change is required. Stop/restart a developer server you already own after changing its environment.

Local previews use Google sign-in with the existing credentials in `.env`. Both local learning aliases send Google to `http://localhost:3000/api/auth/callback/google`. Auth.js then returns the callback to the learning site that started the login. The auth handler uses the configured site origin to distinguish that return from the localhost forwarding step. The localhost callback must be registered on the Google OAuth client. [Auth.js redirect proxy setup](https://authjs.dev/getting-started/deployment#securing-a-preview-deployment), [Google redirect URI requirements](https://developers.google.com/identity/protocols/oauth2/web-server#creatingcred).

## Configuration and shared boundaries

`src/lib/learning-sites.ts` owns the origin allowlist, brands, cross-site links and provider return-origin selection. `LEARNING_SITES_ENABLED` defaults off. Single-host deployments retain their existing behavior until explicitly configured.

The local override is:

```dotenv
LEARNING_SITES_ENABLED=true
ENGLISH_SITE_URL=http://englishstudiojapan.localhost:3000
JAPANESE_SITE_URL=http://japanesestudio.localhost:3000
NEUTRAL_SITE_URL=http://localhost:3000
AUTH_URL=
NEXTAUTH_URL=
AUTH_REDIRECT_PROXY_URL=http://localhost:3000/api/auth
```

The two learning origins must be distinct HTTPS origins, except that HTTP loopback hosts are accepted locally. The neutral origin is optional. Unknown hosts and conflicting forwarded hosts are rejected; navigation URLs are constructed only from the allowlist. Canonical `www` aliases are supported for configured public hosts.

Production's English origin is `https://www.englishstudiojapan.com`, matching the existing public redirect. The Japanese origin is `https://japanesestudio.love`. Public host matching accepts the root and `www` counterpart whichever form is configured, while generated URLs and GET/HEAD redirects use the configured origin. Ports remain part of the match, and local aliases require exact hosts. This also lets a Render health check reach the configured English origin when Render supplies its verified root hostname.

A bound domain wins over a student's saved `User.learningLanguage` and guest cookie for sign-in, onboarding, marketplace, placement, study and dashboard context. Reading a page does not update the saved preference or assessment history. The existing explicit sign-in journey action can still save the student's chosen preference.

## Single sign-in

Select **Sign in** from either learning site. The app restores an active login from the other domain when available. Otherwise it shows the sign-in page with **Continue with Google**. After the visitor selects Google and signs in, the app establishes the session on both sites and returns to the original page or onboarding. Sign-up uses the same confirmation page. The **Change** link can also recover a missing site cookie. The neutral chooser remains a public entry point.

Each domain sets its own host-only cookie. Both cookies refer to the same Auth.js database session, so signing out of that shared login ends it on both domains. A handoff preserves an active login for a different account. Existing independent database sessions for the same account join the new shared session on the next sign-in.

The handoff uses the existing `VerificationToken` table. Each code expires after at most 60 seconds, can be claimed once, and is bound to the configured source, destination and the initiating browser's verifier. The database row references a session ID. The session credential stays out of URLs. The domain callback test uses simulated Google endpoints and runs both localhost callback hops through Auth.js and PostgreSQL. Other browser journeys can use the fixture CLI to create a database session for an owned test user. [OAuth security guidance on authorization codes and browser binding](https://www.rfc-editor.org/rfc/rfc9700.html#section-4.5).

## Learning-site routing

Wrong-subject pages redirect to the correct site. Wrong-subject APIs return 403; POST requests are never replayed across domains. A bookmarked checkout moves to its booking's subject site before payment finalization. Student schedule/history queries filter by the current learning site. Student booking, payment, cancellation and reschedule APIs check the stored booking subject after participant authorization. Shared teacher/admin operations retain access to their existing bookings. The neutral chooser sends users to the learning sites; neutral student page entry points forward to a known subject or the chooser.

The two existing landing pages now use one shared `LearningLanding` implementation. The header, footer, metadata and installed-app manifest use the configured site's product name. Existing design tokens, assets and UI components remain shared.

## Assign teachers in admin

On **Invite teacher**, choose the language(s) the teacher may teach. The form requires at least one explicit selection. To change an existing account, open **All users → user → Teacher profile → Teaching languages**, select English, Japanese or both, then save. Promoting a student to teacher also requires this selection.

`TeacherProfile.teachingLanguages` is the admin's permission. `TeacherLessonOffering.learningLanguage` describes an actual class. `instructionLanguages` describes languages used to explain a lesson; nationality and interface locale do not grant teaching permission.

The shared marketplace predicate requires the assigned language AND compatible active classes/legacy English trial availability. Japanese-only teachers cannot enter English discovery through old unlinked hours. English-only teachers cannot enter Japanese discovery. A teacher explicitly assigned both may appear in both when they have the corresponding classes and meet the existing marketplace requirements.

Teachers can add/edit classes and publish availability only for assigned subjects. Their class dialog offers only those subjects. Admin-granted concessional classes use the same permission check and explicitly name their lesson language. Retired permissions do not delete classes, bookings, payments or history; they stop new discovery/booking through that marketplace.

Migration `20261105000000_teacher_teaching_languages` adds the permission array, backfills it from existing offering subjects, and uses the historical English default only where there is no offering evidence. Database constraints reject empty, duplicate or invalid assignments. Applied locally using the pinned Prisma 7 CLI; all 73 application tables retained every original field value, excluding the newly added permission field. The 11 existing local teacher profiles backfilled to English. No existing local account was manually reassigned.

## Existing integrations

Google sign-in and Calendar/Meet connections reuse the same adapter, client, scopes, encrypted credentials and ownership checks. Stripe reuses the same connected account, direct-charge checkout, fee calculation, webhooks and refund/recovery implementations. Only browser return origins are selected from the initiating site's allowlisted origin. No live provider request or production setting was changed during this work.

Keep `AUTH_URL` and `NEXTAUTH_URL` unset/empty in multi-domain mode: the installed Auth.js request/action helpers otherwise replace the incoming host with that one global URL. Keep the existing shared auth secret. [Auth.js documents host inference and proxy trust](https://authjs.dev/getting-started/deployment).

Before any future public activation, register both domains' `/api/auth/callback/google` and `/api/integrations/google/callback` URLs on the existing Google client; Google requires the sent redirect URI to match a registered value. [Google's OAuth web-server documentation](https://developers.google.com/identity/protocols/oauth2/web-server#creatingcred).

Render/DNS/certificates and provider-domain registration are a separate deployment step. Both custom domains can be assigned to the existing Render web service; no second application or database is needed. [Render custom-domain setup](https://render.com/docs/custom-domains). Apply the new migration through the existing deployment procedure before running the new code. Keep `LEARNING_SITES_ENABLED=false` until the hosts and callbacks are ready. Brandon owns staging, commits and pushes.


The app's invoice and credit-note PDFs identify the booking's learning brand in the footer. Japanese Studio and English Studio Japan both display Yabai Studios as the operator. The teacher is named as the issuer in the header. The shared renderer reads the saved booking subject for branding and the original invoice or refund record for the financial details. English and Japanese PDF labels are independent of the lesson subject.

## Production release: preserve the existing English service

The owner confirms all current production teachers teach English. They must receive `teachingLanguages = ['ENGLISH']` automatically, including teachers with no priced classes or with legacy unlinked trial hours. Do not recreate accounts, require onboarding again, infer teaching subject from nationality/instruction language, or bulk-reset learner preferences/results. Existing English learners, class IDs, availability, bookings, placement results, provider accounts and sessions must retain their original records. Any explicitly selected Japanese learner preference/history also remains intact.

The migration already provides this result for an English-only offering catalog. Do not edit the migration after it has been applied anywhere, and do not replace it with a broad production UPDATE. If the production inventory unexpectedly contains a Japanese offering, stop the release and review that record against the owner's English-only teaching inventory before relying on offering-derived permissions.

Use this release order:

1. **Inventory and backup.** Confirm the actual Render deployment branch, build/pre-deploy commands and environment match the intended release. The checked-in Blueprint uses `preDeployCommand: yarn prisma migrate deploy`; verify the live service matches it. Record the current deploy/environment and take a restorable database backup. Review every pending migration with the project's installed Prisma 7 CLI; do not use `npx` to download a different version. Record existing teacher IDs, offering subjects, visible English teacher IDs, English learner IDs/levels, availability and booking totals. This local audit does not read production.
2. **Prepare the two hosts before cutover.** Complete the domain/certificate and existing Google-client callback registration in the later deployment task. Keep the existing English callback registrations, Stripe secrets/webhook configuration, connected accounts, auth secret and token-encryption key. Keep `DEV_AUTH_BYPASS=false` in production. Local `.env.local` settings are ignored by git and must not be copied to Render.
3. **Release the reviewed app and production configuration together.** Use the public HTTPS origins and activate the domain flag only when both hosts/callbacks are ready. The English production origin must serve the English landing on the first domain-aware release; do not treat the feature-off mirror chooser as proof that the old production English landing is preserved. Leave the optional neutral origin unset until a third host is selected; `/choose-language` already works on each learning domain. Remove the single fixed `AUTH_URL`/`NEXTAUTH_URL` overrides at that cutover, keeping the same auth secret. Render's pre-deploy step must finish all reviewed migrations before the new app receives traffic. The added teacher field/default is compatible with the previous app while it is still serving requests. [Render deploy ordering](https://render.com/docs/deploys#zero-downtime-deploys).
4. **Publish the reviewed Japanese content.** After migrations and the matching app deployment, use the [production content deployment workflow](japanese-study-publication.md#production-deployment) from the local checkout containing the reviewed artifacts. Inspect the explicit production target, publish the pinned question bank and flashcards, then inspect again.
5. **Verify before announcing Japanese learning.** Check the English landing, existing English sign-in/session, teacher listing and direct profiles, old availability and bookings, saved English level, booking and payment return URLs. Compare visible English teacher IDs with the recorded baseline. Confirm every pre-existing teacher is English-only, and that the Japanese marketplace has none of those teachers. Existing hidden/retired/payment-ineligible teachers retain their existing restrictions; do not republish them just to match the total profile count. Register Japanese teachers later through the explicit admin assignment.
6. **Retain the rollback path.** If smoke checks fail, revert to the last working application deploy and its recorded environment. Leave the additive teacher-language column in place; the previous app can ignore it. Do not drop/reset tables or undo historical placement/payment data. Do not rely only on toggling the feature flag to recreate the previous production UI.

The teacher check after migration is read-only:

```sql
SELECT
  count(*) AS total_teachers,
  count(*) FILTER (
    WHERE "teachingLanguages" = ARRAY['ENGLISH']::"LearningLanguage"[]
  ) AS english_only_teachers,
  count(*) FILTER (
    WHERE "teachingLanguages" <> ARRAY['ENGLISH']::"LearningLanguage"[]
  ) AS teachers_to_review
FROM "TeacherProfile";
```

For the current production teaching inventory, `total_teachers` must equal `english_only_teachers`, and `teachers_to_review` must be zero. If not, review the discrepancy before proceeding; the query does not modify it.

Local production-shaped verification passed: an English-only fleet with priced classes, no classes, Japanese instruction/nationality and unlinked trial hours retains every original user/profile/class/availability field, keeps the same English marketplace membership and exposes no teacher in Japanese. The historical pre-mirror migration test also preserves the English learner's saved level and original booking while assigning English defaults. These tests use disposable local schemas; they do not certify an uninspected production database or live provider transaction.

## Verification

TDD logs are retained under the ignored `.impeccable/` directory. Initial red tests reproduced missing domain handling, missing explicit teacher assignment, and an actual database marketplace leak through unlinked trial hours. The migration was tested in a disposable schema before local application.

- `yarn test:mirror`: 865 passing; persistence cases remain opt-in.
- `yarn test:english-placement`: 98 passing.
- `yarn test:japanese-placement`: 291 passing.
- `yarn test:study`: 191 passing.
- `yarn test:domains:db`: 3 passing, including datamodel comparison and actual teacher queries in both directions.
- `yarn test:mirror:migration`: 1 passing, including English learner/booking preservation through the historical upgrade path.
- `yarn test:domains:e2e`: domain browser suite with a disposable schema and owned port 3100 server; tests disable real Google and Stripe credentials. Covers three entry pages, wrong-domain redirects/APIs, both marketplaces/direct teacher denial/forged bookings, the same account on both domains, Japanese placement with a saved English preference, admin editing and promotion, restricted teacher class creation, and desktop/mobile light/dark captures.
- TypeScript, changed-file ESLint and production build passed.

Application fingerprints were unchanged after browser testing. Disposable schemas, QA accounts, database connections and owned preview servers are cleaned up by the runner. No commit, push, public-domain configuration or production publication is performed here.
