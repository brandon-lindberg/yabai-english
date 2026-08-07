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

### 2. Upcoming lessons — verify the shared row still fits both

`dashboard-upcoming-lessons.tsx` and `teacher-upcoming-lessons.tsx` already
share `LessonRow`. Confirm neither has re-grown flow-specific markup, and that
the student side gains the same grouping decision as #1 if grouping is right
there too.

### 3. Dashboard home — two entirely separate returns

`app/[locale]/dashboard/page.tsx` (332 ln) is one file with two complete JSX
trees: a teacher branch (stat ledger, upcoming, profile aside) and a student
branch. They share no layout. Anything added to one silently misses the other —
which is exactly how #1 happened.

### 4. Onboarding — two forms, two shapes

`onboarding-form.tsx` (student, 4-step wizard) vs `teacher-onboarding-form.tsx`
(checklist). Both now share `ProgressBar`, but the step/checklist chrome and the
save/redirect logic are written twice.

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

### 7. Lesson detail page — 260 lines, serves both flows

`dashboard/schedule/lessons/[bookingId]` branches internally. Check whether the
teacher and student views have diverged the way completed lessons did.

---

## Already done (for reference)

- Schedule calendar — one `CalendarFrame` across 5 surfaces
- Profile — one `ProfileSurface` across teacher and student
- Member rows and invite forms — one each across org and school
- Settings forms — one `EntitySettingsForm` across org and school
- Sub-navs — all 6 share `SubNav`
- Taxonomy CRUD API — 8 routes, 847 → 384 lines
- Org authorization — 20 copies of `getCallerMembership` → one module
