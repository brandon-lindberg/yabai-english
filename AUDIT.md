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

### 1. Completed lessons — ✅ done

| | Teacher | Student |
|---|---|---|
| File | `teacher-completed-lessons-client.tsx` (211 ln) | `dashboard-completed-lessons.tsx` (122 ln) |
| Grouping | By student, with a per-group count | **None** — flat list |
| Row | Collapsible, opens notes editor | Static `LessonRow` |
| Date | `formatLessonRange` (date stated once) | `formatLessonRange` |

The teacher side was rebuilt to group; the student side was not. A student with
twenty lessons across three teachers gets twenty undifferentiated rows.

**Fixed:** one grouped history both flows use, grouped by counterpart. The root
cause was in the sort, not the render — `sortTeacherCompletedBookings` existed
only for teachers, so the student list arrived date-ordered and *could not* be
grouped. Now `sortCompletedByCounterpart` serves both.

The component later moved to `ui/grouped-list.tsx` when the admin booking list
wanted the same shape for a different key, and its props got honest names:
what is shared is grouping a pre-sorted list into runs under headings, not
anything about lessons.

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

### 3. Dashboard home — ✅ done

`app/[locale]/dashboard/page.tsx` was 332 lines holding two complete JSX trees —
a teacher branch and a student branch — that shared no layout. Anything added to
one silently missed the other, which is exactly how #1 happened.

Now `DashboardSpine` asks the same questions in the same order for both flows,
and the route file is 43 lines that only decide whose dashboard to render. Both
flows gained what only one had: teachers a focal next lesson, students a stat
ledger. The student side also went from seven sequential database round trips to
one `Promise.all`.

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

### 10. `admin-teacher-tiers-view` was untranslated — ✅ done

Found while doing #6: the component never called `useTranslations`, alone among
the app's screens. The heading, the explanatory copy, all four field labels,
every button and the pending-demotion banner were hardcoded English, and "Tier
1" was built by string-replacing the enum — which no other locale can follow.
Twenty keys added in both locales; en and ja are at parity, 1388 keys each.

Two things surfaced while wiring it:

- `toLocaleDateString()` with no arguments formatted in the **browser's** locale
  rather than the app's, and in whichever zone the runtime happened to be in.
  Now the app locale and the viewer's zone.
- My first attempt passed `LocalDateTime` through `t.rich` as `{date}`. That
  silently rendered **nothing** — `t.rich`'s function form builds tags, not
  values — so both dates on the screen came out blank. Caught by screenshotting
  the Japanese page rather than trusting the typecheck. They are formatted
  strings interpolated by plain `t()` now, which is also what lets Japanese
  order the sentence its own way.

Five other admin pages were still opening with a raw `<h1 className="text-2xl
font-bold">` instead of `PageHeader`; folded in while here.

### 8. `text-link` is invisible inside a sentence — ✅ done

`--app-link` is the same ink as `--app-foreground`. Confirmed in the browser
rather than read off the token file: on the Terms page a link and its parent
paragraph both compute to `rgb(10, 10, 10)`, `sameColor: true`. Nothing about a
link in this app was ever carried by colour, because there is no colour to carry
it — the world is a value system by design.

That is fine where a link has muted body copy to contrast against: 3.69:1
against `--app-muted`, above the 3:1 WCAG technique G183 asks for. It fails
completely for a link *inside* foreground-coloured prose, where there is no
difference at all until a pointer happens to land on it.

Two classes now, in `ui/inline-link.tsx`, and all 41 call sites use one of them:

- **`inlineLinkClass`** — always underlined. For a link inside a sentence.
- **`actionLinkClass`** — underlined on hover *and* focus. For a link standing
  on its own, which has muted copy around it to contrast against.

The distinction is not stylistic; it is whether the link has anything to
contrast against.

Three real 1.4.1 failures, all links sitting in `text-foreground` prose:

- **Every link in the Terms and Privacy documents.** `legal-document.tsx`
  renders markdown `<a>` inside `text-foreground` paragraphs and list items, so
  the four cross-references on the Terms page were indistinguishable from the
  sentences around them. The worst instance, on the documents where finding the
  linked policy is the entire point.
- The onboarding resume banner.
- The teacher dashboard's calendar hint — which I wrote earlier in this audit.

Eighteen more had no non-colour cue at any state: either nothing, or
`hover:opacity-90`, which is not a second channel but the same one again.

One that was not a link at all: `learn/lesson/[lessonId]` printed "Courses" as a
link-coloured `<p>` above the title. It read as the one navigable thing on the
page and did nothing — there is no courses route for it to point at. Now muted.
It is still an eyebrow above a heading, which DESIGN.md §4 rules out; whether it
earns its place is a content question, so it is noted here rather than deleted.

---

### 11. The rest of the admin screens — ✅ done

Reported after #9: *"some of the components are just terrible."* Correct — #9
had only rebuilt the overview and the user detail form.

**`admin-schools-view`** (630 ln) held **three different hand-rolled submit
buttons** — `rounded-lg … py-2 text-sm` for one and `rounded-md … py-1 text-xs`
for the other two, the latter about 26px tall. It also nested dashed boxes
inside columns inside sections (a container three deep), rendered one bordered
card per school, and printed four errors as bare red paragraphs with nothing to
announce them. Its two side-by-side lists had different treatments — Schools
ruled, Members not — in the same row of the same grid.

**`admin-reports-table`** called `new Date(...).toLocaleString()` with no
arguments three times: the *browser's* locale rather than the app's, in whatever
zone the runtime happened to be in. Its load error was styled amber — attention,
the same weight as "calendar not connected" — and it labelled the two parties
with hardcoded English initials, `S:` and `T:`.

**`admin-user-grid`** paginated with hand-rolled ~28px buttons, and printed its
sort state as the raw identifier: *"Sort: createdAt desc"*. Worse, five sortable
columns carried **no `aria-sort` at all** — nothing told a screen reader which
column was in force or which way round, and the header buttons reordered the
table silently. Guarded now with three tests; removing the attribute fails
exactly two of them.

### 12. The rest of the SUPER_ADMIN screens — ✅ done

Reported with screenshots: *"these have obviously never even been looked at."*
Correct. #9 and #11 had rebuilt the overview, the user detail form and the
schools/reports/grid plumbing; nobody had looked at what the pages actually
*read* like.

**The wall of options.** Every user grid — All users, Teachers, Students — put
**thirteen checkboxes across two rows** above the table: the largest, loudest
thing on the page, sitting in front of the data it configures. You set columns
once and then live in the rows. Now a native `<details>` with a count
(`Columns (11/13)`), so the data leads.

I then broke that fix and caught it in the screenshot round: stripping the
disclosure marker left something that looked exactly like a heading, with
nothing to say it opened. The native triangle is back.

**Three more that only a screenshot shows:**

- `Created` rendered `new Date(...).toLocaleString()` — the browser's locale,
  the runtime's zone, and *seconds*, which wrapped the cell onto three lines.
  Now `LocalDateTime`, date only.
- `Rate ¥` printed `String(3300)`, with the currency living in the column header
  rather than the value. Now `formatYen`.
- The actions column's header key is an empty string, so the column had no name
  at all. Now an `sr-only` label.

**Teacher tiers** gave every teacher four identical pills — "Evaluate now"
beside three "Set Tier N" — all the same weight, so nothing distinguished the
routine action from the three that override the calculation. The overrides are
now one labelled group, and the tier a teacher already holds is no longer
offered again.

**Schools & organizations** needed two passes. The first moved the create form
below the list — you had been arriving and meeting five empty inputs before
seeing whether any organizations existed.

That was not enough, and the second look found why: **the org card interleaved
data and forms.** "Add another school" lived inside the Schools column and
"Assign or update a role" inside the Members column, both permanently open, both
taller than the lists above them. The page asked *what is in this organization?*
and answered with two forms. One organization filled two viewports.

Now the organization identifies itself — name, then one line of
`slug · timezone · N schools · N members` — its two lists sit side by side and
scan as lists, and each form is a disclosure under the list it adds to, open
only when that list is empty. Two organizations now fit where one did not.

`ConfirmDelete`'s trigger also dropped to `sm`. One dangerous control among
several ordinary ones can afford full weight; a list gets one per row, and a hue
repeated down a page stops reading as a warning.

**Chat reports** said "No reported threads." as a bare muted paragraph. An empty
queue is an outcome, and the app has one way of saying so.

### 13. `/admin/schools` was one page doing N pages' work — ✅ done

Reported after two rounds of styling it: *"you should have to click into an
organization to see its members, it should be an entirely new page."* Right, and
the two previous passes had been rearranging furniture inside the wrong room.

The page listed every organization **and managed every one of them inline** —
each rendering its schools, its members, an add-school form and an assign-role
form. It had no single job, and every organization added doubled it. Restacking
the columns and collapsing the forms made it tidier without making it correct.

Now it is two routes:

- **`/admin/schools`** — the organizations, as rows you click. Name, then
  `slug · timezone · N schools · N members`. The whole row is the link, the same
  way an onboarding step with no controls of its own is.
- **`/admin/schools/[orgId]`** — one organization: its schools, its members, the
  two forms that add to them, and deleting it. Deleting ends the page you are
  on, so it sits at the foot of it and returns you to the list.

The list query changed with the structure: it used to load every school and
every membership of every organization because it rendered them all. It reads
`_count` now, and the detail page loads the rest.

`admin-schools-view.tsx` (672 lines) split into `admin-org-list`,
`admin-org-detail`, a shared `admin-org-form-fields`, and `admin-org-types`.

Two mistakes on the way, both caught in the screenshot round: a row-wide hover
next to a small "Manage" link promised the whole row was clickable when only
that word was; removing "Manage" and linking just the name then left nothing
marking the row as navigable, because `--app-link` is the same ink as the
foreground. The row is the link.

### 14. "2 members" for an organization with one person in it — ✅ bug

Reported alongside the create form: *"how does this organization have 2 members
when there is clearly only one member who is both the owner and a
school_admin."*

Because the count counted **membership rows**, and a membership row is a grant,
not a person. One person holding org-wide OWNER plus SCHOOL_ADMIN of one of the
org's schools is the ordinary case, and that is two rows. `_count` on
memberships was reporting grants and labelling them members — on the
organization, and on each school.

Identity is not simply `userId` either: it stays null until an invited person
first signs in, so keying on it alone would have collapsed every outstanding
invitation into a single phantom member. The key is `userId ?? inviteEmail`,
in `lib/org/member-identity.ts`, with 9 tests over the cases that matter —
two grants for one person, two pending invites, an invite and the account it
becomes, and case/whitespace on the email.

The members list had the same shape of error: it printed one row per grant, so
the same person appeared twice. One row per person now, with their roles listed
beside them, and a pending invitation says so.

### 15. Create organization — ✅ done

Never touched since it was written. Five flat fields belonging to three
different things, and copy written for whoever implemented the endpoint:
*"Creates the org, its first school, and assigns the given user as OWNER."*

- Grouped into **Organization / Its first school / Owner**, so the form's shape
  matches what it makes.
- **Both slugs now follow their name** until an admin edits one. They were two
  of the five fields on the critical path, typed by hand from the name sitting
  beside them — and the organization's was required while the school's was not,
  for no reason a person could see. Adding a school later works the same way.
- Constraints moved out of labels and into hints: "Owner email (existing user)"
  became a label and a sentence that says what will happen to them.

## Still open

- The impeccable finish-reviewer pass (DESIGN.md §9) has still not been run.
