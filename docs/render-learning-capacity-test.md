# Render learning capacity test

For ongoing feature and release work, follow the [foundational performance policy](performance-policy.md). This document retains the specific procedure and observations for the learning-performance validation deployment; it is not a blanket certification of later changes.

This is a controlled validation deployment of the learning performance changes. Local checks qualify the code for this test; they do not certify the 512 MB / 0.5 CPU Render instance. Brandon owns staging, commits, pushes and deployment.

## Deploy

1. Commit the complete intended performance batch, including the new untracked source/test files. Let the GitHub checks pass for that commit. With Render set to **On Commit**, a push to `master` starts deployment immediately. To wait for checks first, set auto-deploy to **Off** before pushing, then use **Manual Deploy → Deploy latest commit** after checks pass.
2. Retain root directory `apps/web`, pre-deploy command `yarn prisma migrate deploy`, and start command `yarn start`. The package's start script sets `--max-old-space-size=256 --max-semi-space-size=2`. These are V8 heap controls, not a total RSS limit. The Blueprint scopes the larger build heap to `NODE_OPTIONS=--max-old-space-size=4096 yarn build`.
3. Use health-check path `/api/health`. It is included in `render.yaml`. If changing the path manually, do so once the deployed version serves that route. Verify an HTTP 200 JSON response containing `{"status":"ok"}`. This checks that the process can answer; it deliberately does not query the database. Render health checks require a response within five seconds. [Render health checks](https://render.com/docs/health-checks).
4. Confirm the expected commit is Live. No new environment variable, migration, package, content publication or seeding command is required by this performance batch. Do not rerun Japanese content publication for this test.

## Test in stages

Keep Render's **Metrics**, **Logs** and **Events** open. Record the deployed commit and test start time. Filter logs for `learning_runtime`.

1. Start with one test learner: open cards, prepare a set, answer it, and reload to check persistence. Complete an English placement and a Japanese placement using separate test accounts. Include a phone-width browser and both English/Japanese interface languages.
2. Repeat with **three**, then **five distinct test learners** using separate browser profiles/devices. Mix both subjects. Have them prepare cards together, save answers together, and complete placement tests. Include a learner with existing card history. Five tabs sharing the same account exercise a different, intentionally serialized workload.
3. Run the five-learner mix for **10–15 minutes**, visiting the dashboard and ordinary booking pages as well. Use existing test accounts; avoid real paid bookings or changes to the paying learner's progress.
4. Leave the service idle for a few minutes, then load cards and save again. Check that memory reaches a stable range across repeated cycles, connections recover after idle eviction, and no new restart occurs.

Use DevTools **Network** to capture queue, review and placement request durations. A streamed queue opens its HTTP response before preparation finishes: measure through its final `ready` event, not only time to response headers. An overloaded stream can have HTTP 200 with a final error event carrying status 503.

## What to look for

| Signal | Desired result |
| --- | --- |
| Service memory | Remains below the working target of **400 MiB**, with no upward trend over repeated cycles. Render's service graph and process RSS use different accounting; inspect both. |
| Restarts / errors | No OOM, health timeout, 502, lost answer or duplicate saved answer. |
| Normal five-learner load | No persistent `LEARNING_BUSY` or pool wait backlog. |
| Request time | Warm saves/placement answers generally under one second; investigate p95 above one second and any repeated multi-second pauses. This is a test target, not a measured Render guarantee. |
| Health | Remains responsive alongside learning work. A healthy liveness route alone does not prove the database or learning features work. |
| CPU | Brief peaks may occur; sustained saturation with rising request times is a capacity failure. |

The shared learning gate permits **four active operations**, **eight waiting**, and a **two-second admission wait** per process. Excess work receives `LEARNING_BUSY` before its handler starts; ordinary responses include `Retry-After: 2`. Streaming errors carry their status in the stream. This limits concurrent learning work, not the number of users who may sign in. It is not a request-rate limit or a reservation of database connections. Page rendering, authentication, and unrelated application routes can still use the database outside this gate; English queue access checks run before the heavy preparation gate.

The one shared PostgreSQL pool retains its existing maximum of **10 connections**, with a **three-second checkout/connection timeout** and **ten-second idle eviction**. Active queries and transactions keep their existing semantics and timeouts. A pool timeout does not cancel an accepted transaction or silently retry a write. [node-postgres pool settings](https://node-postgres.com/apis/pool).

Resource records include sampled duration/admission wait, RSS/heap/external memory, pool `total`/`idle`/`waiting`, and work `active`/`queued`/`rejected`/`peakActive`/`peakQueued`. Rejected and peak counters are cumulative since process start. `eventLoopDelayMaxMs` is the process-wide maximum since the preceding emitted record, not latency attributable to that specific request. Healthy records are throttled to one per operation per 30 seconds; slow/error observations can emit after 10 seconds. These are samples, not complete request traces or percentile measurements. Logs contain no learner IDs, answers, SQL, credentials or request URLs. Public health responses contain no resource counters.

If memory rises toward the instance limit, errors recur, or saves become persistently slow, stop increasing load and retain the timestamp, memory/CPU graphs and nearby `learning_runtime` records. Use Render's previous known working deploy if service stability deteriorates. This batch has no schema change to reverse. Avoid destructive database resets or reseeding as a response to an application memory failure.

Only a successful constrained Render run closes the capacity gate. Local macOS throughput and sampled Node RSS cannot establish the Linux container's headroom.
