# Flow audit — teacher, student, organization

Built by enumerating all 57 page routes, mapping each to the flow(s) it serves,
and diffing components that are counterparts of each other across flows.

The duplication I kept missing is on the **flow axis**: the same feature built
twice, once for teachers and once for students, then allowed to diverge. Pattern
scans and `jscpd` do not see this — the two copies are not textually similar
enough to flag, because they diverged in *behaviour*, not just formatting.

## How the flows are served

| | Pages | Notes |
|---|---|---|
| **Teacher** | 15 shared with student | No dedicated route tree; served by role branches inside `/dashboard/*` |
| **Student** | 15 shared + 10 own (`book`, `learn`, `placement`) | |
| **Organization** | 12 under `/org/[orgId]` | Own tree, own components |
| Admin | 8 under `/admin` | Out of scope for the three flows |

**17 pages branch on role.** That is the seam where teacher and student
implementations diverge, and where every finding below lives.

---

## The list

Ordered by user-visible impact. Work top-down, one at a time.

### 1. Completed lessons — teacher is grouped, student is flat ⬅ open

| | Teacher | Student |
|---|---|---|
| File | `teacher-completed-lessons-client.tsx` (211 ln) | `dashboard-completed-lessons.tsx` (122 ln) |
| Grouping | By student, with a per-group count | **None** — flat list |
| Row | Collapsible, opens notes editor | Static `LessonRow` |
| Date | `formatLessonRange` (date stated once) | `formatLessonRange` |

The teacher side was rebuilt to group; the student side was not. A student with
twenty lessons across three teachers gets twenty undifferentiated rows.

**Fix:** one grouped-history component both flows use. Group by counterpart
(teacher for students, student for teachers), then by date within.

### 2. Upcoming lessons — ✅ done

Both already shared `LessonRow`; no regression. Two drifts found and fixed:

- The teacher passed `separator=" - "` while everything else in the app used the
  shared em dash. No comment ever explained it.
- The teacher's row showed **no status**, yet their own cancel button is
  conditional on it — a pending-payment lesson looked identical to a confirmed
  one.

**Deliberate and kept:** payment / invoice / ICS are student-only; learning
goals, calendar recovery and the details link are teacher-only.

**Not grouped, on purpose.** History groups by counterpart; upcoming stays
chronological. "What is coming next" is a question about time, not about who.
Forcing symmetry here would be worse than the asymmetry.

### 3. Dashboard home — two entirely separate returns

`app/[locale]/dashboard/page.tsx` (332 ln) is one file with two complete JSX
trees: a teacher branch (stat ledger, upcoming, profile aside) and a student
branch. They share no layout. Anything added to one silently misses the other —
which is exactly how #1 happened.

### 4. Onboarding — ✅ done

**The pair in this entry was wrong.** `onboarding-form.tsx` (student wizard) and
`teacher-onboarding-form.tsx` (teacher checklist) are not counterparts: one
collects preferences, the other drives you out to other pages. The real
counterpart pair was the student checklist at
`app/[locale]/onboarding/next/page.tsx` — written inline in the route, 212 lines
— against `teacher-onboarding-form.tsx`, 222 lines. Same question in both
flows: *what is left to set up, and how far along am I.*

They had diverged exactly the way the dashboard had. The student list was
rebuilt on ruled rows with a derived completion mark; the teacher list was still
boxes nested inside an `AppCard`, with the progress header and footer band
re-implemented beside it.

Now one `onboarding-checklist.tsx`, hook-free so it renders in the student's
server page and inside the teacher's client form. Call sites 434 → 303 lines.

What is genuinely different, and stays:

- **Row interaction.** A student's row is pure navigation, so the whole row is
  the target. A teacher's carries a checkbox, sometimes a skip button and a
  policy notice, so it cannot be a link at all — it gets an explicit "open".
  Passing `onToggle` picks the second shape. Mutation-tested both ways.
- **Where completion comes from** — see the open question below.

Fixed on the way through:

- The teacher's progress read **"Step 3 of 8"**, promising a sequence these
  steps do not have; they can be done in any order. Now the student's wording.
- The completed mark was a faint hover-grey disc, reading as "slightly
  emphasised" rather than "finished". Now solid ink — the world's settled state,
  the same condensation `Choice` uses for a correct answer.
- `useOnboardingSubmit` replaces three copies of the same POST-then-navigate
  block. The rule worth having in one place is the one easiest to get wrong: a
  save that failed must not navigate.
- The wizard's timezone auto-detect was an effect keyed on the current timezone,
  so a student who deliberately chose **Asia/Tokyo** — the stored default, and
  the one value the condition treated as "unset" — had their choice silently
  overwritten by their browser. Now derived state; an explicit pick wins.

**Open question, for you.** Teacher completion is self-reported — the teacher
ticks their own boxes, seeded from a query param. Student completion is derived
from real signals (a bio exists, a booking exists, a level was studied). Both
plug the same boolean into the shared component, so the difference is one prop
deep. Making teacher steps derive too is a behaviour change needing new queries,
and some teacher steps ("learn how chat works") have nothing objective to
measure. Left as-is deliberately.

### 5. Org vs school — the pattern repeats a third time

`org-settings-form` / `school-settings-form` and `org-members-list` /
`school-members-view` are already consolidated. Still to check:

- `org/[orgId]/schools/[schoolId]/*` — 7 pages of ~37 lines each, near-identical
  shells differing only in which panel they render
- `school-taxonomy-manager` (15 ln) and `teacher-taxonomy-manager` (13 ln) are
  thin wrappers over the same 490-line `taxonomy-manager` — good, verify no drift

### 6. Raw form controls — ~110 remaining

Concentrated in admin and org forms. Accessible and tokenised, but not on
`Field`/`Input`, so label wiring and error handling are re-implemented per form.

### 7. Lesson detail page — ✅ resolved while doing #2

`dashboard/schedule/lessons/[bookingId]` is **teacher-and-admin only** — it
redirects anyone else to the schedule. It does not serve two flows, so there is
nothing to diverge, and the student's upcoming row correctly has no link to it.

### 8. `text-link` is invisible inside a sentence ⬅ open

Found while screenshotting #4 in dark mode; added to the list after the fact.

`--app-link` is `#0a0a0a` in light and `#fafaf8` in dark — **the same ink as
`--app-foreground`**, confirmed in the browser rather than by reading the token:
link colour and parent colour both `rgb(10, 10, 10)`.

That is fine for a link surrounded by muted body copy — 3.69:1 against
`--app-muted`, above the 3:1 WCAG technique G183 asks for, with the global
`:focus-visible` ring and a hover underline doing the rest. It fails completely
for a link *inside* a foreground-coloured sentence, where there is no difference
at all until the pointer happens to land on it.

Every consent line in the app was in the second category: "I agree to the Terms
of Service" read as flat prose, with nothing to say the terms were reachable.
WCAG 1.4.1, on the surfaces where finding the document matters most. Three
components had each declared a character-identical `legalLinkClassName`, all
missing the underline.

Fixed for the four consent surfaces via `ui/inline-link.tsx`. **Still open:** of
41 `text-link` uses, 37 have no persistent underline, and the 14 with no
underline at all also miss the hover cue. Each needs checking against what it
sits in — muted copy is fine, foreground copy is not.

Its 260 lines are a single-flow page, not a two-flow branch. Any remaining work
there is ordinary composition, not duplication.

---

## Already done (for reference)

- Schedule calendar — one `CalendarFrame` across 5 surfaces
- Profile — one `ProfileSurface` across teacher and student
- Member rows and invite forms — one each across org and school
- Settings forms — one `EntitySettingsForm` across org and school
- Sub-navs — all 6 share `SubNav`
- Taxonomy CRUD API — 8 routes, 847 → 384 lines
- Org authorization — 20 copies of `getCallerMembership` → one module
