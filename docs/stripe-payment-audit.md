# Stripe payment and refund wiring audit

Audited on `the-mirror`, 2026-11-02, for MIRROR_PLAN.md section 6j. This audit distinguishes verified existing routes from failure-recovery limits. No payment-processing implementation, Stripe credentials, account setup, fee policy or schema is changed in this section.

## Verified wiring

| Action | Existing path | Checks |
| --- | --- | --- |
| Student pays | Booking pay route → `createStripeCheckoutSessionDirectCharge` | Teacher's connected account; full JPY lesson price; application fee; booking/payment metadata on both Checkout Session and PaymentIntent; persisted session/intent/account identifiers. Reopening an existing checkout returns its stored URL. |
| Paid booking confirms | Stripe webhook or success return → `confirmBookingFromStripeCheckoutSession` → `confirmPaidBookingFromPayment` | Paid status required; stored booking and checkout identifiers checked; shared confirmation path; delayed payment methods wait for paid completion. Existing unit regressions cover these checks. |
| Policy grants a refund | Booking cancel route → `issueAutomaticRefundForBooking` | Original payment intent and teacher payment account; full lesson amount; stable payment-based provider idempotency key; refund row and ledger reversals; application-fee return on the platform. |
| Teacher chooses a refund | Teacher-owned reschedule-request route → the **same** refund helper | Server checks ownership and pending request; atomic refund claim; same original intent/account/full amount; teacher actor saved; a recorded refund is returned on retry without another provider request. |
| Refund is pending/settled | Shared helper and existing Stripe refund-status webhook → credit note and shared notifier | Pending/requires-action stay pending; settlement dispatches the completed event; repeated settled refund events repair delivery. Student completion copy has no amount and asks them to check their account; teacher details remain intact. |
| Late student cancellation / permanent closure | Existing cancellation/request policy | Neither action calls Stripe checkout, refund or application-fee APIs. |

The provider contract agrees with Stripe's documented [direct-charge model](https://docs.stripe.com/connect/direct-charges?platform=web&ui=stripe-hosted) and [refund API](https://docs.stripe.com/api/refunds/create): direct-charge operations use the connected-account context, and a refund targets the original charge or PaymentIntent. Application fees are returned by the existing separate platform call. The audit does not change this established integration.

`src/lib/stripe/__tests__/lesson-payment-wiring.test.ts` adds **11 cross-layer regression checks**. They exercise the actual pay/cancel/teacher-resolution routes, refund service and Stripe argument builders together, with the Stripe SDK and persistence boundary mocked. They verify both English and Japanese checkout/policy-refund paths, JPY amounts, original identifiers, account options, fee handling, retry behavior and actions that must not move money. Existing checkout confirmation, cancellation, fee and webhook tests run in the safe mirror suite as well.

## Existing recovery limits found

These are code-review findings in the implementation present before section 6j. They are not claims of observed production failures. They remain follow-up work; passing normal-flow regressions does not resolve them.

1. **Interrupted automatic cancellation has no durable refund retry.** The cancellation route writes `CANCELLED`, then awaits notifications/calendar work and the provider refund. A thrown error before `refund.create` can leave the booking cancelled without a recorded refund/recovery row. A repeated cancellation is refused by policy. The teacher-request route has a separate claim/retry guard, but the automatic cancellation route lacks equivalent durable recovery. See `src/app/api/bookings/[bookingId]/cancel/route.ts:107` and `src/lib/payment-refunds.ts:112`.

2. **Webhook receipt can outlive failed processing.** The Stripe endpoint stores the event's deduplication receipt before running its handler. If checkout handling fails afterwards, Stripe retries encounter the receipt and return `duplicate` rather than retrying checkout processing. Successful refund updates have an explicit repair exception; other handlers do not. A refund update arriving before its local refund row is stored also has no deferred reconciliation. Reliable processing needs a durable processing state and safe replay, rather than treating receipt as completion. See `src/app/api/payments/webhooks/stripe/route.ts:214` and Stripe's [webhook retry guidance](https://docs.stripe.com/webhooks#automatic-retries).

3. **Refund routing follows the current account relation.** The refund helper reads `payment.teacherPaymentAccount.providerAccountId`; checkout also saved a connected-account snapshot in payment metadata. After disconnection or reconnection to a different Stripe account, a historical refund may have missing or incorrect account context and fail. Historical account selection needs review using the immutable payment snapshot, with an explicit legacy fallback. See `src/lib/payment-refunds.ts:91` and the checkout payment metadata in `src/app/api/bookings/[bookingId]/pay/route.ts`.

4. **Manual Stripe Dashboard refunds are not imported.** The refund-status webhook updates an existing row by `providerRefundId`; it does not create or link a refund for an otherwise unknown provider ID. A refund initiated in the app is covered by the verified teacher route. An independent Dashboard refund or manual recovery still needs reconciliation before the app can reliably reflect it. See `src/app/api/payments/webhooks/stripe/route.ts:92`.

5. **Application-fee recovery can be hidden.** If the student refund succeeds but the separate application-fee return fails, the helper stores `SUCCEEDED` plus a recovery note. The admin recovery list filters `PENDING_RECOVERY`, `FAILED` and `PENDING`; it does not include a succeeded refund with an outstanding fee note. Student reimbursement can be complete while the teacher's fee return still requires attention. See `src/lib/payment-refunds.ts:120` and `src/app/api/admin/payments/refunds/route.ts`.

These findings call for a focused recovery change with independent red/green tests for interruption, concurrency, replay and reconciliation. A live Stripe Dashboard configuration check, test-mode provider round trip and webhook delivery test would also be needed for operational signoff. Mocked code-level tests cannot establish live account permissions, balances, endpoint subscriptions or production delivery.

## Section 6j evidence

The notification behavior demonstrated four failing assertions before the change (`.impeccable/student-refund-notifications-red.log`), then passed (`student-refund-notifications-green.log`). The complete safe mirror suite passes **774 checks**, with one skipped migration-only case and three existing TODOs. The new cross-layer checks pass in `stripe-wiring-audit.log`. TypeScript and full ESLint pass in `student-notifications-types.log` and `student-notifications-lint.log`.

All **24 browser journeys** and the final production build pass (`student-notifications-browser.log`, `student-notifications-build.log`). Batched Impeccable inspection covers English desktop/light and Japanese mobile/dark refund and closure notices. The browser run preserves all **27 application-table fingerprints**; the owned schema, fixtures and connections are removed, task-owned processes have exited and preview port 3100 is released (`student-notifications-cleanup.json`). Browser tests use an isolated schema and explicit synthetic settlement; they do not charge or refund real money. Runtime financial code remains unchanged, while student notification selection/copy changes in the shared notifier. No staging, commit or push is performed by the agent.
