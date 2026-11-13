# Payment recovery operations

Section 6k, completed locally on `the-mirror`, 2026-11-03. This extends the existing Stripe Connect integration; it does not introduce a second payment system or change lesson prices, collection or cancellation policy.

## Deployment

Use the installed project CLI from the repository root:

```sh
yarn --cwd apps/web prisma migrate deploy
yarn --cwd apps/web prisma generate
```

The additive migration `20261102020000_durable_payment_recovery` is already applied to the local application database. Deploy it to the target database before starting the updated application. Use this project's locked Prisma version, rather than an unpinned `npx prisma` download. Historical amounts, refund receipts, invoices and credit notes are retained. Old webhook receipts are marked complete; deployment does not automatically replay them or infer refund entitlement for old cancellations.

Payments, refunds and incoming Stripe webhooks are processed immediately through the existing integration. A running worker or scheduled endpoint provides automatic resumption of unfinished work. At the current one-paying-user volume, manual recovery through **Admin → Payments** is an acceptable temporary rollout option. Check payment/refund outcomes and resolve pending work while automatic recovery is disabled.

The owner chose a **15-minute schedule** on 2026-11-12. The prepared GitHub Actions workflow below is the current deployment path. A supervised worker remains an alternative, rather than a second job to enable alongside it.

- Supervise `yarn payments:recover --watch` from the repository root. It runs a bounded pass, waits 30 seconds and repeats; SIGINT/SIGTERM disconnect the database and stop the loop. Restart it through the process supervisor if it exits.
- Schedule an authenticated GET or POST to `/api/internal/payments/recover` every 15 minutes. Set a server-side `PAYMENT_RECOVERY_SECRET` (or the existing `CRON_SECRET`) and send `Authorization: Bearer <that secret>`. Keep this secret out of client configuration. Missing configuration returns 503; invalid authentication returns 401. The route allows a 300-second execution budget; use hosting that supports it.

`yarn payments:recover --once` performs one maintenance pass and exits. Each pass selects up to five saved deliveries and five payment jobs, honoring retry delays and active leases. Concurrent invocations cannot claim the same active work. The scheduled worker processes saved obligations and reconciliation; it does not authorize discretionary student refunds or replacement attempts for a confirmed failed refund.

## Fifteen-minute GitHub Actions schedule

The repository's [Payment recovery workflow](../.github/workflows/payment-recovery.yml) makes one authenticated POST to `https://www.englishstudiojapan.com/api/internal/payments/recover` every 15 minutes, at minutes 7, 22, 37 and 52. One job covers both learning languages. It reuses the existing server processor without checking out application code, installing dependencies or receiving database/Stripe credentials. Standard GitHub-hosted runners are [free for public repositories](https://docs.github.com/en/billing/concepts/product-billing/github-actions), including this repository at preparation time.

Automatic calls are disabled unless the repository variable `PAYMENT_RECOVERY_ENABLED` equals `true`. Calls are restricted to this repository's `master` branch. An explicit manual run on `master` is available for the post-deployment check while automatic calls remain disabled. Concurrent runs are serialized and do not cancel work already in progress. The request has a 310-second timeout within a six-minute job budget, does not follow redirects or immediately retry, and discards the financial response body from public Actions logs. Only HTTP 200 is accepted.

Prepare these settings in **GitHub → yabai-english → Settings → Secrets and variables → Actions**:

1. In **Secrets**, create a repository secret named `PAYMENT_RECOVERY_SECRET`. Use the same value already saved in Render. Copy it directly between the services; never put it in the repository, a public Actions variable, a URL or this document.
2. In **Variables**, create a repository variable named `PAYMENT_RECOVERY_ENABLED` with value `false`.
3. Commit/push the workflow and its checks on `the-mirror`, and confirm CI passes. Merge/deploy the new app and its migrations before running the recovery endpoint. Adding the workflow to `master` alone does not activate automatic calls.
4. After Render is live, open **Actions → Payment recovery → Run workflow**, choose `master`, and run it once. Confirm a successful request and inspect **Admin → Payments** for pending or attention-required work. A successful batch request does not prove every refund has settled.
5. Change `PAYMENT_RECOVERY_ENABLED` to `true` to activate the scheduled calls. Confirm the next scheduled run succeeds. Set it back to `false` to stop future automatic requests without deleting saved work or interrupting an active request.

This is 96 scheduled requests per day before provider scheduling delays. With empty queues, a pass performs two bounded database reads and no Stripe calls. Normal refunds still start immediately; this interval affects background resumption. GitHub [may delay/drop scheduled runs and disables public-repository schedules after 60 days without repository activity](https://docs.github.com/en/actions/reference/workflows-and-actions/events-that-trigger-workflows#schedule). Check Actions after long quiet periods and use the existing manual admin recovery when needed. No external job or production request is created by merely preparing the workflow locally.

## Existing webhook endpoint

Keep `/api/payments/webhooks/stripe` and the existing signing secret/Stripe credentials. Verify its event subscriptions cover the handlers used here:

- Connected-account events: `account.updated`, `account.application.deauthorized`.
- Checkout: `checkout.session.completed`, `checkout.session.async_payment_succeeded`, `checkout.session.async_payment_failed`, `checkout.session.expired`.
- Refund reconciliation: `refund.created`, `refund.updated`, `refund.failed`, `charge.refund.updated`, `charge.refunded`.
- Platform application fees: `application_fee.refunded`, `application_fee.refund.updated`.

Direct-charge refund/checkout events must retain their connected-account context. Platform fee events are mapped through the original charge. Keep the existing snapshot event format; this handler does not consume thin event envelopes. Subscriptions and actual live permissions/delivery have not been inspected or changed by this implementation. See Stripe's [Connect direct charges](https://docs.stripe.com/connect/direct-charges?platform=web&ui=stripe-hosted) and [webhook guidance](https://docs.stripe.com/webhooks).

## Admin recovery

Super admins use **Admin → Payments**:

| Saved condition | Action and result |
| --- | --- |
| Interrupted customer refund | **Reconcile / retry** checks Stripe's current refunds first, imports accepted work and resumes an existing full-refund obligation. |
| Student refunded; fee recovery pending | The same action retries the remaining platform fee return. It does not send the student another refund. The row clears once reconciliation completes. |
| Stripe confirmed a failed/cancelled refund | Review the failure, then explicitly confirm recovery. Only this admin action may authorize a replacement, with a new saved request identity. The automatic worker leaves it for attention. |
| Saved delivery did not finish | **Retry delivery** resumes its handler. Receipt alone is not completion. Already-completed deliveries are skipped. |

The confirmation dialog changes nothing until confirmed. A queued/pending outcome is not a settled refund. Pending customer refunds remain pending in student notices. Completed notices omit amounts and ask students to check their account; teachers retain financial details. A partial Dashboard refund is described as partial and does not cancel an otherwise active booking. A full settled refund cancels the booking and reconciles the existing calendar event.

For a historical financial event that the old implementation acknowledged prematurely, an authenticated super admin may POST `{ "eventId": "<saved Stripe event ID>", "replayCompleted": true }` to `/api/admin/payments/recovery`. This is explicit maintenance; old connected-account mutation events cannot be replayed. It requires an already saved payload. An older missing refund can instead be reconciled through POST `{ "paymentId": "<local payment ID>" }`. Without an existing full-refund policy row or saved obligation, this only imports provider state; it grants no new customer refund entitlement.

## Uncertain or historical cases

The account captured when payment was created takes precedence over the teacher's current Stripe connection. Only legacy payments without a captured account can fall back to the current relation, and recovery captures that fallback once. A disconnected original account can still require operator intervention to regain Stripe access; the app must not redirect a historical refund to another account.

Before any customer refund, the processor reads all provider refund pages. If an earlier request's outcome remains unknown after 23 hours, or its remaining amount has changed, automatic creation stops for attention. Stripe can prune idempotency keys after at least 24 hours, so blindly reusing an old key could create another refund. Inspect the original intent/refunds in Stripe, reconcile any accepted or Dashboard-issued receipt and resolve the remaining obligation deliberately. An uncertain request is never made safe merely by pressing retry. See Stripe's [idempotency contract](https://docs.stripe.com/api/idempotent_requests).

Recovery preserves provider receipts and ledger history, adding reconciliation deltas instead of deleting financial entries. Action responses summarize the full authorized refund operation; individual receipts and credit notes retain their actual individual amounts. Provider failures, retries, leases and fee work are saved in `PaymentRecovery` and `PaymentWebhookEvent` for diagnosis.

## Local evidence and limits

The [audit](stripe-payment-audit.md) records red/green evidence and the final regression results. Database tests use disposable local PostgreSQL schemas and a fake Stripe SDK; browser fixtures explicitly disable Stripe/Google credentials. No live charge, refund, endpoint change, production worker or production migration was performed. Production activation needs the migration and verification of the existing provider endpoint/account configuration. Automatic resumption additionally requires activating the schedule above; manual oversight remains necessary while it is off.
