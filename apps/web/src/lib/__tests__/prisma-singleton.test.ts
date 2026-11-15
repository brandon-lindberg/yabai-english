import { afterEach, beforeEach, expect, test, vi } from "vitest";

const { client, adapter, pool } = vi.hoisted(() => ({
  client: vi.fn().mockImplementation(function () {}),
  adapter: vi.fn().mockImplementation(function () {}),
  pool: vi.fn().mockImplementation(function () {}),
}));
vi.mock("pg", () => ({ Pool: pool }));
vi.mock("@/generated/prisma/client", () => ({ PrismaClient: client }));
vi.mock("@prisma/adapter-pg", () => ({ PrismaPg: adapter }));

const shared = globalThis as unknown as { prisma?: unknown };
let previous: unknown;
beforeEach(() => {
  previous = shared.prisma;
  delete shared.prisma;
  vi.clearAllMocks();
  vi.resetModules();
  vi.stubEnv("DATABASE_URL", "postgresql://test:test@localhost:1/test?schema=isolated_test");
});
afterEach(() => {
  if (previous === undefined) delete shared.prisma;
  else shared.prisma = previous;
  vi.unstubAllEnvs();
  vi.resetModules();
});

test.each(["production", "development"])("%s module instances share one client and adapter", async mode => {
  vi.stubEnv("NODE_ENV", mode);
  const first = await import("../prisma");
  // Page and route bundles can evaluate the shared source in separate module caches.
  vi.resetModules();
  const second = await import("../prisma");
  expect(second.prisma).toBe(first.prisma);
  expect(client).toHaveBeenCalledTimes(1);
  expect(adapter).toHaveBeenCalledTimes(1);
  expect(pool).toHaveBeenCalledTimes(1);
  expect(pool).toHaveBeenCalledWith(expect.objectContaining({ options: '-c search_path="isolated_test"', max: 10, connectionTimeoutMillis: 3000, idleTimeoutMillis: 10000 }));
  expect(adapter).toHaveBeenCalledWith(pool.mock.instances[0], { schema: "isolated_test", disposeExternalPool: true });
});

test("an explicitly supplied process client is reused without creating another pool", async () => {
  vi.stubEnv("NODE_ENV", "production");
  const supplied = { $disconnect: vi.fn() };
  shared.prisma = supplied;
  expect((await import("../prisma")).prisma).toBe(supplied);
  expect(client).not.toHaveBeenCalled();
  expect(adapter).not.toHaveBeenCalled();
  expect(pool).not.toHaveBeenCalled();
  expect(supplied.$disconnect).not.toHaveBeenCalled();
});
