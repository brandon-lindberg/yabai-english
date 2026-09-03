import { Prisma } from "@/generated/prisma/client";
import { seatStateFromCount } from "@/lib/group-lesson-seats";
import { slotHoldingBookingWhere } from "@/lib/pending-booking-hold";

/**
 * The class had no seat to give. Thrown rather than returned so it cannot be
 * ignored on the way out of a transaction that must not commit.
 */
export class GroupClassFullError extends Error {
  constructor(message = "This class is full.") {
    super(message);
    this.name = "GroupClassFullError";
  }
}

/**
 * Enough of a Prisma transaction client to seat one student. Structural rather
 * than the generated type so tests can hand in a plain object, matching how the
 * booking route's own transaction is already exercised.
 */
type SeatTx = {
  groupLessonSession: {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    createMany: (args: any) => Promise<unknown>;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    findUnique: (args: any) => Promise<GroupSessionRow | null>;
  };
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  booking: { count: (args: any) => Promise<number> };
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  $queryRaw?: (...args: any[]) => Promise<unknown>;
};

type GroupSessionRow = {
  id: string;
  capacity: number;
  cancelledAt?: Date | null;
};

/**
 * Puts one student in a group class, creating the class if this is the first
 * booking for that occurrence.
 *
 * Sessions are materialised lazily because there is no worker in this
 * deployment to create them ahead of time, and a class that had not been
 * materialised yet would be unbookable. `skipDuplicates` settles the race when
 * two students arrive together: the loser of the insert does not error, and
 * both go on to read the same row.
 *
 * Capacity is then decided under a row lock. Counting seats and inserting a
 * booking is a read-then-write, and read-committed would happily let two
 * students both see the last seat. The lock is per class and these are small,
 * so serialising here costs nothing worth measuring.
 *
 * Returns the session id to hang the booking off. Throws GroupClassFullError
 * when there is no seat, which the caller turns into a 409.
 */
export async function reserveGroupSeat(
  tx: SeatTx,
  {
    teacherId,
    availabilitySlotId,
    teacherLessonOfferingId,
    startsAt,
    endsAt,
    capacity,
    now = new Date(),
  }: {
    teacherId: string;
    availabilitySlotId: string;
    teacherLessonOfferingId: string;
    startsAt: Date;
    endsAt: Date;
    /** The offering's current groupSize, used only when creating the class. */
    capacity: number;
    now?: Date;
  },
): Promise<string> {
  await tx.groupLessonSession.createMany({
    data: [
      {
        teacherId,
        availabilitySlotId,
        teacherLessonOfferingId,
        startsAt,
        endsAt,
        capacity,
      },
    ],
    skipDuplicates: true,
  });

  const session = await tx.groupLessonSession.findUnique({
    where: { availabilitySlotId_startsAt: { availabilitySlotId, startsAt } },
    select: { id: true, capacity: true, cancelledAt: true },
  });
  if (!session) {
    throw new GroupClassFullError("This class is no longer available.");
  }
  if (session.cancelledAt) {
    throw new GroupClassFullError("This class was cancelled.");
  }

  // Serialise everyone competing for this class's seats. Nothing else in the
  // transaction touches this row, so the lock is held only as long as the seat
  // count and the booking insert that follows it.
  if (typeof tx.$queryRaw === "function") {
    await tx.$queryRaw(
      Prisma.sql`SELECT id FROM "GroupLessonSession" WHERE id = ${session.id} FOR UPDATE`,
    );
  }

  const taken = await tx.booking.count({
    where: {
      groupLessonSessionId: session.id,
      ...slotHoldingBookingWhere(now),
    },
  });

  // The session's snapshot, never the caller's figure: a teacher who lowered
  // groupSize after this class filled must not evict anyone.
  if (seatStateFromCount({ capacity: session.capacity, taken }).full) {
    throw new GroupClassFullError();
  }

  return session.id;
}
