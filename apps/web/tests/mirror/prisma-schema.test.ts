import { afterEach, expect, test, vi } from "vitest";
import { Pool } from "pg";

const adapter = vi.hoisted(() => vi.fn(function (_connection: unknown, _options: unknown) {}));
vi.mock("@prisma/adapter-pg", () => ({ PrismaPg: adapter }));
vi.mock("@/generated/prisma/client", () => ({ PrismaClient: vi.fn(function () {}) }));
vi.mock("@/lib/learning-runtime", () => ({ registerLearningPool: vi.fn() }));
const prior = (globalThis as { prisma?: unknown }).prisma;
afterEach(async () => {
  // Construction is lazy: these real pools never connect to a database.
  await Promise.all(adapter.mock.calls.map(([pool]) => pool instanceof Pool ? pool.end() : undefined));
  vi.unstubAllEnvs();
  vi.resetModules();
  adapter.mockClear();
  (globalThis as { prisma?: unknown }).prisma = prior;
});

test.each([
  ["postgresql://local:unused@localhost/qa?schema=mirror_test_123", "mirror_test_123", '-c search_path="mirror_test_123"'],
  ["postgresql://local:unused@localhost/qa?schema=public", "public", '-c search_path="public"'],
  ["postgresql://local:unused@localhost/qa", "public", '-c search_path="public"'],
  ["postgresql://local:unused@localhost/qa?schema=mirror%20qa", "mirror qa", '-c search_path="mirror\\ qa"'],
  ["postgresql://local:unused@localhost/qa?schema=mirror%22qa", 'mirror"qa', '-c search_path="mirror""qa"'],
])("honors the configured PostgreSQL namespace for %s", async (url, schema, searchPath) => {
  delete (globalThis as { prisma?: unknown }).prisma;
  vi.stubEnv("DATABASE_URL", url);
  await import("@/lib/prisma");
  expect(adapter).toHaveBeenCalledTimes(1);
  const pool = adapter.mock.calls[0][0];
  expect(pool).toBeInstanceOf(Pool);
  expect((pool as Pool).options).toMatchObject({ connectionString: url, options: searchPath });
  expect(adapter).toHaveBeenCalledWith(pool, { schema, disposeExternalPool: true });
});
