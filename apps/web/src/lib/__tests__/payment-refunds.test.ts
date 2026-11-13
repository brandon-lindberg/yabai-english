// Provider amounts, snapshots, ledger and interruption tests now use real isolated PostgreSQL.
import { beforeEach, expect, test, vi } from "vitest";
import type { PrismaClient } from "@/generated/prisma/client";
const mocks = vi.hoisted(() => ({ prepare: vi.fn(), process: vi.fn(), stored: vi.fn() }));
vi.mock("@/lib/prisma", () => ({ prisma: {} }));
vi.mock("@/lib/payment-recovery", async original => ({ ...await original<object>(), prepareBookingRefund: mocks.prepare,
  processPaymentRecovery: mocks.process, recoveryRefund: mocks.stored }));
import { issueAutomaticRefundForBooking, mapStripeRefundStatus } from "../payment-refunds";
const booking = { id: "booking", quotedPriceYen: 5000 };
const policy = { allowed: true, refundEligible: true, rescheduleOffered: false };
const tx = {};
const db = { $transaction: vi.fn(async (run: (context: unknown) => unknown) => run(tx)) } as unknown as PrismaClient;
beforeEach(() => { vi.clearAllMocks(); mocks.prepare.mockResolvedValue({ paymentId: "payment" }); mocks.process.mockResolvedValue({ ok: true });
  mocks.stored.mockResolvedValue({ id: "refund", status: "SUCCEEDED", amountYen: 5000 }); });
test("ineligible cancellation never queues or processes money", async () => {
  expect(await issueAutomaticRefundForBooking(db, { booking, policy: { ...policy, refundEligible: false }, actor: "STUDENT" })).toBeNull();
  expect(mocks.prepare).not.toHaveBeenCalled(); expect(mocks.process).not.toHaveBeenCalled();
});
test("no paid obligation means no provider processing", async () => {
  mocks.prepare.mockResolvedValue(null);
  expect(await issueAutomaticRefundForBooking(db, { booking, policy, actor: "STUDENT" })).toBeNull(); expect(mocks.process).not.toHaveBeenCalled();
});
test("a durable obligation is committed before the shared processor runs", async () => {
  expect(await issueAutomaticRefundForBooking(db, { booking, policy, actor: "TEACHER" })).toMatchObject({ status: "SUCCEEDED" });
  expect(mocks.prepare).toHaveBeenCalledWith(tx, { booking, policy, actor: "TEACHER" });
  expect(mocks.process).toHaveBeenCalledWith(db, "payment", { force: true });
  expect(mocks.prepare.mock.invocationCallOrder[0]).toBeLessThan(mocks.process.mock.invocationCallOrder[0]);
});
test("failure to persist an obligation prevents the provider request", async () => {
  mocks.prepare.mockRejectedValue(new Error("database unavailable"));
  await expect(issueAutomaticRefundForBooking(db, { booking, policy, actor: "STUDENT" })).rejects.toThrow("database unavailable");
  expect(mocks.process).not.toHaveBeenCalled();
});
test("an interrupted processor returns the actual saved pending outcome", async () => {
  mocks.stored.mockResolvedValue({ id: "refund", status: "PENDING_RECOVERY", amountYen: 5000 });
  expect(await issueAutomaticRefundForBooking(db, { booking, policy, actor: "STUDENT" })).toMatchObject({ status: "PENDING_RECOVERY" });
});
test.each([["succeeded", "SUCCEEDED"], ["pending", "PENDING"], ["requires_action", "PENDING"], ["failed", "FAILED"], ["canceled", "FAILED"]])("maps Stripe %s truthfully", (source, expected) => {
  expect(mapStripeRefundStatus(source)).toBe(expected);
});
