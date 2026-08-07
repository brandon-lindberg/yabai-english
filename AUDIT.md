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

### 5. Org vs school — ✅ done

The 14 files under `/org` went 369 lines → 172. Two helpers replaced the
hand-written preamble: `requireSchoolViewer` (7 pages + layout) and
`requireOrgViewer` (4 pages + layout). They are the page-side twins of the
existing `requireSchoolAccess`, which does the same job for API routes — kept
separate because a page redirects a person and a route returns a status, but
given the same vocabulary so a page and its route cannot describe one
permission two different ways.

`school-taxonomy-manager` and `teacher-taxonomy-manager` checked: both are pure
prop adapters over the same `TaxonomyManager`, no drift. Nothing to do.

Three real findings underneath the duplication:

- **The org pages gated on nothing but "signed in."** Membership of the
  organization in the URL was never established, so any signed-in user could
  open `/org/<any-id>/settings` and get the page frame — the APIs behind it
  were the only thing refusing them. That is one layer where the school routes
  have two, and it is the layer a person sees.
- **The org home page was never redesigned.** Hero-metric card grid, card per
  school, local pill class strings, and an `include` over-fetch on
  `organization.findUnique`. The school home had the same card grid. Both now
  on `StatLedger` / `DataList`.
- **`StatLedger` broke above three stats.** Fixed `repeat(n, 1fr)`, fine while
  every caller passed three; the org and school overviews pass four and five,
  and at 390px the figures *overprinted* — `1238` printed on top of `312`. The
  automated overflow check did not see it, because the text overflowed its grid
  cell rather than the viewport. Only the screenshot caught it. Columns now
  wrap on a lattice of per-cell rules.

Kept deliberately: the extra shortcuts an org sees when it has exactly one
school. For a single-school org the school *is* the org, so making them walk
through it is friction — but it was a reason to maintain the row markup twice.
Now one row that carries shortcuts when they are useful.

Guarded: 13 tests over `requireSchoolViewer`, covering the full role × access
matrix and both redirect destinations. Mutation-tested three ways — widening
`schoolAdmin` to teachers, changing the non-member destination, and moving the
viewer lookup before the auth guard each fail exactly one test.

### 6. Raw form controls — ✅ done, 97 → 14

The 14 that remain are deliberate, and the reasons are recorded at the foot of
`ui/field.tsx` so the next sweep does not re-litigate them: radio groups (whose
name belongs on a `<fieldset>`, not on each input), the grid rate rows (whose
labels bottom-align across a row in a way `Field` would break), the onboarding
checklist's status mark, and the chat composers.

Most of these were not merely inconsistent. Sorted by what was actually wrong:

- **Controls with no accessible name at all.** `school-time-off-view`,
  `school-pricing-view`, `org-schools-list` and `admin-schools-view` wrote
  `<label>` with no `htmlFor`, not wrapping the input — so clicking the label
  did nothing and a screen reader reached unlabelled boxes. Five of the six
  chat controls had only a placeholder, which is not a name: it is announced
  inconsistently and disappears on the first keystroke.
- **Hardcoded English** in two admin screens. `admin-teacher-tiers-view` has no
  `useTranslations` at all — every string on it is English, which converting the
  controls does not fix. Flagged as item 10.
- **Labels a third smaller and two shades lighter** than every other form, in
  both availability editors and the school schedule calendar: `text-xs
  text-muted` against the app's `text-sm font-medium text-foreground`.
- **Validation messages as loose paragraphs.** The availability editors printed
  "End must be after start" under the field with nothing tying the two
  together. They are `Field` errors now, so `aria-invalid` and
  `aria-describedby` point at the control that is wrong.
- **A latent brand hue.** `accent-[var(--app-primary,#4f46e5)]` in the payments
  settings carried an indigo fallback in a world that has no hue. The token
  always resolved, so it never fired — one edit away from doing so.

Two things I got wrong and fixed:

- Replacing the availability modal's markup silently dropped three strings — a
  hint, a warning and an empty-taxonomy alert. Caught by diffing every `t(...)`
  call before and after, which is now how each of these conversions was checked.
- Marking required fields put a `*` **inside** the `<label>`. It is `aria-hidden`
  so the accessible name was never affected — verified — but it lands in the
  label's `textContent`, which is what `getByLabelText` matches, and that broke
  five tests. The marker sits beside the label now: same appearance, same
  accessible name, and required fields are findable by their own label again.

### 9. Admin screens — ✅ done (reported, not found by the audit)

Raised directly: *"the booking list runs way too long and has no order or
sorting so it is completely difficult to navigate. The placement queue and
student section are all legacy code."* All correct, and the flow audit had
missed the whole surface — it mapped admin as "out of scope for the three
flows" and never looked inside.

**The overview was three stacked lists with no controls.** Fifty bookings in one
column; the placement queue; and then *every student again*, each row carrying
an inline level form. That was a third place to edit a placement, after the
students grid and the user detail page, and the worst of the three. The students
section is now a link to the screen that already searches, sorts and paginates.

**Bookings** now split upcoming from past, group by day through the same
`GroupedList` the lesson histories use, and filter by status or by name. The
date was previously restated in full on every row; the day is the heading now,
so a row carries only the clock. Rows show a status on the value ladder instead
of raw `CONFIRMED` text.

Two things surfaced while rebuilding it:

- `include: { student: true }` on the booking query returned every column of the
  user record — including whatever secret the model gains next — to render a
  name. Same class as the `/api/courses` leak, on an authenticated page.
- Day grouping depends on the **viewer's** timezone. Formatting with the runtime
  default would file the same lesson under two different headings either side of
  hydration. The list now waits for the real zone rather than guessing, using a
  `useBrowserTimezone` hook that replaces three separate copies of that read.

**The placement review form** was a grey box nested in each row — a card inside a
list inside a card — holding an unlabelled `<select>`, `<textarea>` and
hand-styled button. It also sat in `components/` while every other admin
component is in `components/admin/`, which is why sweeps kept missing it.

**`admin-user-detail-form`** was the single largest offender at 19 raw controls,
each with the same three hand-written lines. Now `Field`/`Input`/`Select`/
`Textarea`/`CheckRow`. Two fixes worth naming: deleting a user was styled amber
— the colour this world reserves for attention, the same weight as "calendar not
connected" — and is now destructive; and it confirmed through `window.prompt`,
which is unthemed, gives a screen reader nothing, and on a phone is a system
dialog unrelated to the page. That and the organization view's hand-built
equivalent are now one `ConfirmDelete`, which disables the button until the
typed name matches rather than failing after the fact.

### 7. Lesson detail page — ✅ resolved while doing #2

`dashboard/schedule/lessons/[bookingId]` is **teacher-and-admin only** — it
redirects anyone else to the schedule. It does not serve two flows, so there is
nothing to diverge, and the student's upcoming row correctly has no link to it.

### 10. `admin-teacher-tiers-view` is untranslated ⬅ open

Found while doing #6. The component never calls `useTranslations`: the heading,
the explanatory copy, all four field labels and the save button are hardcoded
English. Every other screen in the app is bilingual. Needs roughly fifteen keys
in both locales — deliberately not folded into the form-controls sweep, since
that would have been a copy change disguised as a refactor.

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
