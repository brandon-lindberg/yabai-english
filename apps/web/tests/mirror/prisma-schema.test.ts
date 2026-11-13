import { afterEach, expect, test, vi } from "vitest";

const adapter = vi.hoisted(() => vi.fn(function (_connection: unknown, _options: unknown) {}));
vi.mock("@prisma/adapter-pg", () => ({ PrismaPg: adapter }));
vi.mock("@/generated/prisma/client", () => ({ PrismaClient: vi.fn(function () {}) }));
const prior = (globalThis as { prisma?: unknown }).prisma;
afterEach(() => { vi.unstubAllEnvs(); vi.resetModules(); adapter.mockClear(); (globalThis as { prisma?: unknown }).prisma = prior; });

test.each([
  ["postgresql://local:unused@localhost/qa?schema=mirror_test_123", "mirror_test_123"],
  ["postgresql://local:unused@localhost/qa?schema=public", "public"],
  ["postgresql://local:unused@localhost/qa", "public"],
])("honors the configured PostgreSQL namespace for %s", async (url, schema) => {
  delete (globalThis as { prisma?: unknown }).prisma;
  vi.stubEnv("DATABASE_URL", url);
  await import("@/lib/prisma");
  expect(adapter).toHaveBeenCalledWith({ connectionString: url }, { schema });
});
