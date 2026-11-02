import { beforeEach, expect, test, vi } from "vitest";
const mocks = vi.hoisted(() => ({ create: vi.fn(), createMany: vi.fn(), emit: vi.fn() }));
vi.mock("@/lib/prisma", () => ({ prisma: { notification: { create: mocks.create, createMany: mocks.createMany } } }));
vi.mock("@/lib/realtime-server", () => ({ emitNotificationsUpdate: mocks.emit }));
import { createUserNotification } from "../notifications";

beforeEach(() => { vi.clearAllMocks(); mocks.createMany.mockResolvedValue({ count: 1 }); });
test("retries of one lifecycle event share an id without duplicating a stored alert or live update", async () => {
  const input = { userId: "student", titleEn: "Cancelled", titleJa: "中止", deduplicationKey: "cancel:booking" };
  await createUserNotification(input);
  mocks.createMany.mockResolvedValue({ count: 0 });
  await createUserNotification(input);
  expect(mocks.createMany.mock.calls[0][0].data[0].id).toBe(mocks.createMany.mock.calls[1][0].data[0].id);
  expect(mocks.createMany.mock.calls[0][0].skipDuplicates).toBe(true);
  expect(mocks.emit).toHaveBeenCalledTimes(1);
  await createUserNotification({ ...input, userId: "teacher" });
  expect(mocks.createMany.mock.calls[2][0].data[0].id).not.toBe(mocks.createMany.mock.calls[0][0].data[0].id);
});
