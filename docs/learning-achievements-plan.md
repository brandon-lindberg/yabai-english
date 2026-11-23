# Learning achievements — product and art plan

The first learner edition has 39 reviewed pixel artworks. The Art Gallery reconciles 16 milestones. Flashcard answers deliver newly earned card and study-rank awards immediately, including the first completed Japanese level. [Open the design preview](design/achievements/index.html) · [Bilingual catalogue](achievement-catalogue-first-edition.md) · [Artwork review](assets/achievements/first-edition/README.md)

## Confirmed direction

- Reward the studying and teacher lessons learners already do, through permanent achievements, visible progress, and brief unlock celebrations.
- English and Japanese have independent collections, progress, streaks, and eligibility. UI language never changes the achievement's learning language. Switching subjects preserves both collections; learning the other language is not a completion requirement.
- Begin with finite achievement tiers, including ceilings of **1,000 distinct studied cards** and **100 completed lessons**. Keep tracking beyond those ceilings so later tiers recognize existing effort.
- Recognize loyalty through anniversaries plus continued learning, with separate cumulative active-day awards. A one-year anniversary is not a 365-day streak.
- Include affectionate, cheeky awards for returning and irregular study habits alongside serious accomplishments.
- **All artwork remains pixel art.** Themes may span joyful platformers, dark fantasy, romantic anime, science fiction, samurai, Japanese seasons, French romance, chibi, and painterly/fine-art compositions translated into pixels.
- When artwork represents the app's mascot, use the white fox from the brand identity. The owner rejected First Spark's chicken-like character; the corrected art has pointed fox ears, a muzzle and fluffy tail. Other approved themed subjects need not all become foxes.
- **39 unique artworks at 128×128 native pixels**, shared by the independent English and Japanese collections: 36 visible achievements and 3 hidden achievements.
- Add an **Art Gallery / アートギャラリー** page linked by an **Achievements / 実績** dashboard tab from the first visit. The gallery celebrates collected artwork; an achievement view also shows visible unearned badges and concealed surprises.
- Localize the entire experience into English and Japanese, independently of the learning subject. Artwork contains no embedded interface text.
- Performance is a release requirement under the [foundational policy](performance-policy.md). This feature must not reintroduce full-history reads, repeated catalog loading, or slow answer saves.

The first-edition count, artwork dimensions, shared-art strategy, subject separation, gallery, bilingual coverage, and automatic lesson-credit rule are settled. Names, final localized copy, theme assignments, and remaining qualification edge cases are covered in the pre-implementation brief. The artwork catalogue provides the proposed 39 stable IDs, English/Japanese titles, unlock text, captions, and scene assignments for review.

## Locked first-edition inventory and sizes

| Item | Decision |
| --- | --- |
| Unique achievement artworks | **39**; one distinct illustration per achievement/tier |
| Available achievements | **39 per learning language**, tracked independently; someone studying both can earn 78 subject-specific awards using the same 39 illustrations |
| Visible before earning | **36**; show subdued artwork, name, requirement, and progress |
| Hidden until earning | **3**: Where Have You Been?, Somehow, You Returned, Consistently Inconsistent |
| Master artwork | **128×128 native pixels**, square, static, lossless, with transparency where the composition calls for it |
| Dashboard / unlock thumbnail | **64×64 display pixels**, using a reviewed 64×64 export of the master; test that the subject still reads clearly at this size |
| Gallery artwork | **128×128 display pixels**; the frame, caption, and hit target are separate interface elements |
| Enlarged artwork | **256×256** initially (2× native); optional **512×512** on sufficiently wide screens (4× native), using the same master and crisp pixel rendering |
| Locked visible treatment | Reuse the normal artwork with a subdued/grayscale presentation and outlined frame; no separate AI-generated locked image |
| Hidden treatment | One shared neutral mystery placeholder, never the hidden artwork's actual silhouette; not an additional achievement or commissioned illustration |

Production scope is **39 original illustrations**, not 39 for each locale or separate images for earned/locked states. Planned delivery derivatives are 39 masters plus 39 thumbnails (78 files), with one reusable UI mystery mark. Lossless format selection and byte budgets are verified from real exports before release; derivative files do not increase the number of commissioned artworks. Enlarged views do not require another art-generation pass.

The earlier 64×64-master proposal is superseded by this confirmed 128×128 specification because the gallery needs room for expressive scenes. Every master still needs a strong focal subject and a legible 64×64 reduction. Review the first approved style samples at all three sizes before batching the remaining art.

## Achievement catalogue: first edition

The first edition contains **39 achievements per language across 12 families**, with a shared evaluation system and subject-specific progress. These are 39 rule/tier definitions, not 78 separately invented rule implementations. Both subjects use the same 39 artworks; present the language in interface text rather than baking it into the image.

| Family | Initial tiers / qualification | Working names |
| --- | --- | --- |
| Cards studied | 1 / 25 / 100 / 250 / 500 / 1,000 distinct cards | First Spark; Pocket Scholar; Century Club; Deck Detective; Paper Dragon; Grand Librarian |
| Cards mastered | 1 / 10 / 50 / 100 / 250 distinct cards that have reached the language's authoritative mastery rule | That One Stuck!; Memory Smith; Mind Palace; Memory Guardian; Archive Keeper |
| Study rank | Rank 5 / 10 / 25 within that subject | Side Quest Enthusiast; XP Magnet; Quest Veteran |
| Curriculum | First study level completed under that language's existing completion rules | Chapter Champion |
| Study streak | 3 / 7 / 14 / 30 consecutive qualifying study days | Small Flame; Seven-Day Spell; Routine Familiar; Flame Keeper |
| Teacher lessons | 1 / 5 / 10 / 25 / 50 / 100 eligible completed lessons | Hello There; I Have Notes; Conversation Party; Dialogue Adventurer; Speaking of Which; Centurion of Conversation |
| Lesson streak | At least one eligible completed lesson in each of 4 / 8 / 12 consecutive calendar weeks | Same Time Next Week?; Regular Character; Season Regular |
| Active study days | 10 / 30 / 100 / 250 total qualifying study days, gaps allowed | Showing Up; Making It a Habit; Frequent Flyer; Part of the Furniture |
| Loyalty | 3 months / 6 months / 1 year since first verifiable qualifying activity in this subject, plus continued activity | Getting Comfortable; Long Story Short; One Year Together |
| Comebacks | Return after 14 / 90 full inactive calendar days, then complete a qualifying study day or eligible teacher lesson | Where Have You Been?; Somehow, You Returned |
| Irregular persistence | 10 qualifying study days spanning at least 30 calendar days, including three study-day returns after gaps of at least three full inactive days | Consistently Inconsistent |
| Study + lessons | Three qualifying study days and one eligible teacher lesson in the same calendar week and subject | Side Quests & Main Story |

Count: 6 + 5 + 3 + 1 + 4 + 6 + 3 + 4 + 3 + 2 + 1 + 1 = 39. The two Comebacks and one Irregular persistence awards are hidden; the other 36 are visible before earning. Named awards for every curriculum level, additional long-term tiers, and seasonal challenges are later catalogue expansions.

Flashcard achievements remain freely earnable. Lesson achievements have their own clearly labeled category. Show study and lesson completion separately so a free learner can see meaningful study progress without needing paid lessons to finish that category. Do not reward money spent, purchase attempts, or booking quantity.

## Qualification and permanence

### Study activity

- A studied-card milestone counts a distinct card after its first valid, server-recorded graded answer; correct and wrong answers both establish practice. Repeating one card does not inflate the distinct-card total.
- A qualifying study day requires completed reviews of **five distinct cards** in that subject. Wrong answers count. Quick-review interactions may count toward participation when the server records their completion; self-reported quick review does not establish graded accuracy or mastery. Map the existing English/Japanese quick-review paths explicitly during implementation.
- Viewing the dashboard, flipping a card without submitting its review, refreshing, or replaying an accepted submission does not advance these counters.
- Mastery awards count distinct cards that have ever met the existing mastery rules, once each. They do not redefine mastery or make rank equivalent to language proficiency. A later wrong answer can change current mastery, but does not confiscate an earned achievement.
- The first gallery visit reconciles previously saved cards whose stats still establish mastery. Later review saves record mastery changes by card and subject, up to the highest published milestone. A fall out of current mastery keeps the card's lifetime credit.
- Placement access is not completion of a study level. Curriculum achievements must use each language's authoritative completion evidence; do not invent a universal percentage to replace its rules.
- Resolve card identity across catalog revisions before implementation. Republishing the same logical card must not create another "new card studied" or "first mastery" award. A new prompt variant is not a new learning unit.

### Lesson activity

- **Owner decision, 18 November:** count a booking automatically when its persisted status is `CONFIRMED` or `COMPLETED` and its scheduled `endsAt` is at or before server time. No new teacher confirmation step is required. Attendance is unverified; an undetected no-show can therefore count. Learner-facing explanatory copy must not imply verified attendance.
- Count once per eligible booking, in the language stored on that booking, regardless of later interface/subject changes. Confirmed free trials qualify on the same basis. A purchase, unpaid pending booking, or future booking does not qualify.
- Exclude cancelled bookings and duplicate/rescheduled-source credits. Rescheduling creates no additional credit; use the retained booking's final scheduled end time. A refund alone does not establish cancellation or attendance; eligibility follows the stored booking status and end time. Define late corrections explicitly: correct eligible totals for future tiers without silently revoking already earned awards.
- Current code finding: `src/lib/dashboard/booking-groups.ts` groups any past, non-cancelled booking as completed, including a possible past unpaid booking. The achievement evaluator must not copy that display grouping as its completion rule.
- Use a durable once-only credit for an eligible ended booking. Attribute lesson-week and loyalty activity to its scheduled end date in the learner's achievement timezone, not the later time at which a reconciliation job or page visit happens to process it. Confirming attendance is outside this edition's agreed scope.

### Calendar, streaks, and loyalty

- Use the learner's persisted timezone, never a device-supplied date or UI locale. Proposed weeks are Monday–Sunday in that timezone. Define DST, leap-day anniversaries, and timezone-change behavior in tests; old credited days must not be reassigned or counted twice.
- Daily study streaks advance only on qualifying study days; weekly lesson streaks advance only on qualifying lesson weeks. No second streak increase for multiple sessions on the same day/week. Earned streak awards remain after a gap; no streak freezes in the first edition.
- Cumulative active-study-day milestones count all qualifying days, including nonconsecutive ones. They recognize people whose schedules do not fit daily streaks.
- A loyalty anniversary starts from the first verifiable qualifying study day or completed lesson in that subject, not signup alone. It unlocks on qualifying learning activity on or after the anniversary; no anniversary polling job is needed.
- Proposed evidence of continued learning: activity in at least **2 distinct months for the 3-month award**, **3 for the 6-month award**, and **6 for the one-year award**. Count within the corresponding trailing 3/6/12 calendar months, including the current month; months need not be consecutive. A qualifying study day or completed lesson counts as activity for loyalty.
- The anniversary definition and these participation thresholds are separate from the confirmed product direction and need approval. A learner who returns after a long absence can earn a comeback award first, even if they have not yet met loyalty participation requirements.
- For comeback/irregularity gaps, **any** valid recorded card review or eligible ended lesson interrupts inactivity, even if the learner has not reached five cards that day. A dashboard visit alone does not. Preserve a return candidate from before the first resumed review so the fifth review can complete the award that day without erasing the earlier gap. Do not label someone inactive merely because their daily sessions were shorter than five cards.

## Cheeky rewards: laughing with the learner

Use humor about the imaginary quest, timetable, or fictional companion. Avoid judgments about intelligence, language ability, financial means, or personal worth. Keep these awards private to the learner by default; no public "most inconsistent learner" ranking.

| Award | Example unlock copy | Art direction |
| --- | --- | --- |
| Where Have You Been? | "Your flashcards started a search party. Welcome back." | A chibi companion holding a lantern and an unnecessarily large map |
| Somehow, You Returned | "The quest log was getting dusty. Your adventure continues." | A tiny knight emerging from a mossy, dark-fantasy doorway |
| Consistently Inconsistent | "Your timetable is abstract art. You still keep showing up." | An expressive pixel-painted calendar with scattered stars |
| Part of the Furniture | "We saved you a seat. It appears to be yours now." | A cozy armchair, book, and loyal little creature |
| I Have Notes | "The notebook has entered its main-character era." | An exuberant anime-style pixel notebook |

Comeback and irregular-persistence awards appear as surprise bonuses rather than checklist instructions to disappear. They are earned only after renewed activity, once per tier, and grant no extra XP, money, or advantage for staying away. Show the exact reason after unlocking. Standard positive achievements retain clear requirements and visible progress before unlocking.

Before earning, a hidden award is represented only by a generic mystery slot in the all-achievements view. Do not show its name, joke, theme, artwork, outline, requirement, or progress. The learner may know that three surprises exist without knowing what they are. After earning, reveal the complete localized achievement and add its artwork to the gallery.

Provide an option to quiet unlock celebrations; keep the earned collection accessible. Localize the joke for English and Japanese rather than forcing literal translations. Final names/copy need a tone review before artwork briefs are locked.

## Expand the catalogue without resetting progress

- The milestone ceilings cap the current **awards**, not the activity counters. A learner with 1,400 studied cards or 125 lessons still has those actual totals.
- Give every achievement an immutable ID and rule version. Store its threshold, family, subject applicability, localized copy keys, visibility, art reference, and release edition as data.
- Keep the earned record permanent with subject, achievement ID, awarded timestamp, and qualifying evidence version. A uniqueness constraint prevents duplicate unlocks across retries, devices, and backfills. Localized names and art may improve without changing achievement identity.
- Add new tier IDs rather than silently moving the goalposts of existing awards. Later 2,500-card or 250-lesson achievements can unlock from the accumulated eligible totals without requiring learners to repeat activity.
- Preserve the completion of the **First Edition** collection. Future editions have separate totals so adding achievements does not turn someone's finished first collection into unfinished work.
- Review possible extensions when real learners approach approximately **800 cards or 80 lessons**. Use an on-demand aggregate/admin report or existing reporting cadence, not frequent per-user polling. Continue counters even if new art is not ready.
- Backfill only what saved evidence proves. Current totals can support some study/rank awards; last-studied timestamps cannot reconstruct every historical active day or streak. Record the actual award time and distinguish reconstructed historical eligibility from a known original earned date.
- Counts and dates must use storage types that support long-lived accounts and exact serialization. Retain small summaries rather than relying on an unbounded in-process map of every historical event.

## Pixel-art worlds and collection identity

The artwork is deliberately eclectic; the navigation, typography, badge sizes, progress labels, and interaction patterns stay coherent with the dashboard. Themes are available to both learning languages. A Japanese learner may earn a sci-fi badge and an English learner a spring-in-Japan badge.

| World | Pixel-art vocabulary | Candidate families |
| --- | --- | --- |
| Sunny platformer | Joyful skies, rounded landscapes, bright collectible objects, original little adventurers | First practice, early milestones |
| Dark fantasy | Worn armor, embers, ruined stone, an absurdly small heroic figure | Mastery, major comebacks |
| Romantic anime | Blushing characters, expressive eyes, sunset light, letters and umbrellas | Loyalty, study + lessons |
| Science fiction | Tiny starships, orbital libraries, holographic books, distant planets | Study ranks, large card milestones |
| Samurai adventure | Swordsmith craft, travel packs, quiet courtyards, windswept travelers | Persistence and level completion |
| Japanese seasons | Sakura, hydrangeas, autumn leaves, snowy lanterns | Anniversaries and lasting habits |
| French romance | Rainy Parisian streets, cafe windows, river bridges, handwritten postcards | Teacher relationships and lesson milestones |
| Cozy storybook | Lush countryside, inhabited little houses, wind and warm window light | Active days and welcome-back moments |
| Cute chibi | Oversized expressions, tiny companions, visual jokes, simple silhouettes | Cheeky surprises and early rewards |
| Pixel fine art | Painterly color groupings, art-nouveau shapes, still lifes, expressive mosaics | Irregular persistence and collection highlights |

Mario, Dark Souls, romantic anime, and Ghibli-like atmosphere are mood references for the brief; develop original characters and scenes that belong to this product. All are rendered as pixel art, including painterly and fine-art themes. Seasonal art is an aesthetic choice, not automatically a time-limited achievement or a reward tied to a learner's hemisphere.

Common asset requirements for the art brief:

- One shared compact-badge silhouette/footprint and consistent visual margins; the internal scene, palette, mood, and drawing vocabulary can vary.
- Create **128×128 native pixel-art masters**, with reviewed 64×64 thumbnails and 128/256-pixel gallery presentations as specified in the locked inventory. Detailed scenes must retain a recognizable subject at thumbnail scale. A separate full-size illustrated-card format is outside this edition's art scope.
- Keep names, numbers, requirements, and language labels in accessible HTML, outside the artwork. Do not regenerate images for translation.
- Make each milestone's art distinguishable by an evolving subject/scene or silhouette, not just a border color. Difficulty is stated by the requirement; a dark palette is not a claim of rarity.
- Preview on the existing light and dark backgrounds. Use explicit dimensions and crisp integer enlargement; review thumbnail reductions separately rather than assuming downscaling preserves every detail. Use optimized static assets and a lightweight reduced-motion celebration.
- Serve immutable/versioned assets locally or through the existing delivery path. Never generate artwork on demand for learners.

## Dashboard experience — Impeccable brief

**Job:** a learner should immediately see recognition of past work and a realistic next goal, then return to studying or lessons. The dashboard remains an operational learning surface; the collection adds delight without taking over the lesson schedule.

- Add a compact **Achievements** section with recent earned badges, one or two attainable next milestones, and the permanent dashboard link to **Art Gallery**. Avoid mounting the full catalogue or its images on every dashboard load.
- The gallery/achievement page shows the current learning subject, earned count by edition/category, and filters for Study, Lessons, Loyalty, and Earned/In progress. Surprise rewards have their own treatment. Switching UI language only changes copy.
- Each standard achievement has artwork, name, exact requirement, and progress or earned date. A detail view can show the joke and a larger image; essential requirements cannot depend on hover.
- An unlock gives a short non-blocking announcement after the server confirms it. Coalesce multiple unlocks from a single milestone/backfill; do not cover the next-card button or steal focus. Backfilled awards get one collection notice, not dozens of toasts.
- Keep next lesson and study actions easy to reach. At phone widths use a compact, touch-friendly arrangement with readable text; on desktop allow more collection browsing. Pagination/lazy asset loading handles later editions.
- Include first-run, nearly-earned, earned, all-first-edition-earned, no-lessons-yet, temporarily unavailable, quiet-celebration, and reduced-motion states. No inference of language fluency from a playful title.

This is a product/interaction brief, not a new visual identity or approved page composition. Extend the existing dashboard with Impeccable; do not replace its global design system with ten themed page skins.

### Real-time achievement popup — owner requirement, 18 November

The owner explicitly requests a subtle Steam-like popup when an achievement is earned, with a brief visible appearance and a click/tap action to inspect it. This is required implementation scope, not an artwork-generation feature or a claim that notifications already work.

- **Appearance:** a compact surface using existing light/dark tokens, a 48–64 px badge, localized “Achievement unlocked” / 「実績を獲得しました」 label, achievement title, and dismiss control. Keep the illustration colorful and the interface consistent. No default sound, confetti, full-screen overlay, or focus theft.
- **Timing:** show immediately after the server confirms a new durable award. Target rendering within 250 ms of receiving confirmation, excluding network/server time. Use about five seconds of visible dwell so the title can be read and the link reached; pause dismissal while hovered, keyboard-focused, or the document is hidden. Respect reduced motion with opacity-only or instant transitions. Otherwise use a short, subtle entrance/exit.
- **Interaction:** clicking/tapping opens that earned achievement's details with the correct learning subject and UI language, preserving study state. The close button is independent. Do not navigate automatically, reset a card/attempt, or change an assessment timer. Announce through a polite live region; the permanent gallery remains available after dismissal.
- **Placement:** verify desktop corner and compact mobile placement against actual study controls, keyboard, safe areas and existing notifications. It must be noticeable without covering answers, Next card, lesson controls, or other primary actions. Small screens must not turn it into a blocking modal.
- **Multiple awards:** display one popup at a time. Bound the queue (initial maximum three individual popups); coalesce overflow into a localized collection notice with a detail/gallery link. Deduplicate by durable award ID across retries, routes, reconnects and tabs. Historical backfills receive one summary. Hidden names/art are sent only after the learner earns them.
- **Delivery:** answer-triggered awards should arrive in the existing confirmed mutation response where possible. Lesson-end and other-device awards require authenticated server event delivery while the app is open, with bounded connections, replay cursors and reconnect handling. Activity-only reconciliation on a later visit does **not** satisfy real-time delivery. Choose and measure the transport and durable lesson-credit trigger during implementation; no constant client polling or database connection per browser tab.
- **Recovery:** awards survive disconnected tabs, missed events and process restarts. Recover unseen awards on reconnect, coalescing old events. Quiet-notification preferences affect presentation only. An on-screen popup cannot appear while the app is closed; catch up on the next visit.
- **Verification:** TDD covers confirmation-before-display, real-time delivery, one-time display, overflow, dismiss/hover/focus behavior, hidden-tab timing, route cleanup, click-through state preservation, locales/subjects, hidden-award filtering, quiet mode and reduced motion. Measure concurrent connections, timer cleanup, payload sizes and latency before declaring this ready.

## Art Gallery: access, browsing, and reveal states

The **Achievements / 実績** dashboard tab opens `/[locale]/dashboard/art-gallery`, named **Art Gallery** in English and **アートギャラリー** in Japanese.

- **Achievements is visible from the first dashboard visit.** The Art Gallery opens on **All achievements** and shows each public work with its localized requirement. Locked works appear in grayscale. Hidden works remain anonymous.
- **Collected** shows full-color earned works, most recently added first. A learner with zero badges can browse the artwork and jump to flashcard practice.
- Each learning subject has its own collection. Opening it checks that learner’s saved card, study-rank, curriculum and eligible lesson records. The date on a retrospective award is the date the artwork was added to the collection. Teaching is a separate planned collection. [Teaching plan](teacher-achievements-plan.md)
- Open an artwork to see the enlarged image, localized title/story, how it was earned, subject, and earned date.
- Gallery presentation should let the art lead while retaining the app's typography/navigation. Use frames/captions as gallery content, not a decorative redesign of the whole dashboard. Pixel-art worlds vary inside the artwork, not in ten different sets of controls.
- On mobile, preserve the artwork's square dimensions with a compact wrapping layout, readable captions, and touch targets. Enlarged artwork must fit the viewport with room for controls and text; keyboard and touch users can inspect details without hover.

| State | Artwork | Information and behavior |
| --- | --- | --- |
| Earned | Full-color artwork | Localized name/story, earned date, requirement; appears in My gallery and All achievements |
| Visible, unearned | Faded/grayscale artwork with outlined frame | Name, exact requirement, readable progress, and explicit locked status; detail view remains accessible |
| Hidden, unearned | Shared anonymous mystery mark | Only localized "Hidden achievement" copy; no title, art, actual silhouette, rule, theme, or progress; absent from My gallery |
| Newly revealed hidden | Full-color artwork after the authoritative award | One brief reveal, then the same permanent earned state as other art |

Never fade the entire achievement's text: the artwork can be subdued while requirements/progress retain accessible contrast. Do not communicate lock state through color alone. Mystery marks are not alternative previews of the real artwork.

Load only visible thumbnails/artwork, with explicit dimensions, lazy loading for offscreen items, and paginated data for later editions. Load enlarged artwork on selection, not preemptively for every badge. The gallery must not add a full-catalog payload to ordinary study or dashboard requests.

## English and Japanese localization

Every learner-facing field needs both locales before release: navigation/page names, achievement titles, flavor text/jokes, requirements, progress templates, categories, theme labels, collection/edition names, filters, empty/error/loading states, locked/hidden labels, unlock notifications, button labels, image descriptions, and screen-reader announcements. Use the existing `next-intl` infrastructure and stable message keys; no concatenated English fragments or words embedded in generated images.

| Concept | English | Japanese working label |
| --- | --- | --- |
| Gallery navigation | Art Gallery | アートギャラリー |
| Earned-art view | My gallery | マイギャラリー |
| Achievement view | All achievements | 実績一覧 |
| Hidden placeholder | Hidden achievement | 隠し実績 |
| Earned state | Unlocked | 獲得済み |
| Visible locked state | Not yet unlocked | 未獲得 |

Names and humorous copy are adapted naturally for Japanese, not translated word for word. The art is shared between locales and learning subjects. Format numbers/plurals through locale-aware messages; display dates using the learner's timezone and selected UI locale.

Verify all four combinations: English study with English UI; English study with Japanese UI; Japanese study with English UI; Japanese study with Japanese UI. Locale switches must preserve earned IDs, progress, gallery access, selected collection, and hidden status. Check Japanese wrapping and phone layouts as well as translation-key completeness.

Hidden achievements need **server-filtered presentation data**, not just CSS concealment. Keep unearned secret definitions and localized strings out of client bundles, serialized page data, API responses, accessibility labels, preloaded images, and client-shipped art manifests. Return only the aggregate number of hidden remaining slots; provide each secret's title, requirement, artwork reference, and localized copy after the learner earns it. Test both locales for accidental spoilers. This is an in-app reveal contract; it does not promise that artwork already revealed to another learner can never be shared outside the app.

## Technical approach and evidence required

The [performance audit](achievement-performance-audit.md) records measured gallery costs, integration risks in the existing save and notification paths, and the release checks for the production award engine.

Reuse the existing shared review persistence and language-specific progression; introduce one achievement evaluator with versioned definitions and subject-keyed summaries. Do not duplicate English/Japanese engines or alter their mastery/access rules for a badge.

- Record accepted learning facts with stable retry/deduplication identity. The English graded-review path needs explicit replay protection for achievement effects; do not assume the Japanese prompt receipt exists for both languages.
- Update only affected small counters/day summaries and inspect candidate thresholds for the event's family. Bound per-action reads/writes independently of the learner's total card/lesson history. A daily distinct-card set can stop growing after the five-card participation requirement is satisfied.
- Record durable achievement work alongside the authoritative mutation. Evaluate expensive reconciliation/backfill in bounded resumable batches, with durable recovery rather than an untracked fire-and-forget promise. Specify the delivery/recovery trigger before implementation; no new always-polling service is assumed.
- Keep rendering, artwork, and notification delivery outside answer-saving transactions. An optional celebration failure must not undo a saved answer; an achievement can be reconciled from its durable fact.
- For lessons, implement the agreed server-side ended-booking eligibility and correction path. Do not trust a browser clock or request-body status. The owner's real-time popup requirement adds a durable lesson-end trigger and authenticated event delivery; bounded, resumable per-user reconciliation on activity/gallery access remains a recovery path, not the primary real-time mechanism. Specify the trigger, transport, indexed lookups, once-only receipts and bounded reconnect behavior before implementation. Do not rescan all historical bookings on every answer or add a minute-by-minute global polling job. Prevent duplicate credits from reschedules/reconciliation retries, and handle delayed/out-of-order credits by the actual lesson end date.
- Paginate collection APIs and return only display data. Index actual lookups such as learner + subject + achievement and learner + subject + day; prove query plans and write cost rather than adding speculative indexes.
- Use stored award evidence for the collected view. The public catalogue is available to signed-in learners with zero awards. Filter hidden presentation data before serialization and message scoping; ordinary client message bundles must not reveal unearned secret names or requirements.
- Backfill from eligible history with checkpoints and batch limits. Never scan every learner/history during a dashboard request or server startup.

Tests must cover language isolation, duplicate/concurrent submissions, multi-device races, one-time mastery, day/week boundaries, timezone changes/DST, gaps/returns including short daily sessions, anniversaries/leap days, confirmed-ended versus pending/cancelled/future bookings, reschedules/refunds, delayed lesson credits, missing historical evidence, edition expansion, and permanent earned awards. Include dashboard navigation before the first badge, zero-badge deep links, switching subjects/locales, visible locked versus hidden representations, server-side spoiler filtering, missing translations, accessible announcements, and phone/desktop art sizing. Follow TDD red/green for implementation.

Before calling the feature ready, measure the changed answer and dashboard paths with full English/Japanese catalogs, sparse/full study histories, long lesson histories (including synthetic accounts well beyond 100 lessons), and five distinct concurrent learners. Compare feature-enabled and baseline latency, query count/rows, memory, and payloads. Include duplicate requests, cold loads, recovery, and paginated later-edition fixtures. Report added per-answer cost explicitly under the performance policy.

## Production sequence and current status

1. The first edition has 39 approved artworks, 36 visible and three hidden. The two learning subjects use the same illustrations and separate award records.
2. The offline design preview covers the dashboard, gallery, first unlock, hidden and locked states, and clickable popup. Sample progress lets reviewers exercise both interface languages and an empty second subject. [Preview guide](design/achievements/README.md)
3. Connect durable learner awards to confirmed answer events for real-time delivery. Use the real dashboard and a mobile practice session to test gallery access, saved answers and keyboard focus before expanding the catalogue.
4. Connect eligible ended bookings and missed-event recovery. Verify idempotency, localization, delivery latency, bounded work, and memory before deployment. [Performance requirements](performance-policy.md)

On 18 November the owner approved the sample styles with a white-fox correction, then authorized the remaining artwork. The complete collection now contains 39 native 128×128 images with 64×64 thumbnails and 256×256 review enlargements. All new images were inspected at those three sizes, and the complete collection was checked on dark surroundings. One extra star in Seven-Day Spell was corrected and rechecked. Native files with provenance total 550,666 bytes; thumbnails total 263,357 bytes. The 36 new images plus correction cost 222 generation units; including earlier sample work, the project total is 246. See the [full review evidence](assets/achievements/first-edition/README.md).

The design preview uses the approved artwork and local sample progress. The live flashcard popup displays confirmed awards in the viewport and opens the Art Gallery in a separate tab. The same popup now receives lesson, calendar, and teaching awards through the existing shared stream. [Preview guide](design/achievements/README.md) · [Independent teaching collection](teacher-achievements-plan.md)

## Award processing

Graded answers record up to five distinct cards per subject and calendar day. A fifth card queues the calendar rules; partial days count only as activity for gaps. Japanese graded dashboard reviews use the same save path. English self-reported dashboard reviews do not supply graded activity. The learner's saved timezone is used when study-day tracking starts and is kept on later study days. The first-level badge uses the English exit assessment or the Japanese mastery rule.

Lesson activity uses saved end dates and status. While the app is in use, the existing shared realtime stream processes due work in small batches. A disconnected learner can see recently issued badges on reconnection and all earned badges in the gallery. Legacy calendar awards can use surviving lesson records. Study days require dated grades from the new tracker because the old per-card totals cannot reconstruct which days reached five distinct cards. Comeback and irregularity gaps use dates from the start of complete activity tracking, so an unknown historical period cannot be mistaken for inactivity.
