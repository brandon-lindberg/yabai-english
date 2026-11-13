# Learning performance audit — 13 November 2026

Status: **audit complete; first memory/resource fixes implemented locally; further optimization and deployment-capacity verification required.**

The findings and baseline measurements below describe the pre-6aj working tree. See the [implementation follow-up](#first-implementation-follow-up) for the current local changes; remaining findings are still open.

Scope: English and Japanese flashcards, dashboard quick review, both placement assessments, and their shared Next.js/PostgreSQL runtime. Impeccable's performance audit and optimization guidance inform the browser/mobile review. This audit adds documentation and isolated diagnostic scripts; it does not add further application changes, change Render settings, or write to production.

## Confirmed outage cause

Render's web-service event at **10:49:40 AM, 13 November**, in the owner's local time, states: **“Ran out of memory (used over 512MB) while running your code.”** The service is `english-platform-web`, instance `rjntf`, on 512 MB RAM / 0.5 CPU. Its memory chart reaches the limit and drops on restart. [Render event and metrics](https://dashboard.render.com/web/srv-d7gvngt7vvec738tmfpg/metrics?t=1h&event=2026-11-13T01%3A49%3A40.616277Z).

This establishes **web-process memory exhaustion** for that failure. Both domains share that process, so both become unavailable. Render's HTML 502 responses also explain Auth.js failing to parse `/api/auth/session` as JSON. The earlier 10:40 health-check timeout alone does not establish its exact cause.

**A PostgreSQL crash has not been established.** The supplied database logs and dashboard show successful connections and ordinary maintenance. Available database metrics displayed “No data captured”; that is missing telemetry, not evidence that database resource usage was normal. The database has 0.25 GB RAM / 0.1 CPU and a 100-connection limit, so unnecessary queries still matter.

The database's slow full-catalog reads at 10:35 came from `japanese-content-deployment`: approximately 2.54 seconds for current Japanese cards and 3.20 seconds for immutable card snapshots. Those were publication verification, not a student's answer request. The publication connection closed successfully at 10:35:31.

The code and local tests below identify mechanisms that can produce excessive runtime memory/CPU work. They do not provide a production heap profile attributing every allocated byte during the outage.

## What was measured

All writes used **disposable schemas in loopback PostgreSQL**, guarded against remote hosts and removed afterward. Real repository content was used: 10,291 Japanese study units, nine English study levels, 2,000 English placement questions, and the released 470-question Japanese bank. Synthetic learner accounts and opaque local sessions were used; no live student answers, payments, Google authorization, or production sessions were exercised.

The current working tree includes the earlier uncommitted Japanese runtime/rollup fix described in plan section 6ah. **These numbers measure that prepared fix, not the currently deployed code.**

### Service measurements

Node 22.17.0, local PostgreSQL, one operation at a time. SQL counts are Prisma-emitted query events inside the measured service operation; HTTP authentication/layout work is excluded. Japanese study measurements open all five levels, exercising an advanced learner's legitimate access.

| Operation | Local wall time | SQL queries | Interpretation |
| --- | ---: | ---: | --- |
| English flashcard overview, cold / warm | 145 / 37 ms | **78** | Repeated per-level reads remain |
| Japanese overview, no saved card history | 12 ms | 11 | Prepared rollup avoids catalog-sized ID reads |
| Japanese 24-card queue, cold | 212 ms | **75** | First provenance load plus individual prompt operations |
| Japanese answer, minimal history | 19 ms | **38** | Many small queries still needed |
| Japanese overview, 10,291 saved card states | 58 ms | 11 | Rollups still transfer all of this learner's saved states |
| Japanese queue, full saved history | 108 ms | 74 | Warm references; repeated prompt checks remain |
| Japanese answer, full saved history | **106 ms** | **38** | Before/after rollups grow with learner history |
| English placement answer, 24 sequential answers | median 63 / p95 68 ms | 8 each | Median process CPU 44 ms; p95 event-loop delay 21 ms |
| Japanese placement answer, 24 sequential answers | median **177** / p95 **193** ms | 13 normally, 17 at completion | Median process CPU **177 ms**; p95 event-loop delay **81 ms** |

The placement percentiles describe one 24-answer local run, not a statistical production SLA. CPU readings include process work and garbage collection. On Render's 0.5 CPU instance, these local CPU-heavy results are particularly important to investigate; they are not a prediction of exact production latency. The test does **not** establish a steady increase in Japanese answer time as the attempt progresses: repeated bank validation is the measured dominant concern.

### Actual production-build HTTP measurements

A fresh `next build` passed, including TypeScript. The first sandboxed build could not fetch Google Fonts; rerunning with network access succeeded. The build used a separate `.next/performance-audit` output directory. No developer server was replaced.

Two fresh `next start` processes were sampled every 100 ms. Each exercised authenticated sessions, English/Japanese queues and answer saves, learning/placement pages, three small bursts of three concurrent read/queue requests, then six English and six Japanese placement answers. The second process resumed the same temporary placement attempts. The server was stopped between runs.

| V8 old-generation limit | Startup RSS | Sampled peak RSS |
| --- | ---: | ---: |
| 4,096 MiB, matching the repository's configured limit | 120 MiB | **624 MiB** |
| 256 MiB, experimental smaller runtime limit | 118 MiB | **499 MiB** |

The earlier flashcard/page-only pass reached 499 / 496 MiB respectively. Adding actual assessment work increased the large-heap run's peak. A smaller old-generation limit helps, but **256 MiB is not yet an approved runtime setting**: it still leaves little margin in this experiment.

These are macOS process-RSS samples, not a Linux container/cgroup test. Platform accounting, young-generation defaults, native memory and garbage-collection timing differ. Sampling can miss brief peaks. The desktop had no 512 MB OS limit, so HTTP 200 here cannot prove the workload survives Render's cap. The experiments support a release gate requiring memory headroom; they do not substitute for it.

In the HTTP runs, Japanese cold queues took 193–237 ms, warm queues 48–62 ms, English answer saves 16–18 ms and Japanese answer saves 21–22 ms. These healthy local latencies coexist with unsafe memory peaks. **Latency and capacity must both pass.**

## Findings and required changes

P0 = release blocker for the current outage; P1 = substantial reliability/latency work; P2 = browser efficiency and perceived speed. Locations refer to this audit's working tree.

### F1 — P0: build heap settings also govern the running service

Location: `render.yaml:35`, `render.yaml:39`, `render.yaml:54`.

`NODE_OPTIONS=--max-old-space-size=4096` was added for builds. The same environment reaches `yarn start`. That permits a 4 GB old-generation heap on a service whose **entire process** must fit within 512 MB. It does not preallocate 4 GB, but permits growth and delayed collection beyond the service's capacity. Local production-build RSS confirms that the prepared fix can still exceed the budget.

Required: scope the large heap to the build command; independently choose and test a runtime limit with headroom for young-generation, native/driver buffers, framework modules and request overlap. Keep the Blueprint and dashboard consistent. Do not simply lower the global setting and break builds, or claim a 256 MiB old-generation limit guarantees a 256 MiB process. [Node's heap documentation](https://nodejs.org/download/release/v22.12.0/docs/api/cli.html#--max-old-space-sizesize), [Render's runtime troubleshooting](https://render.com/docs/troubleshooting-deploys).

### F2 — P0: published Japanese flashcard content is used like an authoring dataset

Locations: deployed `japanese-service.ts` prompt preparation; prepared `apps/web/src/lib/study/japanese-service.ts:81` and `japanese-runtime-source.ts:28`.

The deployed queue loads and compiles all 10,291 full records and publication provenance to deliver at most 24 normal questions. Previous local work now schedules lightweight IDs first, loads selected cards plus at most 96 distractor records per requested kind, and parses each loaded record once. That reduces full content to at most 216 records for a normal mixed queue, or 242 for a 50-card queue.

Remaining: a cold reference-cache miss still retrieves approximately **12.6 MB of provenance JSON**, then retains only its reference index. JSON bytes understate peak allocation during database decoding and parsing. The cache coalesces reference loads for one database client/snapshot; it does not eliminate the cold allocation, nor all overlapping request allocations.

Required: derive a compact, versioned runtime reference projection from the existing publication pipeline. Runtime reads should retrieve only the small evidence needed for selected cards, with the existing snapshot/digest/source checks preserved. Full authoring provenance and immutable archives remain available for audits. Avoid caching the entire compiled catalog as a shortcut: that trades allocation spikes for a large permanent footprint.

### F3 — P1: Japanese answers recompute whole-track progress and rewrite unchanged milestones

Locations: `japanese-service.ts:51`, `:155`, `:184`; `japanese-progression.ts:44`; `study-flashcard-stats.ts:123`.

Saving one answer reads progression before and after the write, including all saved card states in the track; the shared review writer rereads state and takes the same learner lock; `saveMilestones` upserts every unlocked level even when nothing changed. Queue issuance also checks/creates prompts individually. The five-level test measured 38 queries per answer and 74–75 per queue. Full learner history increased answer time from 19 to 106 ms locally.

Required: share one authorized request context, calculate only the changed card/level delta under the existing transaction, persist only changed mastery/unlock milestones, and batch prompt reads/creation. Aggregate database-side where semantics permit. Preserve the single learner lock, automatic grading, immutable prompt binding, exact-retry receipts, atomic XP and level unlocks. More `Promise.all` inside one PostgreSQL transaction does not create extra connections or parallelize its single connection.

### F4 — P1: English overview repeats the same work for nine levels

Locations: `get-overview.ts:55`, `access.ts:15`, `mastery.ts:3`.

Each level separately rereads track/access/profile/progress/assessment data. `computeLevelMastery` counts cards, then loads every ID, then counts states using those IDs. The prepared shared rollup improves one part of the overview, but the other repeated calculations still yield **78 SQL queries**.

Required: batch track/profile/progress/assessment reads and use grouped counts through relations. Share data-access/rollup primitives with Japanese where appropriate, keeping each language's existing mastery/access rules explicit. Do not accidentally replace English's existing touched-card/exit-assessment behavior with Japanese's stricter mastery semantics.

### F5 — P1: English queues and answer saves retain unnecessary catalog reads

Locations: `apps/web/src/app/api/study/queue/route.ts:98`; `apps/web/src/app/api/study/review/route.ts:48`; `mastery.ts:16`.

The queue retrieves every full card/exercise in the selected level before selecting 24. The largest checked-in English level contains 672 cards. Distractor construction repeatedly scans the pool for selected questions. Saving an answer rereads access, calculates total XP twice, then repeats whole-level mastery reads; the mastery update occurs after the main review transaction.

Required: schedule metadata first, use a bounded suitable distractor pool, and reuse the authorized context and saved progress to avoid repeated totals. Keep MCQ, reorder and multi-step grading behavior. Consolidate progress/mastery calculations safely without changing payment or booking transactions. The fast localhost answer timing is not a reason to retain unnecessary remote database work.

### F6 — P1: English placement repeatedly transfers, parses and hashes its full bank

Locations: `english-placement/service.ts:21`, `:63`, `:144`; `placement-bank/placement-bank-access.ts:46`.

The snapshot JSON is approximately **1.99 MB**. Attempt reads and updates include the full snapshot. A normal answer validates/hashes it to grade, then the returned view validates/hashes it again to choose the public question. The separate authoring-bank cache does not remove this snapshot work and does not coalesce concurrent cold loads.

Required: retrieve attempt state plus lightweight snapshot identity; validate an immutable snapshot once into a bounded, coalesced cache keyed by identity/digest/version and database ownership. Use a question index and pass the validated context through the request. Fail closed on invalid snapshots. Never cache learner attempts, suspension decisions or timer eligibility globally. Preserve current revision conflict handling, server-owned expiry, scoring, insufficient-evidence rules and cooldowns.

### F7 — P1: Japanese placement repeats validation and response replay within each request

Locations: `japanese-placement/service.ts:22`, `:63`, `:79`, `:174`; `japanese-placement/attempt.ts:61`, `:96`, `:106`.

Every submission retrieves the 470-item snapshot and prior responses, validates the bank, then the attempt helpers parse/hash/approve it again. After saving, the service reloads the snapshot/responses and repeats work to generate the next view. Snapshot JSON is approximately **645 KB**. The local CPU cost and event-loop delays are much greater than the tiny public question payload warrants. Completed-result reads also fetch an unused bank.

Required: use an independently versioned Japanese validated runtime context, bounded immutable caching, indexed item selection and one request-scoped replay/calculation. Read completed results with a lightweight projection. Share cache/measurement infrastructure with English, while retaining **separate Japanese and English assessment engines, banks, routing and grading**. Recheck revocation metadata on requests; cached content must not bypass revocation, learner access or current policy compatibility.

### F8 — P1: realtime stream cancellation can leak a timer and listener

Location: `apps/web/src/app/api/realtime/stream/route.ts:32`.

An isolated audit regression cancels the response body, advances one heartbeat and then aborts the request. Expected: one unsubscribe and zero timers. Actual: **zero unsubscribes and one remaining timer**. There is no stream `cancel` handler. An enqueue failure sets `closed=true`, after which `cleanup` returns without releasing resources. This is a reproduced resource-release bug; its contribution to the production outage has not been measured.

Required: use one idempotent cleanup routine for body cancellation, request abort and enqueue failure, separating “closed” from “resources released.” Test repeated mobile reconnects, normal aborts and enqueue failures. The existing client already shares one SSE connection per tab and the 25-second heartbeat performs no database query; retain that design.

### F9 — P2: Japanese dashboard quick review refreshes the full page after every answer

Locations: `dashboard/dashboard-japanese-quick-review.tsx:42`, `study/use-japanese-study-session.ts:92`.

The answer response already supplies XP, mastery and unlock information, but the callback also calls `router.refresh()`, repeating dashboard server reads. This applies to dashboard quick review; ordinary Japanese practice does not supply this callback.

Required: update current review/analytics from the saved response, or refresh the narrow recap once on completion. Do not replace acknowledged saves with optimistic grading. Separately, English practice intentionally waits 900 ms to show feedback (`study-practice-session.tsx:111`); distinguish that readable feedback delay from network latency before changing it.

### F10 — P2: shared page payloads and eager chat add avoidable mobile work

Locations: `apps/web/src/app/[locale]/layout.tsx:45`, `:52`, `:72`; `components/app-chat-panel.tsx:3`.

Every page passes the complete locale dictionary to the client, including unrelated admin/legal text. Chat is statically imported into the shared shell; Japanese placement hides it, while English placement still mounts it. Measured uncompressed HTML was approximately **147 KB** for the landing page, **148–151 KB** for ready placement pages and **179 KB** for the Japanese flashcard hub, before external JS/CSS/fonts. This is not the compressed network transfer total or a browser rendering score.

Required: scope client translation messages by shared shell and route, defer chat until appropriate/needed, and keep assessment pages lightweight consistently. Profile the resulting JS, hydration and font requests on mobile. Existing Japanese fonts use swap, unicode slices and no blanket Japanese font preload; preserve those deliberate choices unless measurements identify a problem.

### F11 — P2: English placement focus recovery can duplicate expensive reads

Location: `components/placement-quiz.tsx:83`, `:125`.

Both `focus` and `visibilitychange` can call the same loader before React's loading state prevents a second call. There is no synchronous in-flight guard or request cancellation. Japanese's controller already coalesces overlapping recovery requests.

Required: adopt a shared request-serialization pattern with an abortable owned request, while preserving each assessment's separate state machine and uncertain-save recovery. Test paired mobile resume events. Both timers already rely on server-issued expiry; neither needs database polling every second.

### F12 — P1: health and resource telemetry do not distinguish bottlenecks sufficiently

Locations: `render.yaml:40`; `apps/web/src/lib/prisma.ts:8`; shared API/service boundaries.

The health check uses `/`, traversing routing and a page shell that can depend on authentication/database work. The pool uses driver defaults without explicit app-level connection-wait limits or pool-wait telemetry. We do not yet have request duration, process RSS/heap, event-loop delay, pool wait and slow-query evidence correlated by request ID. Production database metrics were unavailable during this audit. Connection exhaustion and a missing-index root cause are **not confirmed**.

Required: add a cheap liveness route, bounded dependency timeouts, and low-overhead sampled/threshold logging for the four learning paths. Measure actual pool counts across the production bundle before changing client lifetime; the source alone does not prove duplicate production pools. Check `EXPLAIN (ANALYZE, BUFFERS)` on the final batched queries using realistic histories before adding indexes. Existing user/card, user/level, deck/order and attempt indexes already cover important access paths. [Pool defaults and wait metrics](https://node-postgres.com/apis/pool).

Do not hide the problem by extending health-check timeouts, disabling checks, increasing retry frequency or running minute-by-minute full-content probes.

## Implementation order and acceptance gates

1. **Stabilize memory first:** finish the compact Japanese runtime data path, separate build/runtime heap budgets, and fix stream resource cleanup. Keep the earlier bounded-catalog/rollup changes. Measure a fresh production process, cold loads and mixed requests before the owner pushes.
2. **Make saves and queues bounded:** batch Japanese prompt issuance; remove duplicate track scans/milestone writes; batch English overview/access/mastery reads; restrict English queue content. Keep shared infrastructure and domain-specific learning rules.
3. **Optimize both placement runtimes:** bounded immutable bank caches, lightweight reads, request-scoped validation and indexed routing. Preserve separate banks, engines, versioning, timing and result semantics.
4. **Reduce mobile/page work:** targeted quick-review refresh, route-scoped translations, deferred chat and serialized English focus recovery. Use Impeccable for interaction/style decisions; retain keyboard access and readable feedback.
5. **Verify under deployment constraints:** run production-build mixed journeys with full content, new and established learners, cold/warm caches, same-user retries and several different learners. Then verify on the actual Render instance and mobile/desktop after the owner deploys. No paid cache or additional service is required for these code improvements.

Every implementation section follows **TDD red → green**, then the applicable existing integration regressions. Test actual overfetch/query limits, cache ownership/coalescing/eviction, corrupt/revoked snapshots, concurrent saves, rollback, retry receipts, unlocks, timer/cooldown boundaries and SSE cleanup. Add shared helpers where behavior is genuinely common; do not duplicate services or merge the two assessment systems.

Proposed release gates, to adopt and measure rather than claim already passed:

| Area | Gate |
| --- | --- |
| Capacity | No OOM/restarts/502s; target peak process RSS below 400 MiB on the 512 MB service, with stable memory after repeated sessions/reconnects. Include cold loads and concurrent different learners. A smaller heap flag alone does not pass this gate. |
| Server latency | On the deployment instance, target warm learning APIs p95 ≤300 ms; cold queue/start p95 ≤1 second. Record database/pool/CPU time separately. Use enough runs to make percentiles meaningful. |
| Query/data shape | No full-catalog content or authoring-provenance reads in ordinary learning requests; no repeated whole-bank validation per answer; queue prompt work batched; overview queries do not grow per level; answer work does not scan the whole learner history twice. |
| User interaction | Immediate visible pressed/saving state; retain the selected answer during a slow save; acknowledge a confirmed save clearly; retries cannot double-award XP or answers. |
| Mobile/desktop | Test a narrow phone viewport, constrained CPU/network, touch interaction, tab suspension/resume and desktop keyboard input. Target LCP ≤2.5 s, INP ≤200 ms, CLS ≤0.1 at p75, separated by device class. [Google's Core Web Vitals definitions](https://web.dev/articles/vitals). No Core Web Vitals score or real-phone pass is claimed in this audit. |

If the minimum measured workload cannot retain headroom after this work, service capacity must be revisited. We should first eliminate the demonstrated unnecessary work; an upgrade is not a substitute for those fixes.

## Verification and handoff

- Fresh isolated production build and TypeScript passed.
- Full real-content service benchmarks completed; both 24-answer placement attempts completed and graded in disposable local schemas.
- Two production HTTP processes returned successful responses for the measured learning flows; capacity is **not** approved, for the reasons above.
- SSE cleanup regression is intentionally **red**, reproducing F8. It is an ignored audit diagnostic, not a newly introduced failing CI test.
- The earlier application fix's full unit/study/database checks remain recorded in plan section 6ah; this documentation-only audit did not rerun every unchanged test or claim those checks fix F1–F12.
- Diagnostic scripts/results are local ignored artifacts under `apps/web/.impeccable/study-runtime/`; they contain synthetic identifiers and measurements, not production credentials. Production builds are isolated under `.next/performance-audit`.
- All task-owned benchmark/build/server processes exited, port 3173 was released, and disposable database schemas/connections were cleaned up. Render settings and user-started processes were left alone. Nothing staged, committed, pushed or deployed.

## First implementation follow-up

Plan section 6aj implements the first part of F1/F2 and fixes F8 locally, using red/green tests. It does not close the overall capacity gate or the remaining flashcard/placement findings.

- `StudyCatalogReference` holds a seven-field immutable projection indexed by snapshot/reference ID. One PostgreSQL function serves the migration backfill and the trigger for future imports. The runtime fetches required rows only; it no longer downloads publication provenance or retains the entire reference index. Missing, malformed or duplicate evidence fails closed. Cards and publication digests are unchanged.
- The additive, transactional migration has been tested and applied to **localhost**, producing 16,586 validated reference rows. A representative N5 vocabulary batch requires 127 rows / 23,346 JSON bytes. Production still requires this migration through its existing pre-deploy command; no content seed or re-publication is needed.
- The production start command explicitly caps old-generation memory at 256 MiB and semi-space at 2 MiB, even if Render still has the former large `NODE_OPTIONS`. The Blueprint moves the build allowance into its build command. When deploying, verify Render's build command is `yarn install --frozen-lockfile --ignore-engines && NODE_OPTIONS=--max-old-space-size=4096 yarn build`, pre-deploy remains `yarn prisma migrate deploy`, and start remains `yarn start`. If the Blueprint does not synchronize these fields, the owner must update them in the dashboard. Remove the old global build-only `NODE_OPTIONS` once the scoped build command is in place. No Render configuration was changed by this task.
- Stream cancellation, abort, already-aborted requests and enqueue failures now share one resource cleanup path. The cancellation regression that was red during the audit is now covered by green tracked tests.

The repeated short production-build workload at the configured runtime limits peaks at **474 MiB RSS**, versus the baseline 624 MiB; cold Japanese queue time falls from 193–237 ms to **92 ms**. All measured requests succeed, with warm Japanese queues at 49–76 ms and English/Japanese answer saves at 16/28 ms. These are local macOS measurements, not production guarantees.

Additional complete 24-answer runs for both languages, using fresh processes/learners, compare two experimental limits:

| Old-generation limit | Peak RSS | Peak sampled heap used | Median / maximum Japanese answer time |
| --- | ---: | ---: | ---: |
| 192 MiB | 436 MiB | 179 MiB | 257 / 294 ms |
| 160 MiB | 420 MiB | 155 MiB | 350 / 380 ms |

Both experimental limits finish the tests, but neither meets the RSS target; the smaller limit leaves very little JS headroom and worsens answer latency. The implementation retains 256 MiB. **The 400 MiB capacity target remains unmet.** Next remove duplicate flashcard progress work and repeated placement-bank allocations rather than squeezing the heap further.

After implementation, 3,485 full unit tests, 232 study checks and 22 isolated PostgreSQL study checks pass. TypeScript, focused lint and the final production build pass. Temporary test resources and servers have been cleaned up; the local derived reference table remains as the intended application migration. Nothing staged, committed, pushed or deployed.
