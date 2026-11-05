import { beforeEach, expect, test, vi } from "vitest";
import type { PrismaClient } from "@/generated/prisma/client";
import { withIsolatedPostgres } from "../../test/isolated-postgres";

const state = vi.hoisted(() => ({ db: null as PrismaClient | null, session: { user: { id: "student", role: "STUDENT" } },
  refunds: [] as Array<Record<string, unknown>>, refundCalls: [] as unknown[][], refunded: 0,
  feeRefunded: 0, feeCalls: 0, feeFails: false, loseRefundResponse: false, failNotification: false,
  createStatus: "succeeded", hasFee: true,
  signedEvent: null as unknown,
  failInvoice: false, failIntent: false, barrier: null as Promise<void> | null, keys: new Map<string, Record<string, unknown>>() }));
vi.mock("server-only", () => ({}));
vi.mock("@/lib/prisma", () => ({ get prisma() { return state.db; } }));
vi.mock("@/auth", () => ({ auth: async () => state.session }));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("@/lib/realtime-server", () => ({ emitNotificationsUpdate: vi.fn() }));
vi.mock("@/lib/google-calendar", () => ({ createMeetLessonEvent: vi.fn().mockResolvedValue({ meetUrl: null, googleEventId: null }),
  deleteMeetLessonEvent: vi.fn().mockResolvedValue(true), removeMeetLessonEventAttendee: vi.fn().mockResolvedValue(true) }));
vi.mock("@/lib/chat-threads", () => ({ ensureStudentTeacherThread: vi.fn() }));
vi.mock("@/lib/teacher-tiers", () => ({ initializeTeacherTierStateFromHistory: vi.fn() }));
vi.mock("@/lib/sync-teacher-roster-after-student-booking", () => ({ syncTeacherRosterAfterStudentBooking: vi.fn() }));
vi.mock("stripe", () => ({ default: class {
  webhooks = { constructEvent: () => state.signedEvent };
  refunds = {
    list: async () => { if (state.barrier) await state.barrier; return { data: state.refunds, has_more: false }; },
    retrieve: async (id: string) => state.refunds.find(refund => refund.id === id),
    create: async (...args: unknown[]) => {
      state.refundCalls.push(args);
      const input = args[0] as Record<string, unknown>, options = args[1] as Record<string, string>;
      if (options.stripeAccount !== "acct_original") throw new Error("wrong account");
      const cached = state.keys.get(options.idempotencyKey); if (cached) return cached;
      const refund = { id: `re_${state.refunds.length}`, amount: input.amount, currency: "jpy", status: state.createStatus,
        payment_intent: "pi_original", metadata: input.metadata };
      state.keys.set(options.idempotencyKey, refund); state.refunds.push(refund); if (state.createStatus === "succeeded") state.refunded += Number(input.amount);
      if (state.loseRefundResponse) { state.loseRefundResponse = false; throw new Error("connection lost after provider accepted refund"); }
      return refund;
    },
  };
  paymentIntents = { retrieve: async () => ({ id: "pi_original", amount: 5000, currency: "jpy",
    metadata: { paymentId: "payment", bookingId: "booking" }, latest_charge: { id: "ch_original", application_fee: state.hasFee ? "fee_original" : null } }) };
  applicationFees = {
    retrieve: async () => ({ id: "fee_original", amount: 1000, amount_refunded: state.feeRefunded, account: "acct_original", charge: "ch_original" }),
    createRefund: async (_id: string, input: { amount: number }) => {
      state.feeCalls++; if (state.feeFails) throw new Error("fee provider unavailable");
      state.feeRefunded += input.amount; return { id: "fr_original", amount: input.amount };
    },
  };
  charges = { retrieve: async () => ({ payment_intent: "pi_original" }) };
} }));

import { prepareBookingRefund, processPaymentRecovery, recordStripeRefund } from "@/lib/payment-recovery";
import { issueAutomaticRefundForBooking } from "@/lib/payment-refunds";
import { loadBookingForCancellation } from "@/lib/booking-cancellation-data";
import { receiveStripeWebhook, processStoredStripeWebhook } from "@/lib/stripe/webhook-work";
import { POST as cancel } from "@/app/api/bookings/[bookingId]/cancel/route";
import { POST as resolve } from "@/app/api/bookings/[bookingId]/reschedule-request/route";
import { ensureCreditNoteNumber } from "@/lib/credit-notes";
import { recoverPayment, runPaymentRecoveryBatch } from "@/lib/payment-recovery-batch";
import { GET as adminRefunds } from "@/app/api/admin/payments/refunds/route";
import type Stripe from "stripe";

const policy = { allowed: true, refundEligible: true, rescheduleOffered: false };
const params = { params: Promise.resolve({ bookingId: "booking" }) };
const dbTest = test.runIf(Boolean(process.env.MIRROR_TEST_DATABASE_URL));
beforeEach(() => {
  state.refunds = []; state.refundCalls = []; state.refunded = 0; state.feeRefunded = 0; state.feeCalls = 0;
  state.feeFails = false; state.loseRefundResponse = false; state.failNotification = false; state.failInvoice = false;
  state.createStatus = "succeeded"; state.hasFee = true;
  state.failIntent = false;
  state.barrier = null; state.keys.clear(); state.session = { user: { id: "student", role: "STUDENT" } };
  vi.stubEnv("STRIPE_SECRET_KEY", "sk_test_mockonly");
  vi.stubEnv("STRIPE_WEBHOOK_SECRET", "whsec_mockonly");
});
async function withDb(run: (db: PrismaClient) => Promise<void>) {
  await withIsolatedPostgres("20261102020000_durable_payment_recovery", async ({ db, applyMigration }) => {
    await applyMigration();
    const instrumented = db.$extends({ query: { $allModels: { $allOperations({ model, operation, args, query }) {
      if (model === "PaymentRecovery" && operation === "upsert" && state.failIntent) { state.failIntent = false; throw new Error("intent persistence failed"); }
      if (model === "Invoice" && operation === "upsert" && state.failInvoice) { state.failInvoice = false; throw new Error("invoice write interrupted"); }
      if (model === "Notification" && operation === "createMany" && state.failNotification) { state.failNotification = false; throw new Error("notification unavailable"); }
      return query(args);
    } } } }) as unknown as PrismaClient;
    state.db = instrumented;
    try {
      await db.user.createMany({ data: [{ id: "student", role: "STUDENT" }, { id: "teacher-user", role: "TEACHER" }, { id: "admin", role: "SUPER_ADMIN" }] });
      await db.teacherProfile.create({ data: { id: "teacher", userId: "teacher-user" } });
      await db.lessonProduct.create({ data: { id: "product", tier: "EIKAWA", durationMin: 60, nameEn: "Lesson", nameJa: "レッスン" } });
      await db.booking.create({ data: { id: "booking", studentId: "student", teacherId: "teacher", lessonProductId: "product", status: "CONFIRMED",
        startsAt: new Date(Date.now() + 72 * 3_600_000), endsAt: new Date(Date.now() + 73 * 3_600_000), quotedPriceYen: 5000 } });
      const account = await db.teacherPaymentAccount.create({ data: { id: "connection", teacherId: "teacher", provider: "STRIPE", providerAccountId: "acct_reconnected" } });
      await db.payment.create({ data: { id: "payment", bookingId: "booking", studentId: "student", teacherId: "teacher", teacherPaymentAccountId: account.id,
        provider: "STRIPE", method: "CARD", amountYen: 5000, status: "SUCCEEDED", idempotencyKey: "original-payment", providerPaymentId: "pi_original",
        providerCheckoutId: "cs_original", metadataJson: { connectedAccountId: "acct_original" } } });
      await db.paymentLedgerEntry.createMany({ data: [{ paymentId: "payment", type: "PLATFORM_FEE", amountYen: 1000 }, { paymentId: "payment", type: "TEACHER_NET", amountYen: 4000 }] });
      await run(instrumented);
    } finally {state.db = null;vi.unstubAllEnvs();}
  });
}
async function prepare(db: PrismaClient) {
  const booking = (await loadBookingForCancellation(db, "booking"))!;
  return db.$transaction(async tx => {
    await tx.booking.update({ where: { id: "booking" }, data: { status: "CANCELLED" } });
    return prepareBookingRefund(tx, { booking, policy, actor: "STUDENT" });
  });
}
async function refundTotal(db: PrismaClient) { return (await db.paymentLedgerEntry.aggregate({ where: { paymentId: "payment", type: "REFUND" }, _sum: { amountYen: true } }))._sum.amountYen ?? 0; }
const external = (id = "re_dashboard", amount = 5000, status = "succeeded") => ({ id, amount, status, currency: "jpy", payment_intent: "pi_original", metadata: {} }) as Stripe.Refund;
const webhook = (id = "event", type = "refund.updated") => ({ id, type, account: "acct_original", data: { object: { id: "re_dashboard", status: "pending" } } });
async function signedDelivery(event: unknown) {
  state.signedEvent = event;
  const entrypoint = process.env.PAYMENT_WEBHOOK_BASELINE
    ? await import(/* @vite-ignore */ process.env.PAYMENT_WEBHOOK_BASELINE)
    : await import("@/app/api/payments/webhooks/stripe/route");
  return entrypoint.POST(new Request("http://localhost", { method: "POST", headers: { "stripe-signature": "verified-by-test-SDK" }, body: "{}" })) as Promise<Response>;
}

dbTest("cancellation and its refund obligation commit together before any provider call", () => withDb(async db => {
  await prepare(db);
  expect(await db.booking.findUnique({ where: { id: "booking" } })).toMatchObject({ status: "CANCELLED" });
  expect(await db.paymentRecovery.findUnique({ where: { paymentId: "payment" } })).toMatchObject({ requestedAmountYen: 5000, state: "QUEUED", connectedAccountId: "acct_original" });
  expect(await db.refund.findFirst()).toMatchObject({ status: "PENDING_RECOVERY", amountYen: 5000 });
  expect(state.refundCalls).toHaveLength(0);
}), 30_000);

dbTest("a crash before transaction commit leaves the original reservation and no obligation", () => withDb(async db => {
  await expect(db.$transaction(async tx => {
    await tx.booking.update({ where: { id: "booking" }, data: { status: "CANCELLED" } });
    await prepareBookingRefund(tx, { booking: (await loadBookingForCancellation(db, "booking"))!, policy, actor: "STUDENT" });
    throw new Error("crash");
  })).rejects.toThrow("crash");
  expect((await db.booking.findUniqueOrThrow({ where: { id: "booking" } })).status).toBe("CONFIRMED");
  expect(await db.paymentRecovery.count()).toBe(0); expect(await db.refund.count()).toBe(0);
}), 30_000);

dbTest("unknown provider outcome resumes from Stripe without sending the student money twice", () => withDb(async db => {
  const booking = (await loadBookingForCancellation(db, "booking"))!; state.loseRefundResponse = true;
  const interrupted = await issueAutomaticRefundForBooking(db, { booking, policy, actor: "STUDENT" });
  expect(interrupted).toMatchObject({ status: "PENDING_RECOVERY" }); expect(state.refunded).toBe(5000);
  expect(await db.notification.count({ where: { userId: "student", titleEn: "Lesson refund pending" } })).toBe(1);
  await processPaymentRecovery(db, "payment", { force: true });
  expect(state.refunded).toBe(5000);expect(state.refundCalls).toHaveLength(1);
  expect(await db.refund.count()).toBe(1);expect(await refundTotal(db)).toBe(-5000);
  expect((await db.paymentRecovery.findUniqueOrThrow({ where: { paymentId: "payment" } })).state).toBe("COMPLETE");
}), 30_000);

dbTest("concurrent recovery claims issue one provider refund, one fee return and one ledger reversal", () => withDb(async db => {
  await prepare(db);
  await Promise.all([processPaymentRecovery(db, "payment", { force: true }), processPaymentRecovery(db, "payment", { force: true })]);
  expect(state.refunded).toBe(5000);expect(state.refundCalls).toHaveLength(1);expect(state.feeRefunded).toBe(1000);
  expect(await refundTotal(db)).toBe(-5000);expect(await db.refund.count()).toBe(1);
  const receipt = await db.refund.findFirstOrThrow();expect(receipt.creditNoteNo).toBeTruthy();
  expect(await db.notification.count({ where: { userId: "student", titleEn: "Lesson refunded" } })).toBe(1);
}), 30_000);

dbTest("an expired worker lease can resume; an active lease cannot be stolen", () => withDb(async db => {
  await prepare(db);
  await db.paymentRecovery.update({ where: { paymentId: "payment" }, data: { state: "PROCESSING", leaseToken: "lost-worker", leaseExpiresAt: new Date(Date.now() + 60_000) } });
  expect(await processPaymentRecovery(db, "payment", { force: true })).toMatchObject({ busy: true });
  await db.paymentRecovery.update({ where: { paymentId: "payment" }, data: { leaseExpiresAt: new Date(Date.now() - 1) } });
  await processPaymentRecovery(db, "payment", { force: true });expect(state.refunded).toBe(5000);
}), 30_000);

dbTest("the original captured account survives reconnection and disconnection", () => withDb(async db => {
  await db.teacherPaymentAccount.update({ where: { id: "connection" }, data: { providerAccountId: null } });
  await prepare(db);await processPaymentRecovery(db, "payment", { force: true });
  expect(state.refunded).toBe(5000);expect(state.refundCalls[0][1]).toMatchObject({ stripeAccount: "acct_original" });
}), 30_000);

dbTest("fee failure stays visible after student reimbursement, and fee-only retry never refunds the student again", () => withDb(async db => {
  await prepare(db);state.feeFails = true;await processPaymentRecovery(db, "payment", { force: true });
  expect(await db.refund.findFirst()).toMatchObject({ status: "SUCCEEDED" });
  expect(await db.paymentRecovery.findUnique({ where: { paymentId: "payment" } })).toMatchObject({ feeRecoveryPending: true, state: "WAITING" });
  state.feeFails = false;await processPaymentRecovery(db, "payment", { force: true });
  expect(state.refundCalls).toHaveLength(1);expect(state.feeRefunded).toBe(1000);
  expect((await db.paymentLedgerEntry.aggregate({ where: { paymentId: "payment", type: "PLATFORM_FEE" }, _sum: { amountYen: true } }))._sum.amountYen).toBe(0);
  expect((await db.paymentRecovery.findUniqueOrThrow({ where: { paymentId: "payment" } })).feeRecoveryPending).toBe(false);
}), 30_000);

dbTest("Dashboard full refunds import without app refund creation and repeated events remain idempotent", () => withDb(async db => {
  state.refunds = [external() as unknown as Record<string, unknown>];
  expect((await receiveStripeWebhook(db, webhook())).status).toBe(200);
  expect((await receiveStripeWebhook(db, webhook())).status).toBe(200);
  expect(state.refundCalls).toHaveLength(0);expect(await db.refund.count()).toBe(1);expect(await refundTotal(db)).toBe(-5000);
  expect((await db.booking.findUniqueOrThrow({ where: { id: "booking" } })).status).toBe("CANCELLED");
  expect(await db.notification.count({ where: { userId: "student", titleEn: "Lesson refunded" } })).toBe(1);
}), 30_000);

dbTest("Dashboard partial refunds preserve the reservation and report a partial refund without amounts to the student", () => withDb(async db => {
  state.refunds = [external("re_partial", 1000) as unknown as Record<string, unknown>];
  await recordStripeRefund(db, "acct_original", state.refunds[0] as unknown as Stripe.Refund);
  await processPaymentRecovery(db, "payment", { force: true });
  expect(state.refundCalls).toHaveLength(0);expect(state.feeCalls).toBe(0);expect(await refundTotal(db)).toBe(-1000);
  expect((await db.booking.findUniqueOrThrow({ where: { id: "booking" } })).status).toBe("CONFIRMED");
  const notice = await db.notification.findFirstOrThrow({ where: { userId: "student", titleEn: "Lesson partially refunded" } });
  expect(notice.bodyEn).not.toMatch(/1,000|1000|¥/);
}), 30_000);

dbTest("an old uncertain provider request is reconciled without blindly reissuing after idempotency retention", () => withDb(async db => {
  await prepare(db);await db.paymentRecovery.update({ where: { paymentId: "payment" }, data: {
    requestKey: "old-key", requestAmountYen: 5000, requestStartedAt: new Date(Date.now() - 25 * 3_600_000) } });
  await processPaymentRecovery(db, "payment", { force: true });
  expect(state.refundCalls).toHaveLength(0);
  expect(await db.paymentRecovery.findUnique({ where: { paymentId: "payment" } })).toMatchObject({ state: "NEEDS_ATTENTION" });
}), 30_000);

dbTest("failed webhook processing remains retryable instead of treating receipt as completion", () => withDb(async db => {
  const event = { id: "paid", type: "checkout.session.completed", account: "acct_original", data: { object: {
    id: "cs_original", payment_status: "paid", metadata: { paymentId: "payment", bookingId: "booking" }, payment_intent: "pi_original", amount_total: 1, currency: "jpy" } } };
  expect((await receiveStripeWebhook(db, event)).status).toBe(503);
  expect(await db.paymentWebhookEvent.findFirst()).toMatchObject({ state: "WAITING", completedAt: null });
  // A stored signed event is immutable. Repair processing input in this isolated fault fixture only.
  event.data.object.amount_total = 5000;
  await db.paymentWebhookEvent.updateMany({ data: { payloadJson: event, nextAttemptAt: new Date(0) } });
  expect((await processStoredStripeWebhook(db, "paid", { force: true })).status).toBe(200);
  expect(await db.paymentWebhookEvent.findFirst()).toMatchObject({ state: "COMPLETE" });
}), 30_000);

dbTest("the real cancellation route persists an entitlement and completes without a live provider", () => withDb(async db => {
  state.loseRefundResponse = true;
  const response = await cancel(new Request("http://localhost", { method: "POST", body: JSON.stringify({ intent: "refund" }) }), params);
  expect(response.status).toBe(200);expect((await response.json()).refund.status).toBe("PENDING_RECOVERY");
  expect(await db.paymentRecovery.count()).toBe(1);
  expect((await db.booking.findUniqueOrThrow({ where: { id: "booking" } })).status).toBe("CANCELLED");
}), 30_000);

for (const status of ["pending", "requires_action", "failed", "canceled"] as const) dbTest(`Stripe ${status} stays uncompleted and reverses only active refund ledger entries`, () => withDb(async db => {
  state.refunds = [external("re_dashboard", 5000, status) as unknown as Record<string, unknown>];
  expect((await receiveStripeWebhook(db, webhook())).status).toBe(200);
  const active = ["pending", "requires_action"].includes(status);
  expect(await db.refund.findFirst()).toMatchObject({ status: active ? "PENDING" : "PENDING_RECOVERY", creditNoteNo: null });
  expect(await refundTotal(db)).toBe(active ? -5000 : 0);
  expect(await db.notification.count({ where: { userId: "student", titleEn: "Lesson refunded" } })).toBe(0);
  expect(state.refundCalls).toHaveLength(0);
}), 30_000);

for (const language of ["ENGLISH", "JAPANESE"] as const) dbTest(`${language} policy refund retains the original payment/intent, JPY amount and application-fee reversal`, () => withDb(async db => {
  await db.booking.update({ where: { id: "booking" }, data: { learningLanguage: language } });
  const result = await cancel(new Request("http://localhost", { method: "POST", body: JSON.stringify({ intent: "refund" }) }), params);
  expect(result.status).toBe(200);
  expect((await result.json()).refund).toMatchObject({ status: "SUCCEEDED", amountYen: 5000 });
  expect(state.refundCalls[0]).toEqual([{ payment_intent: "pi_original", amount: 5000, metadata: { paymentId: "payment", bookingId: "booking", recoveryKey: "lesson-refund:payment" } },
    { stripeAccount: "acct_original", idempotencyKey: "lesson-refund:payment" }]);
  expect(state.feeRefunded).toBe(1000);expect(await refundTotal(db)).toBe(-5000);
}), 30_000);

dbTest("teacher discretionary refund and repeated clicks use the same durable full-refund operation", () => withDb(async db => {
  state.session = { user: { id: "teacher-user", role: "TEACHER" } };
  await db.booking.update({ where: { id: "booking" }, data: { status: "CANCELLED", privateRescheduleStatus: "PENDING" } });
  const request = () => new Request("http://localhost", { method: "POST", body: JSON.stringify({ action: "refund" }) });
  expect((await resolve(request(), params)).status).toBe(200);
  expect((await resolve(request(), params)).status).toBe(200);
  expect(state.refundCalls).toHaveLength(1);expect(state.feeRefunded).toBe(1000);
  expect(await db.refund.findFirst()).toMatchObject({ actor: "TEACHER", amountYen: 5000, status: "SUCCEEDED" });
}), 30_000);

dbTest("late cancellation and permanent teacher closure create no payment recovery obligation", () => withDb(async db => {
  await db.booking.update({ where: { id: "booking" }, data: { startsAt: new Date(Date.now() + 24 * 3_600_000) } });
  expect((await cancel(new Request("http://localhost", { method: "POST", body: JSON.stringify({ intent: "request_reschedule" }) }), params)).status).toBe(200);
  expect(await db.paymentRecovery.count()).toBe(0);
  state.session = { user: { id: "teacher-user", role: "TEACHER" } };
  expect((await resolve(new Request("http://localhost", { method: "POST", body: JSON.stringify({ action: "close" }) }), params)).status).toBe(200);
  expect(state.refundCalls).toHaveLength(0);expect(state.feeCalls).toBe(0);expect(await db.paymentRecovery.count()).toBe(0);
}), 30_000);

dbTest("a failed intent write rolls back the real cancellation before money or calendar work", () => withDb(async db => {
    state.failIntent = true;
    await expect(cancel(new Request("http://localhost", { method: "POST", body: JSON.stringify({ intent: "refund" }) }), params)).rejects.toThrow("intent persistence failed");
    expect((await db.booking.findUniqueOrThrow({ where: { id: "booking" } })).status).toBe("CONFIRMED");
    expect(await db.refund.count()).toBe(0);expect(state.refundCalls).toHaveLength(0);
}), 30_000);

dbTest("one failed cancellation notification cannot prevent the durable refund from executing", () => withDb(async db => {
    state.failNotification = true;
    expect((await cancel(new Request("http://localhost", { method: "POST", body: JSON.stringify({ intent: "refund" }) }), params)).status).toBe(200);
    expect(state.refunded).toBe(5000);expect((await db.paymentRecovery.findUniqueOrThrow({ where: { paymentId: "payment" } })).state).toBe("COMPLETE");
}), 30_000);

dbTest("webhook replay resumes fulfillment after an invoice failure without recharging or rewriting the document", () => withDb(async db => {
  await db.booking.update({ where: { id: "booking" }, data: { status: "PENDING_PAYMENT" } });
  await db.payment.update({ where: { id: "payment" }, data: { status: "REQUIRES_ACTION" } });
  const event = { id: "paid-retry", type: "checkout.session.completed", account: "acct_original", data: { object: {
    id: "cs_original", payment_status: "paid", payment_intent: "pi_original", amount_total: 5000, currency: "jpy", metadata: { paymentId: "payment", bookingId: "booking" } } } };
    state.failInvoice = true;
    expect((await receiveStripeWebhook(db, event)).status).toBe(503);
    expect((await db.payment.findUniqueOrThrow({ where: { id: "payment" } })).fulfillmentCompletedAt).toBeNull();
    expect((await processStoredStripeWebhook(db, event.id, { force: true })).status).toBe(200);
    expect((await db.payment.findUniqueOrThrow({ where: { id: "payment" } })).fulfillmentCompletedAt).toBeTruthy();
    expect(await db.invoice.count()).toBe(1);expect(await db.notification.count({ where: { userId: "student", titleEn: "Payment completed" } })).toBe(1);
    expect(state.refundCalls).toHaveLength(0);
}), 30_000);

dbTest("a Dashboard refund arriving before the checkout update links by authoritative intent metadata", () => withDb(async db => {
  await db.payment.update({ where: { id: "payment" }, data: { providerPaymentId: null } });state.refunds = [external() as unknown as Record<string, unknown>];
  expect((await receiveStripeWebhook(db, webhook())).status).toBe(200);
  expect((await db.payment.findUniqueOrThrow({ where: { id: "payment" } })).providerPaymentId).toBe("pi_original");
  expect(await refundTotal(db)).toBe(-5000);expect(state.refundCalls).toHaveLength(0);
}), 30_000);

dbTest("out-of-order webhook payloads use Stripe's current refund status", () => withDb(async db => {
  state.refunds = [external() as unknown as Record<string, unknown>];
  await receiveStripeWebhook(db, webhook("newer"));
  await receiveStripeWebhook(db, webhook("old-pending"));
  expect(await db.refund.findFirst()).toMatchObject({ status: "SUCCEEDED" });expect(await refundTotal(db)).toBe(-5000);
}), 30_000);

dbTest("a wrong connected account cannot import or issue a refund for another payment", () => withDb(async db => {
  state.refunds = [external() as unknown as Record<string, unknown>];
  expect((await receiveStripeWebhook(db, { ...webhook(), account: "acct_someone_else" })).status).toBe(200);
  expect(await db.refund.count()).toBe(0);expect(state.refundCalls).toHaveLength(0);expect(await db.paymentRecovery.count()).toBe(0);
}), 30_000);

dbTest("concurrent deliveries cannot process the same stored event twice", () => withDb(async db => {
  state.refunds = [external() as unknown as Record<string, unknown>];
  let release!: () => void;state.barrier = new Promise<void>(resolve => { release = resolve; });
  const first = receiveStripeWebhook(db, webhook());
  try {
    await vi.waitFor(async () => expect((await db.paymentWebhookEvent.findFirst())?.state).toBe("PROCESSING"));
    expect((await receiveStripeWebhook(db, webhook())).status).toBe(503);
  } finally {release();state.barrier = null;}
  expect((await first).status).toBe(200);expect(await db.refund.count()).toBe(1);expect(await refundTotal(db)).toBe(-5000);
}), 30_000);

dbTest("work arriving while a lease is held is requeued rather than overwritten by completion", () => withDb(async db => {
  await prepare(db);let release!: () => void;state.barrier = new Promise<void>(resolve => { release = resolve; });
  const first = processPaymentRecovery(db, "payment", { force: true });
  try {
    await vi.waitFor(async () => expect((await db.paymentRecovery.findUnique({ where: { paymentId: "payment" } }))?.state).toBe("PROCESSING"));
    state.refunds = [external() as unknown as Record<string, unknown>];await recordStripeRefund(db, "acct_original", external());
  } finally {release();state.barrier = null;}
  await first;expect((await db.paymentRecovery.findUniqueOrThrow({ where: { paymentId: "payment" } })).state).toBe("QUEUED");
  await processPaymentRecovery(db, "payment", { force: true });expect(state.refundCalls).toHaveLength(0);
}), 30_000);

dbTest("credit-note assignment is stable under concurrent fulfillment", () => withDb(async db => {
  const refund = await db.refund.create({ data: { bookingId: "booking", paymentId: "payment", provider: "STRIPE", providerRefundId: "re_existing", amountYen: 5000, status: "SUCCEEDED", actor: "STRIPE", reason: "STRIPE_DASHBOARD" } });
  const numbers = await Promise.all([ensureCreditNoteNumber(refund.id), ensureCreditNoteNumber(refund.id)]);
  expect(numbers[0]).toBeTruthy();expect(numbers[0]).toBe(numbers[1]);
}), 30_000);

dbTest("a payment with no application fee has no fee reversal", () => withDb(async db => {
  state.hasFee = false;await prepare(db);await processPaymentRecovery(db, "payment", { force: true });
  expect(state.feeCalls).toBe(0);expect(state.refunded).toBe(5000);
}), 30_000);

dbTest("only an explicit admin recovery can replace a confirmed failed refund, once", () => withDb(async db => {
  await prepare(db);state.createStatus = "failed";await processPaymentRecovery(db, "payment", { force: true });
  expect(state.refunded).toBe(0);await processPaymentRecovery(db, "payment", { force: true });expect(state.refundCalls).toHaveLength(1);
  state.createStatus = "succeeded";await recoverPayment(db, "payment");
  expect(state.refunded).toBe(5000);expect(state.refundCalls).toHaveLength(2);
  expect(state.refundCalls[1][1]).toMatchObject({ idempotencyKey: "lesson-refund:payment:attempt:1" });
  expect(await refundTotal(db)).toBe(-5000);expect((await db.paymentRecovery.findUniqueOrThrow({ where: { paymentId: "payment" } })).state).toBe("COMPLETE");
  state.session = { user: { id: "admin", role: "SUPER_ADMIN" } };
  expect((await (await adminRefunds(new Request("http://localhost"))).json()).items).toHaveLength(0);
}), 30_000);

dbTest("a scheduled recovery pass resumes a durable obligation after the cancellation request has ended", () => withDb(async db => {
  await prepare(db);const summary = await runPaymentRecoveryBatch(db);
  expect(summary.refunds).toHaveLength(1);expect(state.refunded).toBe(5000);
  expect((await db.paymentRecovery.findUniqueOrThrow({ where: { paymentId: "payment" } })).state).toBe("COMPLETE");
}), 30_000);

dbTest("admin fee recovery remains visible after student settlement and disappears only when reconciled", () => withDb(async db => {
  await prepare(db);state.feeFails = true;await processPaymentRecovery(db, "payment", { force: true });
  state.session = { user: { id: "admin", role: "SUPER_ADMIN" } };
  const pending = await (await adminRefunds(new Request("http://localhost"))).json();
  expect(pending.items).toHaveLength(1);expect(pending.items[0]).toMatchObject({ status: "SUCCEEDED", feeRecoveryPending: true, paymentId: "payment" });
  state.feeFails = false;await recoverPayment(db, "payment");
  expect((await (await adminRefunds(new Request("http://localhost"))).json()).items).toHaveLength(0);
  expect(state.refunded).toBe(5000);
}), 30_000);

dbTest("cash collected after an unpaid cancellation is queued for refund without reviving its reservation", () => withDb(async db => {
  await db.booking.update({ where: { id: "booking" }, data: { status: "CANCELLED", cancelledFromStatus: "PENDING_PAYMENT" } });
  await db.payment.update({ where: { id: "payment" }, data: { status: "REQUIRES_ACTION" } });
  const event = { id: "late-paid", type: "checkout.session.completed", account: "acct_original", data: { object: { id: "cs_original", payment_status: "paid", payment_intent: "pi_original",
    metadata: { paymentId: "payment", bookingId: "booking" }, amount_total: 5000, currency: "jpy" } } };
  expect((await receiveStripeWebhook(db, event)).status).toBe(200);
  expect((await db.booking.findUniqueOrThrow({ where: { id: "booking" } })).status).toBe("CANCELLED");
  expect(await db.paymentRecovery.findUnique({ where: { paymentId: "payment" } })).toMatchObject({ requestedAmountYen: 5000 });
  await runPaymentRecoveryBatch(db);expect(state.refunded).toBe(5000);
}), 30_000);

dbTest("a delayed paid message cannot grant a refund for a confirmed lesson cancelled inside 48 hours", () => withDb(async db => {
  await db.booking.update({ where: { id: "booking" }, data: { status: "CANCELLED", cancelledFromStatus: "CONFIRMED", privateRescheduleStatus: "PENDING" } });
  const event = { id: "duplicate-paid", type: "checkout.session.completed", account: "acct_original", data: { object: { id: "cs_original", payment_status: "paid", payment_intent: "pi_original",
    metadata: { paymentId: "payment", bookingId: "booking" }, amount_total: 5000, currency: "jpy" } } };
  expect((await receiveStripeWebhook(db, event)).status).toBe(200);expect(await db.paymentRecovery.count()).toBe(0);expect(state.refunded).toBe(0);
}), 30_000);

dbTest("the recovery migration preserves historical money, documents and receipt identities", async () => {
  await withIsolatedPostgres("20261102020000_durable_payment_recovery", async ({ client, applyMigration, verifyDatamodel }) => {
    await client.query(`
      INSERT INTO "User" (id, role, "updatedAt") VALUES ('student', 'STUDENT', NOW()), ('teacher-user', 'TEACHER', NOW());
      INSERT INTO "TeacherProfile" (id, "userId") VALUES ('teacher', 'teacher-user');
      INSERT INTO "LessonProduct" (id, tier, "durationMin", "nameEn", "nameJa") VALUES ('product', 'EIKAWA', 60, 'Lesson', 'レッスン');
      INSERT INTO "Booking" (id, "studentId", "teacherId", "lessonProductId", "startsAt", "endsAt", status, "quotedPriceYen", "updatedAt") VALUES ('booking', 'student', 'teacher', 'product', NOW(), NOW() + INTERVAL '1 hour', 'CONFIRMED', 5000, NOW());
      INSERT INTO "Payment" (id, "bookingId", "studentId", "teacherId", provider, method, "amountYen", status, "idempotencyKey", "providerPaymentId", "metadataJson", "paidAt", "updatedAt") VALUES ('payment', 'booking', 'student', 'teacher', 'STRIPE', 'CARD', 5000, 'SUCCEEDED', 'original-key', 'pi_old', '{"connectedAccountId":"acct_old"}', NOW(), NOW());
      INSERT INTO "Invoice" (id, "bookingId", "studentId", "amountYen", "invoiceNo", "paidAt") VALUES ('invoice', 'booking', 'student', 5000, 'INV-UNCHANGED', NOW());
      INSERT INTO "Refund" (id, "bookingId", "paymentId", provider, "providerRefundId", "amountYen", status, actor, reason, "updatedAt") VALUES ('legacy-1', 'booking', 'payment', 'STRIPE', 're_old', 5000, 'SUCCEEDED', 'TEACHER', 'CANCELLATION_POLICY', NOW()), ('legacy-2', 'booking', 'payment', 'STRIPE', 're_old', 5000, 'SUCCEEDED', 'TEACHER', 'CANCELLATION_POLICY', NOW());
      INSERT INTO "PaymentWebhookEvent" (id, provider, "providerEventId", "eventType", "payloadJson") VALUES ('receipt', 'STRIPE', 'evt_old', 'checkout.session.completed', '{}');
    `);
    const before = (await client.query('SELECT * FROM "Payment"')).rows[0];
    const documents = (await client.query('SELECT * FROM "Invoice"')).rows;
    const refunds = (await client.query('SELECT * FROM "Refund" ORDER BY id')).rows;
    await applyMigration();
    expect((await client.query('SELECT * FROM "Payment"')).rows[0]).toEqual({ ...before,
      fulfillmentCompletedAt: before.paidAt, fulfillmentLeaseToken: null, fulfillmentLeaseExpiresAt: null });
    expect((await client.query('SELECT * FROM "Invoice"')).rows).toEqual(documents);
    expect((await client.query('SELECT * FROM "Refund" ORDER BY id')).rows).toEqual(refunds.map(row => ({ ...row, providerAccountId: null, requestKey: null })));
    const receipt = (await client.query('SELECT * FROM "PaymentWebhookEvent"')).rows[0];
    expect(receipt.state).toBe("COMPLETE");expect(receipt.completedAt).toEqual(receipt.processedAt);
    expect((await client.query('SELECT * FROM "PaymentRecovery"')).rows).toHaveLength(0);
    await verifyDatamodel();
  });
}, 30_000);

dbTest("signed webhook entry retries a received-but-interrupted checkout instead of discarding it", () => withDb(async db => {
  await db.booking.update({ where: { id: "booking" }, data: { status: "PENDING_PAYMENT" } });
  await db.payment.update({ where: { id: "payment" }, data: { status: "REQUIRES_ACTION" } });
  const event = { id: "evt_signed_paid", type: "checkout.session.completed", account: "acct_original", data: { object: {
    id: "cs_original", payment_status: "paid", payment_intent: "pi_original", amount_total: 5000, currency: "jpy", metadata: { paymentId: "payment", bookingId: "booking" } } } };
  state.failInvoice = true;
  const first = await signedDelivery(event).catch(() => new Response(null, { status: 503 }));expect(first.status).toBeGreaterThanOrEqual(400);
  await db.paymentWebhookEvent.updateMany({ data: { nextAttemptAt: new Date(0) } });
  expect((await signedDelivery(event)).status).toBe(200);expect(await db.invoice.count()).toBe(1);
  expect((await db.payment.findUniqueOrThrow({ where: { id: "payment" } })).fulfillmentCompletedAt).toBeTruthy();
}), 30_000);

dbTest("signed Dashboard refund delivery creates its missing local receipt and ledger entry", () => withDb(async db => {
  state.refunds = [external() as unknown as Record<string, unknown>];
  expect((await signedDelivery({ ...webhook(), data: { object: external() } })).status).toBe(200);
  expect(await db.refund.count()).toBe(1);expect(await refundTotal(db)).toBe(-5000);expect(state.refundCalls).toHaveLength(0);
}), 30_000);

dbTest("historical duplicate fee reversals are corrected once without deleting the audit trail", () => withDb(async db => {
  state.refunds = [external() as unknown as Record<string, unknown>];state.feeRefunded = 1000;
  await db.paymentLedgerEntry.createMany({ data: [{ paymentId: "payment", type: "PLATFORM_FEE", amountYen: -1000 }, { paymentId: "payment", type: "PLATFORM_FEE", amountYen: -1000 }] });
  await prepare(db);await processPaymentRecovery(db, "payment", { force: true });
  const count = await db.paymentLedgerEntry.count();
  await processPaymentRecovery(db, "payment", { force: true });expect(await db.paymentLedgerEntry.count()).toBe(count);
  expect((await db.paymentLedgerEntry.aggregate({ where: { paymentId: "payment", type: "PLATFORM_FEE" }, _sum: { amountYen: true } }))._sum.amountYen).toBe(0);
  expect(state.feeCalls).toBe(0);expect(state.refundCalls).toHaveLength(0);
}), 30_000);
