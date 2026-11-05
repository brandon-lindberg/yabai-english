vi.mock("@/lib/payment-recovery", () => ({ prepareBookingRefund: vi.fn().mockResolvedValue(null) }));
import { beforeEach, expect, test, vi } from "vitest";
const mocks = vi.hoisted(() => ({ auth: vi.fn(), booking: vi.fn(), update: vi.fn(), existingRefund: vi.fn(), refund: vi.fn(), notify: vi.fn() }));
vi.mock("@/auth", () => ({ auth: mocks.auth }));
vi.mock("@/lib/prisma", () => ({ prisma: { $transaction: async (run: (tx: unknown) => unknown) => run({ booking: { updateMany: mocks.update } }), booking: { findUnique: mocks.booking, updateMany: mocks.update }, refund: { findFirst: mocks.existingRefund } } }));
vi.mock("@/lib/payment-refunds", () => ({ issueAutomaticRefundForBooking: mocks.refund }));
vi.mock("@/lib/private-booking-notifications", () => ({ notifyPrivateBookingEvent: mocks.notify }));
vi.mock("@/lib/refund-notifications", () => ({ notifySuperAdminsOfStuckRefund: vi.fn() }));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
import { POST } from "../route";
const params = { params: Promise.resolve({ bookingId: "booking" }) };
const request = (action: string) => new Request("http://localhost", { method: "POST", body: JSON.stringify({ action }) });
beforeEach(() => {
  vi.clearAllMocks();
  mocks.auth.mockResolvedValue({ user: { id: "teacher", role: "TEACHER" } });
  mocks.booking.mockResolvedValue({ id: "booking", status: "CANCELLED", privateRescheduleStatus: "PENDING", rescheduleResolvedAt: null,
    teacher: { userId: "teacher" }, student: { name: "Learner" }, quotedPriceYen: 5000, payments: [{ id: "payment", status: "SUCCEEDED", amountYen: 5000 }] });
  mocks.update.mockResolvedValue({ count: 1 }); mocks.existingRefund.mockResolvedValue(null);
  mocks.refund.mockResolvedValue({ id: "refund", status: "SUCCEEDED", amountYen: 5000 });
});
test("the student cannot see or invoke discretionary refund resolution", async () => {
  mocks.auth.mockResolvedValue({ user: { id: "student", role: "STUDENT" } });
  expect((await POST(request("refund"), params)).status).toBe(404);
  expect(mocks.booking).not.toHaveBeenCalled(); expect(mocks.refund).not.toHaveBeenCalled();
});
test("another teacher cannot resolve the request", async () => {
  mocks.auth.mockResolvedValue({ user: { id: "other", role: "TEACHER" } });
  expect((await POST(request("close"), params)).status).toBe(404);
  expect(mocks.update).not.toHaveBeenCalled();
});
test("the owning teacher can permanently cancel without issuing a refund", async () => {
  expect((await POST(request("close"), params)).status).toBe(200);
  expect(mocks.update).toHaveBeenCalledWith(expect.objectContaining({ where: expect.objectContaining({ privateRescheduleStatus: "PENDING" }),
    data: expect.objectContaining({ privateRescheduleStatus: "CLOSED" }) }));
  expect(mocks.refund).not.toHaveBeenCalled();
  expect(mocks.notify).toHaveBeenCalledWith(expect.objectContaining({ event: "reschedule_closed" }));
});
test("a discretionary refund claims the request and reuses the full-refund service", async () => {
  expect((await POST(request("refund"), params)).status).toBe(200);
  expect(mocks.update).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ privateRescheduleStatus: "REFUND_REQUESTED" }) }));
  expect(mocks.refund).toHaveBeenCalledWith(expect.anything(), expect.objectContaining({ actor: "TEACHER", policy: expect.objectContaining({ refundEligible: true }) }));
});
test("an admin resolution retains its admin actor in the refund audit", async () => {
  mocks.auth.mockResolvedValue({ user: { id: "admin", role: "SUPER_ADMIN" } });
  expect((await POST(request("refund"), params)).status).toBe(200);
  expect(mocks.refund).toHaveBeenCalledWith(expect.anything(), expect.objectContaining({ actor: "SUPER_ADMIN" }));
});
test("a competing resolution cannot issue another refund", async () => {
  mocks.update.mockResolvedValue({ count: 0 });
  expect((await POST(request("refund"), params)).status).toBe(409);
  expect(mocks.refund).not.toHaveBeenCalled();
});
test("a recorded discretionary refund is returned on retry without issuing money again", async () => {
  mocks.booking.mockResolvedValue({ id: "booking", status: "CANCELLED", privateRescheduleStatus: "REFUND_REQUESTED", teacher: { userId: "teacher" }, payments: [{ id: "payment", status: "SUCCEEDED", amountYen: 5000 }] });
  mocks.existingRefund.mockResolvedValue({ id: "refund", status: "SUCCEEDED" });
  expect((await POST(request("refund"), params)).status).toBe(200);
  expect(mocks.refund).toHaveBeenCalledTimes(1); // Shared service reconciles without reissuing; covered by the DB suite.
});
test("a failed provider call keeps the refund decision locked and allows a safe retry", async () => {
  mocks.refund.mockRejectedValueOnce(new Error("provider unavailable"));
  expect((await POST(request("refund"), params)).status).toBe(502);
  expect(mocks.update).toHaveBeenLastCalledWith(expect.objectContaining({
    where: expect.objectContaining({ privateRescheduleStatus: "REFUND_REQUESTED" }), data: { rescheduleResolvedAt: null },
  }));
  mocks.booking.mockResolvedValue({ id: "booking", status: "CANCELLED", privateRescheduleStatus: "REFUND_REQUESTED", rescheduleResolvedAt: null,
    teacher: { userId: "teacher" }, student: { name: "Learner" }, quotedPriceYen: 5000, payments: [{ status: "SUCCEEDED", amountYen: 5000 }] });
  expect((await POST(request("refund"), params)).status).toBe(200);
});
test("an uncertain refund decision cannot be replaced with permanent closure", async () => {
  mocks.booking.mockResolvedValue({ id: "booking", status: "CANCELLED", privateRescheduleStatus: "REFUND_REQUESTED", teacher: { userId: "teacher" } });
  expect((await POST(request("close"), params)).status).toBe(409);
  expect(mocks.update).not.toHaveBeenCalled();
});
