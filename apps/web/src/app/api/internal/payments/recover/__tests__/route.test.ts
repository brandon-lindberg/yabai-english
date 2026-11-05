import { afterEach, beforeEach, expect, test, vi } from "vitest";
const { batch } = vi.hoisted(() => ({ batch: vi.fn().mockResolvedValue({ deliveries: [], refunds: [] }) }));
vi.mock("@/lib/prisma", () => ({ prisma: {} }));
vi.mock("@/lib/payment-recovery-batch", () => ({ runPaymentRecoveryBatch: batch }));
import { GET } from "../route";
beforeEach(() => {vi.clearAllMocks();vi.stubEnv("PAYMENT_RECOVERY_SECRET", "local-recovery-secret");});
afterEach(() => vi.unstubAllEnvs());
test("a recovery job without authorization cannot process money", async () => {
  expect((await GET(new Request("http://localhost"))).status).toBe(401);expect(batch).not.toHaveBeenCalled();
});
test("wrong authorization is rejected", async () => {
  expect((await GET(new Request("http://localhost", { headers: { authorization: "Bearer other" } }))).status).toBe(401);expect(batch).not.toHaveBeenCalled();
});
test("an authenticated recovery job runs a bounded persisted batch", async () => {
  expect((await GET(new Request("http://localhost", { headers: { authorization: "Bearer local-recovery-secret" } }))).status).toBe(200);
  expect(batch).toHaveBeenCalledTimes(1);
});
