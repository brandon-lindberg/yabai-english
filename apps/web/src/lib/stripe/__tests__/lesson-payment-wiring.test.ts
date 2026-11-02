import { afterEach, beforeEach, expect, test, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  auth: vi.fn(), bookingRead: vi.fn(), bookingUpdate: vi.fn(), bookingClaim: vi.fn(),
  paymentUpdate: vi.fn(), refundRead: vi.fn(), refundCreate: vi.fn(), ledger: vi.fn(),
  checkout: vi.fn(), refund: vi.fn(), intent: vi.fn(), fee: vi.fn(), feeRefund: vi.fn(),
  notify: vi.fn(), creditNote: vi.fn(),
}));
vi.mock("server-only", () => ({}));
vi.mock("@/auth", () => ({ auth: mocks.auth }));
vi.mock("stripe", () => ({ default: class {
  checkout = { sessions: { create: mocks.checkout } };
  refunds = { create: mocks.refund };
  paymentIntents = { retrieve: mocks.intent };
  applicationFees = { retrieve: mocks.fee, createRefund: mocks.feeRefund };
} }));
vi.mock("@/lib/prisma", () => {
  const db = {
    booking: { findUnique: mocks.bookingRead, update: mocks.bookingUpdate, updateMany: mocks.bookingClaim },
    studentProfile: { upsert: vi.fn() },
    payment: { update: mocks.paymentUpdate },
    refund: { findFirst: mocks.refundRead, create: mocks.refundCreate },
    paymentLedgerEntry: { deleteMany: vi.fn(), createMany: mocks.ledger },
  };
  return { prisma: { ...db, $transaction: (callback: (tx: typeof db) => unknown) => callback(db) } };
});
vi.mock("@/lib/platform-fees", () => ({ calculateMonthlyPlatformFeeForTeacher: vi.fn().mockResolvedValue({
  applicationFeeAmountYen: 1000, periodStart: new Date("2026-11-01T00:00:00Z"), periodEnd: new Date("2026-12-01T00:00:00Z"),
}) }));
vi.mock("@/lib/google-calendar", () => ({ deleteMeetLessonEvent: vi.fn(), removeMeetLessonEventAttendee: vi.fn() }));
vi.mock("@/lib/private-booking-notifications", () => ({ notifyPrivateBookingEvent: mocks.notify }));
vi.mock("@/lib/refund-notifications", () => ({ notifySuperAdminsOfStuckRefund: vi.fn() }));
vi.mock("@/lib/credit-notes", () => ({ ensureCreditNoteNumber: mocks.creditNote }));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));

import { POST as pay } from "@/app/api/bookings/[bookingId]/pay/route";
import { POST as cancel } from "@/app/api/bookings/[bookingId]/cancel/route";
import { POST as resolve } from "@/app/api/bookings/[bookingId]/reschedule-request/route";

const params = { params: Promise.resolve({ bookingId: "booking" }) };
const request = (body: unknown = {}) => new Request("http://localhost", { method: "POST", body: JSON.stringify(body) });
function booking(language: "ENGLISH" | "JAPANESE" = "JAPANESE") {
  return {
    id: "booking", studentId: "student", teacherId: "teacher-profile", status: "CONFIRMED",
    learningLanguage: language, quotedPriceYen: 5000, rescheduleCount: 0, privateRescheduleStatus: null,
    groupLessonSessionId: null, startsAt: new Date(Date.now() + 72 * 3_600_000), endsAt: new Date(Date.now() + 73 * 3_600_000),
    holdExpiresAt: new Date(Date.now() + 600_000),
    student: { name: "Learner", email: "learner@example.invalid" }, teacher: { userId: "teacher" },
    lessonProduct: { tier: "EIKAWA", durationMin: 60, nameEn: "Eikaiwa", nameJa: "英会話" },
    payments: [{ id: "payment", provider: "STRIPE", status: "SUCCEEDED", amountYen: 5000, method: "CARD",
      providerPaymentId: "pi_original", teacherPaymentAccount: { providerAccountId: "acct_teacher" } }],
  };
}
beforeEach(() => {
  vi.clearAllMocks(); vi.stubEnv("STRIPE_SECRET_KEY", "sk_test_mock_only");
  mocks.auth.mockResolvedValue({ user: { id: "student", role: "STUDENT" } });
  mocks.bookingRead.mockResolvedValue(booking());
  mocks.bookingUpdate.mockResolvedValue({ id: "booking", status: "CANCELLED" });
  mocks.bookingClaim.mockResolvedValue({ count: 1 });
  mocks.refundRead.mockResolvedValue(null);
  mocks.refundCreate.mockImplementation(async ({ data }) => ({ id: "stored-refund", ...data }));
  mocks.paymentUpdate.mockImplementation(async ({ data }) => ({ id: "payment", provider: "STRIPE", method: "CARD", ...data }));
  mocks.checkout.mockResolvedValue({ id: "cs_original", url: "https://checkout.stripe.com/example", payment_intent: "pi_original" });
  mocks.refund.mockResolvedValue({ id: "re_original", status: "succeeded" });
  mocks.intent.mockResolvedValue({ latest_charge: { id: "ch_original", application_fee: "fee_original" } });
  mocks.fee.mockResolvedValue({ amount: 1000, amount_refunded: 0 });
  mocks.feeRefund.mockResolvedValue({ id: "fee_refund", amount: 1000 });
});
afterEach(() => vi.unstubAllEnvs());

test.each(["ENGLISH", "JAPANESE"] as const)("%s checkout routes the full JPY price and fee to the teacher's original connected account", async language => {
  const original = booking(language); original.status = "PENDING_PAYMENT"; original.payments[0].status = "CREATED";
  mocks.bookingRead.mockResolvedValue(original);
  expect((await pay(request({ acceptedMarketplaceTerms: true }), params)).status).toBe(200);
  expect(mocks.checkout).toHaveBeenCalledWith(expect.objectContaining({
    mode: "payment", line_items: [{ quantity: 1, price_data: { currency: "jpy", unit_amount: 5000,
      product_data: { name: language === "JAPANESE" ? "Japanese conversation — 60 min" : "Eikaiwa" } } }],
    payment_intent_data: { application_fee_amount: 1000, metadata: { bookingId: "booking", paymentId: "payment" } },
    metadata: { bookingId: "booking", paymentId: "payment" },
  }), { stripeAccount: "acct_teacher" });
  expect(mocks.paymentUpdate).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({
    providerCheckoutId: "cs_original", providerPaymentId: "pi_original",
    metadataJson: expect.objectContaining({ chargeType: "DIRECT_CHARGE", connectedAccountId: "acct_teacher" }),
  }) }));
  expect(mocks.refund).not.toHaveBeenCalled();
});

test("reopening an existing checkout reuses its session without creating another charge", async () => {
  const original = booking(); original.status = "PENDING_PAYMENT";
  original.payments[0] = { ...original.payments[0], status: "REQUIRES_ACTION", providerCheckoutId: "cs_existing", checkoutUrl: "https://checkout.stripe.com/existing" } as typeof original.payments[0];
  mocks.bookingRead.mockResolvedValue(original);
  const response = await pay(request({ acceptedMarketplaceTerms: true }), params);
  expect(response.status).toBe(200); expect((await response.json()).checkoutUrl).toContain("/existing");
  expect(mocks.checkout).not.toHaveBeenCalled(); expect(mocks.refund).not.toHaveBeenCalled();
});

test.each(["ENGLISH", "JAPANESE"] as const)("%s policy cancellation refunds the original intent in full and returns its fee on the platform", async language => {
  mocks.bookingRead.mockResolvedValue(booking(language));
  const response = await cancel(request({ intent: "refund" }), params);
  expect(response.status).toBe(200); expect((await response.json()).refund).toMatchObject({ status: "SUCCEEDED", amountYen: 5000 });
  expect(mocks.refund).toHaveBeenCalledWith({ payment_intent: "pi_original", amount: 5000, metadata: { paymentId: "payment", bookingId: "booking" } },
    { stripeAccount: "acct_teacher", idempotencyKey: "lesson-refund:payment" });
  expect(mocks.intent).toHaveBeenCalledWith("pi_original", { expand: ["latest_charge"] }, { stripeAccount: "acct_teacher" });
  expect(mocks.feeRefund).toHaveBeenCalledWith("fee_original", { amount: 1000, metadata: { paymentId: "payment", bookingId: "booking" } });
  expect(mocks.ledger).toHaveBeenCalledWith({ data: [
    { paymentId: "payment", type: "REFUND", amountYen: -5000 },
    expect.objectContaining({ paymentId: "payment", type: "PLATFORM_FEE", amountYen: -1000 }),
  ] });
  expect(mocks.checkout).not.toHaveBeenCalled();
});

test("teacher-initiated refund uses exactly the same original intent, connected account and full amount", async () => {
  mocks.auth.mockResolvedValue({ user: { id: "teacher", role: "TEACHER" } });
  mocks.bookingRead.mockResolvedValue({ ...booking(), status: "CANCELLED", privateRescheduleStatus: "PENDING", rescheduleResolvedAt: null });
  expect((await resolve(request({ action: "refund" }), params)).status).toBe(200);
  expect(mocks.refund).toHaveBeenCalledWith(expect.objectContaining({ payment_intent: "pi_original", amount: 5000 }),
    { stripeAccount: "acct_teacher", idempotencyKey: "lesson-refund:payment" });
  expect(mocks.refundCreate).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({
    bookingId: "booking", paymentId: "payment", actor: "TEACHER", status: "SUCCEEDED", providerRefundId: "re_original",
  }) }));
  expect(mocks.feeRefund).toHaveBeenCalledTimes(1); expect(mocks.checkout).not.toHaveBeenCalled();
});

test("retrying a recorded teacher refund never invokes Stripe again", async () => {
  mocks.auth.mockResolvedValue({ user: { id: "teacher", role: "TEACHER" } });
  mocks.bookingRead.mockResolvedValue({ ...booking(), status: "CANCELLED", privateRescheduleStatus: "REFUND_REQUESTED" });
  mocks.refundRead.mockResolvedValue({ id: "stored-refund", status: "SUCCEEDED" });
  expect((await resolve(request({ action: "refund" }), params)).status).toBe(200);
  expect(mocks.refund).not.toHaveBeenCalled(); expect(mocks.feeRefund).not.toHaveBeenCalled();
});

test.each(["pending", "requires_action"])("a Stripe %s refund stays pending in the response and notification", async status => {
  mocks.refund.mockResolvedValue({ id: "re_original", status });
  const response = await cancel(request({ intent: "refund" }), params);
  expect((await response.json()).refund.status).toBe("PENDING");
  expect(mocks.notify).toHaveBeenCalledWith(expect.objectContaining({ event: "refund", refund: expect.objectContaining({ status: "PENDING" }) }));
});

test("late student cancellation requests a replacement without touching Stripe", async () => {
  mocks.bookingRead.mockResolvedValue({ ...booking(), startsAt: new Date(Date.now() + 24 * 3_600_000) });
  expect((await cancel(request({ intent: "request_reschedule" }), params)).status).toBe(200);
  expect(mocks.refund).not.toHaveBeenCalled(); expect(mocks.feeRefund).not.toHaveBeenCalled(); expect(mocks.checkout).not.toHaveBeenCalled();
});

test("permanently closing a late request never invokes payment or refund APIs", async () => {
  mocks.auth.mockResolvedValue({ user: { id: "teacher", role: "TEACHER" } });
  mocks.bookingRead.mockResolvedValue({ ...booking(), status: "CANCELLED", privateRescheduleStatus: "PENDING" });
  expect((await resolve(request({ action: "close" }), params)).status).toBe(200);
  expect(mocks.refund).not.toHaveBeenCalled(); expect(mocks.feeRefund).not.toHaveBeenCalled(); expect(mocks.checkout).not.toHaveBeenCalled();
});
