import { describe, expect, test, vi } from "vitest";
import {
  GroupClassFullError,
  reserveGroupSeat,
} from "@/lib/group-lesson-session";

const now = new Date("2026-07-01T00:00:00.000Z");
const startsAt = new Date("2026-07-05T01:30:00.000Z");
const endsAt = new Date("2026-07-05T02:30:00.000Z");

const input = {
  teacherId: "teacher-1",
  availabilitySlotId: "slot-1",
  teacherLessonOfferingId: "offer-1",
  startsAt,
  endsAt,
  capacity: 3,
  now,
};

function fakeTx({
  existing,
  taken = 0,
}: {
  existing?: { id: string; capacity: number } | null;
  taken?: number;
} = {}) {
  const session = existing ?? { id: "sess-1", capacity: 3 };
  return {
    groupLessonSession: {
      createMany: vi.fn().mockResolvedValue({ count: existing ? 0 : 1 }),
      findUnique: vi.fn().mockResolvedValue(session),
    },
    booking: { count: vi.fn().mockResolvedValue(taken) },
    $queryRaw: vi.fn().mockResolvedValue([{ id: session.id }]),
  };
}

describe("reserveGroupSeat", () => {
  test("creates the class the first time somebody books it", async () => {
    const tx = fakeTx({ existing: null });
    const sessionId = await reserveGroupSeat(tx, input);

    expect(sessionId).toBe("sess-1");
    expect(tx.groupLessonSession.createMany).toHaveBeenCalledWith(
      expect.objectContaining({ skipDuplicates: true }),
    );
  });

  test("snapshots the capacity onto the class it creates", async () => {
    const tx = fakeTx({ existing: null });
    await reserveGroupSeat(tx, input);

    const [args] = tx.groupLessonSession.createMany.mock.calls[0] as [
      { data: Array<{ capacity: number; startsAt: Date; teacherId: string }> },
    ];
    expect(args.data[0]).toMatchObject({
      capacity: 3,
      teacherId: "teacher-1",
      startsAt,
    });
  });

  // Two students arriving together both run this. skipDuplicates means the
  // loser of the insert race does not error, and both then read the same row.
  test("joins the class rather than creating a second one", async () => {
    const tx = fakeTx({ existing: { id: "sess-existing", capacity: 3 }, taken: 1 });
    await expect(reserveGroupSeat(tx, input)).resolves.toBe("sess-existing");
  });

  test("locks the class row before counting seats", async () => {
    const tx = fakeTx({ taken: 1 });
    await reserveGroupSeat(tx, input);

    expect(tx.$queryRaw).toHaveBeenCalled();
    const lockedBeforeCount =
      tx.$queryRaw.mock.invocationCallOrder[0]! <
      tx.booking.count.mock.invocationCallOrder[0]!;
    expect(lockedBeforeCount).toBe(true);
  });

  test("counts only the seats still being held", async () => {
    const tx = fakeTx({ taken: 1 });
    await reserveGroupSeat(tx, input);

    const [args] = tx.booking.count.mock.calls[0] as [
      { where: { groupLessonSessionId: string; OR?: unknown } },
    ];
    expect(args.where.groupLessonSessionId).toBe("sess-1");
    // The shared holding rule, so a lapsed hold gives its seat back here too.
    expect(args.where.OR).toEqual([
      { status: "CONFIRMED" },
      { status: "PENDING_PAYMENT", holdExpiresAt: { gte: now } },
    ]);
  });

  test("takes the last seat", async () => {
    const tx = fakeTx({ taken: 2 });
    await expect(reserveGroupSeat(tx, input)).resolves.toBe("sess-1");
  });

  test("refuses the seat past capacity", async () => {
    const tx = fakeTx({ taken: 3 });
    await expect(reserveGroupSeat(tx, input)).rejects.toBeInstanceOf(GroupClassFullError);
  });

  // The session's own snapshot decides, not whatever the offering says today.
  test("honours the class's snapshotted capacity over the caller's", async () => {
    const tx = fakeTx({ existing: { id: "sess-1", capacity: 5 }, taken: 4 });
    await expect(reserveGroupSeat(tx, { ...input, capacity: 2 })).resolves.toBe("sess-1");
  });

  test("refuses when the class was called off", async () => {
    const tx = fakeTx();
    tx.groupLessonSession.findUnique.mockResolvedValue({
      id: "sess-1",
      capacity: 3,
      cancelledAt: new Date("2026-07-02T00:00:00.000Z"),
    });
    await expect(reserveGroupSeat(tx, input)).rejects.toBeInstanceOf(GroupClassFullError);
  });
});
