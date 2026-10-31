import { vi } from "vitest";
import type { PrismaClient } from "@/generated/prisma/client";

/** Unit-only persistence double. Real PostgreSQL tests establish locking/rollback guarantees. */
export function englishPlacementFixture() {
  type Row = Record<string, any>; // eslint-disable-line @typescript-eslint/no-explicit-any -- Prisma query projection double
  const attempts = new Map<string, Row>();
  const banks = new Map<string, Row>();
  const actor = { id: "english-student", role: "STUDENT", accountStatus: "ACTIVE", learningLanguage: "ENGLISH" };
  const profile: Row = { userId: actor.id, placementCompletedAt: null, placedLevel: "UNSET", placedSubLevel: null };
  const project = (row?: Row) => row ? structuredClone({ ...row, bankSnapshot: banks.get(row.bankSnapshotId) }) : null;
  const db = {
    user: { findUnique: vi.fn(async () => actor) },
    studentProfile: {
      findUnique: vi.fn(async () => structuredClone(profile)),
      update: vi.fn(async ({ data }: Row) => { Object.assign(profile, data); return structuredClone(profile); }),
    },
    englishPlacementBankSnapshot: {
      upsert: vi.fn(async ({ where, create }: Row) => {
        let row = [...banks.values()].find(row => row.digest === where.digest);
        if (!row) { const created = { id: `bank-${banks.size}`, ...structuredClone(create) }; banks.set(created.id, created); row = created; }
        return structuredClone(row);
      }),
    },
    englishPlacementAttempt: {
      findUnique: vi.fn(async ({ where }: Row) => project(where.id ? attempts.get(where.id) : [...attempts.values()].find(row => row.activeLearnerId === where.activeLearnerId))),
      create: vi.fn(async ({ data }: Row) => { attempts.set(data.id, structuredClone(data)); return project(attempts.get(data.id)); }),
      update: vi.fn(async ({ where, data }: Row) => {
        const row = attempts.get(where.id)!;
        Object.assign(row, structuredClone(data)); return project(row);
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
