# Payments & refunds

How the payment system works as of the full-unwind refund change.
The audit that motivated this is in the git history of this file.

---

## 1. The shape of it

Money moves **direct-charge on Stripe Connect**: the student pays the teacher's
connected account, and the platform takes an `application_fee_amount` off the
top. The platform never holds the funds. Stripe is the only provider.

The fee is tiered by the teacher's lesson volume:

| Tier | Fee schedule |
|---|---|
| Tier 1 | Lessons 1–5: **20%** · 6–10: **15%** · 11+: **10%** |
| Tier 2 | Lessons 1–10: **15%** · 11+: **10%** |
| Tier 3 | Flat **10%** |

Tiers are evaluated quarterly and annually from the teacher's first paid lesson
(`teacher-tiers.ts`). Promotions apply automatically; demotions need admin
approval except on the quarterly pass, which never demotes. There is an override
with an expiry and an audit log.

---

## 2. Refunds are a full unwind

**When a lesson is refunded, nobody keeps anything.** The student is returned
the whole lesson price, and the platform returns its entire application fee to
the teacher's connected account.

On a ¥5,000 Tier-1 lesson:

| Line | Amount |
|---|---|
| Student receives | ¥5,000 |
| Platform retains | ¥0 |
| Application fee returned to teacher | ¥1,000 |
| Teacher's net cost | **¥180** — Stripe's processing fee, which Stripe keeps |

That last line is the only irreducible cost. Stripe does not return its own
processing fee on a refunded payment, and nothing we do can recover it.

### Why this shape

The amount of application fee to return is read **from Stripe**, not from our
own stored metadata — `createStripeApplicationFeeRefund` asks for
`applicationFee.amount - applicationFee.amount_refunded` and returns all of it.
There is no share to compute, so there is nothing to get wrong.

This replaced a design where the platform kept a tier-based or flat share and
teachers could optionally pass a 10% processing fee to the student. That version
had three moving parts — a stored fee, a keep calculation, and a per-teacher
toggle — and a bug in the first one silently changed what the platform collected
for months. Deleting the concept deleted the bug class with it.

### What that removed

`calculateRefundSplit`, `resolvePlatformFeeKeepYen`, `REFUND_PROCESSING_FEE_BPS`,
`calculateRefundProcessingFeeYen`, the `refundFeePassedToStudent` column and its
settings UI, and the refund path's dependency on `payment.metadataJson`.

The pay route still *writes* fee metadata — it is the record of what was charged
— it is just no longer load-bearing for refund correctness.

---

## 3. Cancellation policy

`booking-policy.ts` is pure and returns exactly three facts:
`{ allowed, refundEligible, rescheduleOffered }`.

| Actor | Window | Result |
|---|---|---|
| Student | >48h before | Refund eligible |
| Student | <48h before | No refund, `rescheduleOffered: true` |
| Teacher / admin | any time | Refunded in full |
| Anyone | `PENDING_PAYMENT` | Cancel allowed, no refund |
| Anyone | `CANCELLED` / `COMPLETED` | Blocked |

Only the student is held to a lead window. The 24-hour teacher threshold and its
`studentCompensationFreeLesson` outcome are gone — they were computed and never
consumed by anything.

`rescheduleOffered` is what sends a student inside the window to the reschedule
flow instead of simply losing the fee. See §6.

---

## 4. Refund lifecycle

1. **Cancellation** — `cancel/route.ts` evaluates the policy, cancels the
   booking, then calls `issueAutomaticRefundForBooking`.
2. **Refund** — the student refund and the application-fee return both go
   through Stripe. A `Refund` row records the outcome; two `PaymentLedgerEntry`
   rows record the reversal (`REFUND`, and `PLATFORM_FEE` when a fee came back).
3. **Settlement** — Stripe refunds are asynchronous. `refund.updated`,
   `refund.failed` and `charge.refund.updated` on the Stripe webhook revise the
   row. Both call sites share `mapStripeRefundStatus`.

### When it doesn't work

Anything that leaves the student short lands in `PENDING_RECOVERY` with a
`recoveryNote`, and shows up at **`/admin/payments`**:

- No connected account or payment intent on the payment.
- The application-fee return threw.
- Stripe later reported the refund failed or was cancelled.

A non-Stripe payment **throws** rather than recording a refund that never
happened. `PaymentProvider` still has `KOMOJU` so historical rows stay readable,
but `SUPPORTED_PAYMENT_PROVIDERS` in `payment-methods.ts` is the single list of
what we actually accept, and every boundary narrows to it.

---

## 5. Where the rules are written down

Copy and code are kept in sync by `src/lib/__tests__/teacher-refund-copy.test.ts`,
which fails if any surface — settings UI, payment notices, or the six legal
markdown documents in EN and JA — describes a deduction, a pass-through, or a
retained platform fee.

---

## 6. Reschedule

A student cancelling inside 48 hours gets no refund, so the policy offers a
reschedule instead — `rescheduleOffered`. `POST /api/bookings/[id]/reschedule`
is what consumes it.

The booking keeps its original payment: nothing is refunded, nothing re-charged.
That is what makes this a scheduling change rather than a payments one.

There is no teacher approval step, because the new time must be a slot the
teacher already published — the same `validateBookingAgainstTeacherAvailability`
that governs booking. Agreeing to the time is implicit in having published it.
`Booking.rescheduleCount` caps students at one move per lesson so a paid booking
cannot be held open indefinitely; teachers are not capped.

---

## 7. Payment methods

Card only. `resolveStripeAccountStatus` derives what a teacher may be offered
from their connected account's Stripe capabilities rather than assuming, and
`syncTeacherPaymentAccountFromStripe` is the single writer — the account webhook
and the manual refresh used to carry a copy each, which is how both ended up
hardcoding CARD.

**PayPay is not possible through Stripe.** Verified against SDK 22.1.1 / API
2026-06-24.dahlia: no `paypay` account capability and no `paypay` Checkout
payment method type. The `PAYPAY` enum value is kept dormant so it can be turned
on if Stripe ships it.

`konbini` *is* offered by Stripe Checkout and is unwired — the likeliest next
payment method for this audience, and the delayed-payment webhook events it
needs are already handled.

---

## 8. Still open

- **Custom domain.** The app runs on `english-platform-web.onrender.com`.
  Switching is config only — `NEXT_PUBLIC_APP_URL`, `NEXTAUTH_URL`, `AUTH_URL`,
  the Stripe destination URL, and the authorised redirect URIs in Google Cloud
  Console. Nothing bakes the domain into stored data. `NEXTAUTH_URL` is *not* a
  dead v4 leftover: `lib/google/oauth-service.ts` reads it before
  `NEXT_PUBLIC_APP_URL` when building the Calendar OAuth redirect.
- **Teacher re-onboarding.** Connected accounts created in test mode do not
  exist in live mode, so a teacher's stored `providerAccountId` points at an
  account live mode cannot see. They must reconnect before payments work.
