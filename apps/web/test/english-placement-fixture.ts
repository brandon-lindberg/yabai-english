import { vi } from "vitest";
import type { PrismaClient } from "@/generated/prisma/client";

/** Unit-only persistence double. Real PostgreSQL tests establish locking/rollback guarantees. */
export function englishPlacementFixture() {
  type Row = Record<string, any>; // eslint-disable-line @typescript-eslint/no-explicit-any -- Prisma query projection double
  const attempts = new Map<string, Row>();
  const banks = new Map<string, Row>();
  const actor = { id: "english-student", role: "STUDENT", accountStatus: "ACTIVE", learningLanguage: "ENGLISH" };
  const profile: Row = { userId: actor.id, placementCompletedAt: null, placedLevel: "UNSET", placedSubLevel: null };
  const select = (row: Row | undefined, fields?: Row) => row ? structuredClone(fields ? Object.fromEntries(Object.keys(fields).filter(key => fields[key]).map(key => [key, row[key]])) : row) : null;
  const project = (row: Row | undefined, include: Row) => row ? structuredClone({ ...row, bankSnapshot: select(banks.get(row.bankSnapshotId), include.bankSnapshot.select) }) : null;
  const findBank = ({ where, select: fields }: Row) => select(where.id ? banks.get(where.id) : [...banks.values()].find(row => row.digest === where.digest), fields);
  const db = {
    user: { findUnique: vi.fn(async () => actor) },
    studentProfile: {
      findUnique: vi.fn(async () => structuredClone(profile)),
      update: vi.fn(async ({ data }: Row) => { Object.assign(profile, data); return structuredClone(profile); }),
    },
    englishPlacementBankSnapshot: {
      findUnique: vi.fn(async (args: Row) => findBank(args)),
      findUniqueOrThrow: vi.fn(async (args: Row) => {
        const row = findBank(args);
        if (!row) throw new Error("Snapshot missing");
        return row;
      }),
      createMany: vi.fn(async ({ data }: Row) => {
        let count = 0;
        for (const row of data) if (![...banks.values()].some(bank => bank.digest === row.digest)) { banks.set(row.id, structuredClone(row)); count++; }
        return { count };
      }),
    },
    englishPlacementAttempt: {
      findUnique: vi.fn(async ({ where, include }: Row) => project(where.id ? attempts.get(where.id) : [...attempts.values()].find(row => row.activeLearnerId === where.activeLearnerId), include)),
      create: vi.fn(async ({ data, include }: Row) => { attempts.set(data.id, structuredClone(data)); return project(attempts.get(data.id), include); }),
      update: vi.fn(async ({ where, data, include }: Row) => {
        const row = attempts.get(where.id)!;
        Object.assign(row, structuredClone(data)); return include ? project(row, include) : structuredClone(row);
      }),
    },
    $queryRaw: vi.fn(async () => []),
    $transaction: vi.fn(),
  };
  let pending = Promise.resolve();
  db.$transaction.mockImplementation((run: (tx: typeof db) => Promise<unknown>) => {
    const result = pending.then(() => run(db));
    pending = result.then(() => undefined, () => undefined);
    return result;
  });
  return { db: db as unknown as PrismaClient, mocks: db, attempts, banks, actor, profile };
}
