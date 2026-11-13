import { beforeEach, expect, test, vi } from "vitest";
const mocks = vi.hoisted(() => ({ auth: vi.fn(), read: vi.fn(), recover: vi.fn(), replay: vi.fn() }));
vi.mock("@/auth", () => ({ auth: mocks.auth }));
vi.mock("@/lib/prisma", () => ({ prisma: { paymentWebhookEvent: { findMany: mocks.read } } }));
vi.mock("@/lib/payment-recovery-batch", () => ({ recoverPayment: mocks.recover }));
vi.mock("@/lib/stripe/webhook-work", () => ({ processStoredStripeWebhook: mocks.replay }));
import { GET, POST } from "../route";
beforeEach(() => {vi.clearAllMocks();mocks.auth.mockResolvedValue({ user: { id: "admin", role: "SUPER_ADMIN" } });mocks.recover.mockResolvedValue({ state: "COMPLETE" });});
const req = (data: unknown) => new Request("http://localhost", { method: "POST", body: JSON.stringify(data) });
test.each(["STUDENT", "TEACHER"])("%s cannot retry or inspect financial recovery", async role => {
  mocks.auth.mockResolvedValue({ user: { id: "user", role } });
  expect((await GET(new Request("http://localhost/api/admin/payments/recovery"))).status).toBe(403);expect((await POST(req({ paymentId: "payment" }))).status).toBe(403);
  expect(mocks.recover).not.toHaveBeenCalled();expect(mocks.read).not.toHaveBeenCalled();
});
test("anonymous recovery is rejected", async () => {
  mocks.auth.mockResolvedValue(null);expect((await POST(req({ paymentId: "payment" }))).status).toBe(401);
});
test("a client cannot choose an amount, Stripe account or entitlement", async () => {
  expect((await POST(req({ paymentId: "payment", amountYen: 10000, connectedAccountId: "someone" }))).status).toBe(400);
  expect(mocks.recover).not.toHaveBeenCalled();
});
test("admin payment reconciliation uses persisted obligations and returns the actual pending state", async () => {
  mocks.recover.mockResolvedValue({ state: "WAITING" });const response = await POST(req({ paymentId: "payment" }));
  expect(await response.json()).toMatchObject({ pending: true, state: "WAITING" });
  expect(mocks.recover).toHaveBeenCalledWith(expect.anything(), "payment", { feeOnly: undefined });
});
test("recovery failure keeps the request retryable", async () => {
  mocks.recover.mockRejectedValue(new Error("provider unavailable"));expect((await POST(req({ paymentId: "payment" }))).status).toBe(503);
});
