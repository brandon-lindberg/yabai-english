import { describe, expect, test } from "vitest";
import { buildScheduleItems } from "@/lib/dashboard/schedule-items";

/*
  One shape for a mark on the schedule calendar, built the same way for both
  roles.

  The two dashboards each had their own mapper producing the same five fields,
  which is how the teacher's calendar learned about group classes and the
  student's did not. The chip and the reservation dialog now read one builder,
  so a field can only be missing on both sides or neither.
*/

const lessonProduct = { nameJa: "初級", nameEn: "Beginner", durationMin: 40 };

function booking(overrides: Record<string, unknown> = {}) {
  return {
    id: "b-1",
    startsAt: new Date("2026-07-05T01:30:00.000Z"),
    endsAt: new Date("2026-07-05T02:10:00.000Z"),
    status: "CONFIRMED" as const,
    holdExpiresAt: null,
    quotedPriceYen: 4000,
    meetUrl: "https://meet.example/abc",
    lessonProduct,
    ...overrides,
  };
}

describe("buildScheduleItems", () => {
  test("carries everything the reservation dialog has to show", () => {
    const [item] = buildScheduleItems([booking()], {
      counterpartName: () => "Kana Minami Miura",
    });

    expect(item).toMatchObject({
      id: "b-1",
      title: "初級 / Beginner",
      counterpartName: "Kana Minami Miura",
      durationMin: 40,
      priceYen: 4000,
      meetUrl: "https://meet.example/abc",
      status: "CONFIRMED",
      isPast: false,
    });
  });

  test("a seat in a group class carries how full the class is", () => {
    const [item] = buildScheduleItems(
      [booking({ groupLessonSession: { capacity: 5, _count: { bookings: 2 } } })],
      { counterpartName: () => "Kana" },
    );

    expect(item.groupSeats).toEqual({ capacity: 5, taken: 2 });
  });

  test("a private lesson has no seats to speak of", () => {
    const [item] = buildScheduleItems([booking()], { counterpartName: () => "Kana" });

    expect(item.groupSeats).toBeNull();
  });

  test("a lapsed hold reads as expired, not as still awaiting payment", () => {
    // The slot went back on sale when the hold ran out; offering "finish
    // paying" on the calendar would point at an action that no longer exists.
    const [item] = buildScheduleItems(
      [
        booking({
          status: "PENDING_PAYMENT",
          holdExpiresAt: new Date("2026-07-01T00:00:00.000Z"),
        }),
      ],
      { counterpartName: () => "Kana", now: new Date("2026-07-02T00:00:00.000Z") },
    );

    expect(item.status).toBe("EXPIRED");
  });

  test("classmates are named only where the caller asks for them", () => {
    // The student side simply does not pass the accessor, which is what keeps
    // one classmate's name off another classmate's calendar.
    const [withoutNames] = buildScheduleItems(
      [booking({ groupLessonSession: { capacity: 5, _count: { bookings: 2 } } })],
      { counterpartName: () => "Kana" },
    );
    const [withNames] = buildScheduleItems(
      [booking({ groupLessonSession: { capacity: 5, _count: { bookings: 2 } } })],
      { counterpartName: () => "Kana", classmates: () => ["Aya", "Ken"] },
    );

    expect(withoutNames.classmates).toBeUndefined();
    expect(withNames.classmates).toEqual(["Aya", "Ken"]);
  });

  test("past lessons are marked as records", () => {
    const [item] = buildScheduleItems([booking({ status: "COMPLETED" })], {
      past: true,
      counterpartName: () => "Kana",
    });

    expect(item.isPast).toBe(true);
  });
});
