# Teaching achievements

Teaching and Learning are separate collections. An account that can do both earns its teaching badges by teaching and its learner badges by studying or taking lessons. Each collection has its own gallery access, progress, streaks and notifications. There is no combined score or achievement.

## A first teaching edition

Start with eight visible achievements. The titles below are proposed English and Japanese copy. One teacher collection covers all subjects the teacher teaches. This gives a bilingual teacher one profile milestone and one teaching history. The learner's English and Japanese collections continue to track progress independently.

| Achievement | When the teacher earns it |
| --- | --- |
| Meet Your Teacher / はじめまして、先生です | Save a teacher profile with a display name, a bio and at least one instruction language. A skipped onboarding step alone cannot qualify. |
| You're Booked! / はじめての予約 | A student's reservation with this teacher is confirmed for the first time. A confirmed free trial qualifies. A later cancellation leaves the booking badge earned. |
| Class Is In / はじめての授業 | Finish 1 eligible class. |
| Getting the Hang of It / 先生業も板についてきた | Finish 5 classes. |
| A Familiar Face / いつもの先生 | Finish 25 classes. |
| Half a Century / 授業50回の節目 | Finish 50 classes. |
| The Hundredth Bell / 100回目のチャイム | Finish 100 classes. Keep counting for future editions. |
| See You Again / また会えましたね | Teach the same learner in two distinct eligible classes on different local dates. Reuse the learner plan's calendar-day policy. |

| Hidden achievement | When it unlocks |
| --- | --- |
| To Be Continued… / つづきは次回 | A finished, eligible class has a saved lesson note. |
| The Fox Writes Back / キツネ先生のお返事 | The teacher replies after a student message in a private lesson chat. The award uses committed message times and participant IDs. |
| Second Bell / ふたつ目のチャイム | The teacher finishes two distinct classes on different days of the same Monday-to-Sunday week in Japan time. |

## How a class counts

- Use the scheduled end time and server clock. A private booking qualifies once it has ended with status `CONFIRMED` or `COMPLETED`. This records a scheduled lesson credit. Attendance is unverified.
- A group class qualifies once its session has ended and at least one seat is eligible. Use the group session ID for teaching credit and the booking ID for a private class. Five confirmed seats in one class give the teacher **one** class credit. Each of those five learners can still receive their own lesson credit. A class whose seats are all pending or cancelled earns zero.
- At confirmation, retain the occurrence identity. Rescheduling one booking, receiving two seat events simultaneously, retrying a notification, or deleting a historical group-session link must never turn one class into two. Recheck eligibility at the updated end time. For returning-student credit, deduplicate each eligible student/occurrence pair separately.
- Resolve the teacher through `Booking.teacherId → TeacherProfile.id → TeacherProfile.userId`. Learner credit belongs to `Booking.studentId`. Chat threads already use the teacher's **user ID**. Preserve these distinctions when writing events. [Booking and profile models](../apps/web/prisma/schema.prisma)

## Accounts that teach and learn

Today the dashboard branches on a single account role and the student booking endpoint checks that role. A visible tab alone would leave a teacher unable to use part of the learner journey. Design an explicit **Learning / 学習** entry for authorized teacher accounts, alongside **Teaching / 指導**. Check entitlements at the corresponding server routes before exposing the switch. Preserve earned history if an account changes role. [Dashboard routing](<../apps/web/src/app/[locale]/dashboard/page.tsx>) · [Booking permissions](../apps/web/src/app/api/bookings/route.ts)

Within each context, the first award opens **that context's** Art Gallery. A teacher's first class can open their Teaching gallery while their Learning gallery is still locked. A notification carries its collection and opens the matching artwork directly. Neither opening a notification nor switching the interface language changes the current practice session or grants access to another role. [Learner experience](learning-achievements-plan.md)

## Implementation and release

1. Reuse the learner award store, localized gallery and popup. Include collection scope in progress keys, unique award receipts, event delivery and server authorization. A teaching receipt has no learner subject. Learner receipts retain their subject. Confirm the scoped key layout in the learner schema before adding teaching events.
2. Record facts at successful profile saves and booking confirmations. Use the learner lesson-end mechanism for both participant and teacher credits with separate idempotency keys. Recover missed work from a bounded durable queue. Keep message bodies and names out of notifications. [Message persistence](<../apps/web/src/app/api/chat/threads/[threadId]/messages/route.ts>)
3. Backfill in resumable batches. A saved complete profile can grant the profile badge as of assessment. If history cannot establish when a condition first became true, record the grant date honestly. Keep per-action work independent of a teacher's lifetime lessons or messages.
4. Test first unlocks in each role, the same account studying and teaching, five seats arriving concurrently, mixed seat cancellations, reschedules, empty classes, retries, and repeat learners. Test notification delivery to the right account and collection in both interface languages. Benchmark the write paths before enabling them. [Performance policy](performance-policy.md)

Teacher art commissioning and implementation follow approval of the teaching catalogue. The approved 39 learner illustrations retain their own catalogue.

## Gallery release

The dashboard selects the collection by account role. Teaching awards reconcile saved profile and booking history when the teacher opens the gallery. Group bookings retain their occurrence identity if the original group session link is removed.

Community unlock rates use three cohorts. Each learner cohort includes accounts currently learning that subject. The teaching cohort includes teachers and administrators with a teaching profile. Rates use recorded awards and refresh from shared snapshots after gallery visits when the snapshot is at least five minutes old. Awards below 10% have a gold frame, with a brief shimmer when motion is enabled.

Three hidden teaching awards use existing lesson notes, private lesson chat replies, and teaching days within a Monday-to-Sunday week in Japan time. The gallery shows only the remaining count until each award is saved. It delivers the hidden artwork with the earned card and includes the award in the teaching cohort's next rarity refresh.
