import { describe, expect, test } from "vitest";
import { teacherBookingOverlapWhere } from "@/lib/booking-conflict";
import { slotHoldingBookingWhere } from "@/lib/pending-booking-hold";

const start = new Date("2026-09-07T01:00:00.000Z");
const end = new Date("2026-09-07T02:00:00.000Z");
const now = new Date("2026-09-01T00:00:00.000Z");

describe("teacherBookingOverlapWhere", () => {
  test("matches this teacher's bookings that straddle the window", () => {
    const where = teacherBookingOverlapWhere({ teacherId: "t-1", start, end, now });
    expect(where.teacherId).toBe("t-1");
    // Half-open on both sides: a lesson ending exactly at `start` does not
    // overlap one beginning there.
    expect(where.startsAt).toEqual({ lt: end });
    expect(where.endsAt).toEqual({ gt: start });
  });

  test("carries the shared holding rule, so a lapsed hold blocks nothing", () => {
    const where = teacherBookingOverlapWhere({ teacherId: "t-1", start, end, now });
    expect(where.AND).toContainEqual(slotHoldingBookingWhere(now));
  });

  test("leaves out the booking being moved", () => {
    const where = teacherBookingOverlapWhere({
      teacherId: "t-1",
      start,
      end,
      excludeBookingId: "bk-1",
      now,
    });
    expect(where.id).toEqual({ not: "bk-1" });
  });

  test("asks about nothing extra when given nothing extra", () => {
    const where = teacherBookingOverlapWhere({ teacherId: "t-1", start, end, now });
    expect(where.id).toBeUndefined();
    expect(where.AND).toHaveLength(1);
  });

  // The whole reason this module exists: seats in one class overlap each other
  // by design, and must not read as the teacher being double-booked.
  test("forgives seats belonging to the class being joined", () => {
    const where = teacherBookingOverlapWhere({
      teacherId: "t-1",
      start,
      end,
      allowGroupSessionId: "sess-1",
      now,
    });
    expect(where.AND).toContainEqual({
      OR: [
        { groupLessonSessionId: null },
        { groupLessonSessionId: { not: "sess-1" } },
      ],
    });
  });

  // Spelled out rather than relying on `not` to include nulls: a private lesson
  // carries no session id, and it is exactly the row that must still conflict.
  test("keeps private lessons conflicting even while forgiving a class", () => {
    const where = teacherBookingOverlapWhere({
      teacherId: "t-1",
      start,
      end,
      allowGroupSessionId: "sess-1",
      now,
    });
    const clauses = where.AND as Array<{ OR?: Array<Record<string, unknown>> }>;
    const forgiveness = clauses.find((entry) =>
      entry.OR?.some((branch) => "groupLessonSessionId" in branch),
    );
    expect(forgiveness?.OR).toContainEqual({ groupLessonSessionId: null });
  });

  test("forgives nothing when no class is named", () => {
    const where = teacherBookingOverlapWhere({ teacherId: "t-1", start, end, now });
    expect(JSON.stringify(where)).not.toContain("groupLessonSessionId");
  });
});
