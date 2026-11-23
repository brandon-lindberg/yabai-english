# Achievement performance audit

**18 November 2026 · `badges` · baseline `f334a2b`**

The interactive learner gallery and popup run from the design preview. The application diff from `master` contains the flashcard shuffle fix and its tests. The Next.js routes, public assets, locale bundles and Prisma schema have no learner or teaching achievement system wired into them. English study already has a separate rank-up notification. **The gallery optimization is locally verified. Award-processing latency and Render memory headroom are still unmeasured.** [Learner design](design/achievements/README.md) · [Teaching scope](teacher-achievements-plan.md)

**19 November update.** The dashboard now links to the learner gallery at zero badges. Award reconciliation runs on a gallery visit, scoped to the current learner and subject. Answer saves and ordinary dashboard loads perform no additional achievement queries. Each gallery page displays at most eight artworks. The measurements below describe the earlier offline preview.

### Local application measurements, 19 November

- Chromium opened the English gallery at 1280×844 and the Japanese gallery at 390×844. The dashboard requested zero badge images. The first gallery page contains eight native PNGs totaling 112,668 bytes. Hidden works have no public image files.
- With 10,000 fixture cards across two subjects and five accounts with 0, 2, 68, 2,500 and 10,000 graded states, 100 warm gallery reads used four SQL statements per visit. The service-level p95 was 2.8 ms on local PostgreSQL 17. For the largest account, ordering the capped count by card ID used the existing account/card index and reduced shared buffer hits from 6,961 to 837. The limit stopped at 1,000 qualifying cards. The booking fixture in that query-plan run was empty.
- Five synthetic signed-in learners fetched 100 full gallery documents on the local Node 22 production build. Scoping the gallery's client translations to dashboard navigation reduced the largest uncompressed English HTML response from 143,962 to 62,021 bytes. PostgreSQL and the service ran on the same macOS machine. Local timings exclude Internet and mobile-device latency.
- Repeating the test with the configured `yarn start` heap settings gave a 38 ms median and 47 ms p95 over 100 warm gallery requests. The first five measured requests took 56–62 ms after the browser smoke tests. Sampled server RSS peaked at 358 MiB and was 340 MiB after two seconds of idle time. The interleaved dashboard, health and authentication checks succeeded. Render memory and latency still require deployment validation.

## Measured gallery cost

Chrome 157 on macOS arm64 opened a fresh synthetic collection at 390×844 in Japanese and 1280×844 in English. The browser received the real preview files from disk through Playwright. Each row counts distinct requested native badge PNGs and their source bytes, excluding the header icon, scripts, CSS and HTTP overhead. Both widths gave the same results. These measurements establish the amount of artwork requested. Device latency and server RSS require separate measurements.

| Collection on opening | Before | After |
| --- | ---: | ---: |
| Three earned badges | 3 images · 39,585 bytes | 3 images · 39,585 bytes |
| All 36 publicly visible badges earned | 36 images · 506,277 bytes | 9 images · 130,173 bytes |

**Fixed.** The earned gallery rendered every collected piece immediately, and “Show more” on the catalogue rebuilt every preceding tile. Both views now use eight-tile pages. The earned gallery adds one featured piece. Grid art loads lazily, paging moves focus to the first tile, and the popup requests a thumbnail. The full visible collection took **74.3% fewer native artwork bytes on opening**. Visiting every page intentionally still loads the complete collection. [Pagination](design/achievements/preview.js) · [Repeatable browser check](design/achievements/check-gallery.cjs)

The browser check reached all 36 visible works in each view, checked adjacent pages for duplicates, exercised phone tap navigation, category filtering, an empty second subject and returning to the saved card after viewing a popup. The 39 masters total 550,666 bytes. The 39 thumbnails total 263,357 bytes. The 14 design-review sheets alone total 4,688,223 bytes and belong outside the public application bundle. The preview loads a 15,656-byte bilingual visible catalogue. Keep that dependency out of the production study shell.

## Risks when connecting the production feature

| Priority | Evidence in the existing app | Implementation decision |
| --- | --- | --- |
| High · answer saves and retries | Both languages update progress under a per-learner transaction lock. Japanese stores the result by prompt ID. The English review request accepts a card and answer without an attempt receipt. A history scan inside this lock extends the wait for the learner's next request. A retry can also repeat progress work. | Reuse the existing before/after card and XP values. Record a stable fact once per accepted attempt. English needs an identity that survives retry and distinguishes a legitimate repeat of the same card. Evaluate only affected thresholds. Return newly granted IDs with the confirmed answer. Separate artwork, fan-out and historical reconciliation from the save. [Shared save](../apps/web/src/lib/study/review-progress.ts) · [English reviews](../apps/web/src/app/api/study/review/route.ts) · [Japanese receipts](../apps/web/src/lib/study/japanese-service.ts) |
| High · lesson and dashboard history | The student dashboard reads matching bookings with teacher, product and refund data. Its display grouping treats past non-cancelled bookings as completed, which also admits pending payments. Calling this helper to count awards would repeat a growing read and miscredit lessons. | Maintain a small scoped award summary and read only recent awards for the dashboard. Process due lesson credits from bounded, restartable work using current status and end time. Credit each eligible seat to its learner and each group occurrence once to its teacher. Recheck cancellations and reschedules. Backfill separately, in pages. [Booking query](../apps/web/src/lib/dashboard/student-bookings.ts) · [Display grouping](../apps/web/src/lib/dashboard/booking-groups.ts) |
| High · popup fan-out and missed events | The app already shares one authenticated event stream per tab. Its generic notification event makes each subscribed bell fetch the latest 20 notifications plus an unread count. The bus is process-local and has no durable replay. Emitting one generic event per badge would multiply the requests across tabs and simultaneous unlocks. | Reuse the stream with a dedicated, compact, batched award event. Deduplicate by award receipt across the save response, stream and reconnect. Use cursor-based catch-up after disconnects and process restarts. Cap slow-consumer backlog and summarize overflow. Preserve the existing heartbeat and disconnect cleanup. [Realtime client](../apps/web/src/lib/realtime-client.ts) · [Stream](../apps/web/src/app/api/realtime/stream/route.ts) · [Notification query](../apps/web/src/app/api/notifications/route.ts) |

Use database-enforced uniqueness for both the credited fact and the award, scoped to the account, role and applicable learning subject. Keep historical counters beyond the final visible tier. For recent awards and due lesson work, capture the actual SQL and inspect `EXPLAIN (ANALYZE, BUFFERS)` on disposable fixtures before choosing indexes. The 18 November baseline contained no production achievement queries.

## Release evidence still needed

- Compare baseline and feature-enabled production builds on the same data and hardware. Run five distinct learners across both subjects, with sparse and long histories, simultaneous answers, a group class ending, two tabs reconnecting and a historical award backlog.
- Record p50/p95, query counts and rows, pool and admission waits, bytes, peak process RSS, container memory and recovery after idle. Include an ordinary answer with no unlock, one unlock, several unlocks, and a retried answer. Verify the ordinary save causes zero extra browser requests.
- Apply the existing targets of warm learning API p95 ≤300 ms, cold queue/start p95 ≤1 s and peak process RSS <400 MiB on the documented 512 MB service. Check health and authentication during load. A lost answer, duplicate award, unexplained 502 or restart fails the run. [Performance policy](performance-policy.md) · [Render procedure](render-learning-capacity-test.md)

The 33 existing realtime client, bus, stream and notification-bell tests passed locally. They exercise subscription sharing and disconnect cleanup. They provide a baseline for adding achievement delivery. The preview uses local sample progress and never performs an award transaction.

## 23 November verification

- The isolated database fixture persisted all 39 awards in each learner subject and all 11 teacher awards. Threshold tests cover live card, mastery, rank and calendar rules. Chromium verified the learner mastery and hidden teacher note popups.
- Five concurrent signed-in learners kept the shared realtime streams open on the local Node 22 production build. Over 75 warm answer saves, p50 was 17 ms and p95 was 28 ms. Five cold queue preparations had a 63 ms p95. The largest sampled server RSS was 315 MiB. Session, dashboard and health requests succeeded throughout four practice rounds.
- The daily review write uses one learner/subject/day key and retains at most five card IDs. The calendar worker reads activity dates in pages of 256 and leases up to 12 due jobs at a time. The smoke tests used disposable PostgreSQL on the same Mac. Render memory and capacity remain unmeasured for this change.
