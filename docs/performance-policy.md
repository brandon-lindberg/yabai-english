# Performance and release-readiness policy

Adopted: 17 November 2026. Applies to all new and changed application features, shared infrastructure, queries, jobs, and frontend assets.

Performance is a foundational product requirement. Optimize before release and before declaring work ready: design bounded work, measure the implementation, fix material regressions, and report evidence. Monitoring after release complements this process; it does not replace it. The owner reports that the previous performance problems appear resolved and will continue monitoring. This policy does not claim a new production measurement or reopen the historical incident.

## Design for growth before writing code

- Identify the operation's cost as card count, lesson history, concurrent learners, and feature definitions grow. A feature with a finite initial milestone list must still support growing histories without full-history reads on every action.
- Fetch only the required fields and records. Page collections, aggregate in the database where appropriate, and update small counters from committed changes. Never load an entire catalog or authoring archive to render a few cards or save one answer.
- Avoid queries inside per-card/per-level loops and duplicate calculations across server and client. Share infrastructure where behavior is common; keep domain rules explicit.
- Assess new dependencies, generated bundles, images, background tasks, and requests against the user's actual task. Do not add polling when the mutation response or existing event path supplies the state.
- Define performance acceptance criteria before implementation. Use the current production configuration and measured baseline; do not raise budgets to make a change pass without an explicit, recorded capacity decision.

## Database and server requirements

- Inspect actual query shape and returned row/byte counts. For changes to hot queries or growing histories, compare representative `EXPLAIN (ANALYZE, BUFFERS)` plans in an isolated test database before deciding on SQL rewrites or indexes. Raw SQL is not automatically faster. Parameterize it and verify equivalent results.
- Add an index when access patterns and measured plans justify it. Account for write/storage cost and the migration's locking behavior. Production mutations or production `EXPLAIN ANALYZE` are not a routine benchmark shortcut.
- Keep transactions short. Preserve authorization, atomic progress, idempotency, and retry receipts while optimizing. No network calls to art, email, or other external providers inside answer-saving transactions.
- Reuse the process-owned database client/pool. Preserve bounded admission, pool waits, operation deadlines, and controlled overload responses. A busy response is not a successful answer save and must not be counted as one.
- Bound caches by size and lifecycle, coalesce matching in-flight work where appropriate, and define invalidation/versioning. Cache correctness and worst-case memory matter as much as hit latency.
- Bound background concurrency and batch size. Stop timers, streams, subscriptions, and owned tasks on completion, cancellation, disconnect, and failure. A process restart must not be needed to reclaim routine request resources.
- Keep observability sampled or threshold-driven. Log durations, resource measurements, and operation identifiers without answers, credentials, or learner content.

## Browser and mobile requirements

- Keep route payloads and client JavaScript proportional to the visible feature; defer unrelated code and offscreen images. Set image dimensions to prevent layout shifts and use appropriately sized, cached assets.
- Give immediate interaction feedback, keep a learner's selected answer while saving, and reconcile against the server's confirmed result. Do not trade data integrity for an apparently fast UI.
- Update the affected UI from returned data instead of refreshing the entire dashboard after each answer. Prevent duplicate submissions and redundant focus/resume fetches.
- Verify changed interactions at phone and desktop sizes, with touch/keyboard and constrained CPU/network where relevant. Animation must remain lightweight and respect reduced motion.
- Generate achievement artwork during development, then serve static optimized files. Production page loads and achievement unlocks must not invoke PixelLab or another generation service.

## Measurement and budgets

Use the [learning performance audit](learning-performance-audit.md) for historical evidence and [Render capacity procedure](render-learning-capacity-test.md) for the existing controlled test. Historical measurements remain dated evidence, not automatic certification of later commits.

For changes affecting learning runtime, shared request work, or achievements attached to learning:

| Area | Acceptance requirement |
| --- | --- |
| Memory/capacity | Retain the existing working target of peak process RSS below **400 MiB** on the previously documented **512 MB / 0.5 CPU** service; confirm the actual deployed allocation and metric units before testing. No OOM, restart, health timeout, or unexplained 502. Inspect container/platform memory as well as Node RSS. |
| Recovery | Memory reaches a stable range after repeated activity and idle/reconnect cycles; no growing queue, connection, timer, or subscription leak. |
| Server latency | Retain the audit's engineering targets of warm learning API p95 **≤300 ms** and cold queue/start p95 **≤1 second** under representative deployment constraints. Record exceptions and baseline gaps explicitly; the operational procedure's one-second warm-latency investigation trigger is not a substitute for this target. |
| Growth | Hot-path queries and transferred rows do not scale with the entire card catalog or lesson history. Test sparse and large histories, not just a new account. Any intentional growth-dependent operation belongs in a bounded offline/batch path. |
| Browser | Target LCP ≤2.5 s, INP ≤200 ms, CLS ≤0.1; distinguish controlled lab observations from real-user p75 measurements. Do not claim field metrics from a desktop screenshot or a single lab run. |
| Correctness under load | Preserve language/learner isolation, one-time effects, answer persistence, grading, mastery, timers, and payment/booking semantics. |

Performance-sensitive changes need a production build, cold/warm requests, repeated sessions, and at least five distinct simultaneous learners as the initial mixed-workload baseline. Five learners is a test scenario, not a user limit or a promise of unlimited capacity. Include the related dashboard/authentication/health paths. Test deliberate overload separately from normal traffic and label injected failures.

Record commit, runtime version, hardware/container limits, fixture sizes, concurrency, duration, sample count, and cold/warm state. Report request p50/p95 and failures with enough observations to support the statistic, plus query counts, response sizes, peak RSS, recovery, and pool/admission waits as applicable. Streaming latency ends at the usable result, not at response headers. Compare like-for-like baseline and candidate runs; investigate material regressions even when still under an absolute target.

Use disposable, isolated fixtures for local benchmarks and cleanup. A limited, explicitly controlled deployment test can validate hosting limits. Never use real learner activity or paid transactions as synthetic load.

## Release checklist and truthful handoff

1. Identify affected runtime paths and growth risks; if there are none, record why (for example, documentation only).
2. Set the change's baseline and budgets. Run meaningful TDD red/green regressions for behavior, bounded work, and resource ownership where affected.
3. Run appropriate correctness, integration, and build checks; then measure the affected production-build paths at realistic data sizes and concurrency.
4. Resolve material latency, memory, data-volume, and query regressions. Include any new index/migration, cache invalidation, rollback, or configuration consequence in the handoff.
5. State exactly what passed and what was not measured. Use **locally verified**, **ready for controlled deployment validation**, or **verified under deployment constraints** at the supported scope. Passing CI alone does not justify the last claim.
6. If a required capacity/budget check is missing or fails, do not call the feature production-ready. Describe the remaining verification or explicit tradeoff; do not silently waive it.
7. Confirm task-owned processes, ports, connections, and temporary fixtures are cleaned up. The owner retains deployment control.

Verification should be proportional: a text-only change needs content/link/whitespace review; a layout change needs the affected browser checks; a change to per-answer achievement work needs database, concurrency, and memory evidence. Do not rerun broad expensive benchmarks after unrelated edits or add tests that merely restate the implementation.
