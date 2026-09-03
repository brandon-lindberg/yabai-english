import { describe, expect, test } from "vitest";
import { buildGroupClassRows } from "@/lib/dashboard/group-classes";

const now = new Date("2026-07-01T00:00:00.000Z");

function seat(id: string, name: string | null, overrides: Record<string, unknown> = {}) {
  return {
    id,
    status: "CONFIRMED",
    holdExpiresAt: null,
    student: { id: `stu-${id}`, name, email: `${id}@example.com` },
    ...overrides,
  };
}

function session(overrides: Record<string, unknown> = {}) {
  return {
    id: "sess-1",
    startsAt: new Date("2026-07-05T01:30:00.000Z"),
    endsAt: new Date("2026-07-05T02:30:00.000Z"),
    capacity: 5,
    cancelledAt: null,
    bookings: [seat("bk-1", "Aiko"), seat("bk-2", "Ben")],
    ...overrides,
  };
}

describe("buildGroupClassRows", () => {
  test("names who is in the class and how much room is left", () => {
    const [row] = buildGroupClassRows([session()], now);

    expect(row!.students.map((s) => s.name)).toEqual(["Aiko", "Ben"]);
    expect(row!.seats).toMatchObject({ capacity: 5, taken: 2, remaining: 3, full: false });
  });

  test("falls back to the address when a student has no name", () => {
    const [row] = buildGroupClassRows(
      [session({ bookings: [seat("bk-1", null)] })],
      now,
    );

    expect(row!.students[0]!.name).toBe("bk-1@example.com");
  });

  // A lapsed hold is not a student in the class, so the name goes with the seat.
  test("drops a student whose unpaid hold has lapsed", () => {
    const [row] = buildGroupClassRows(
      [
        session({
          bookings: [
            seat("bk-1", "Aiko"),
            seat("bk-2", "Ben", {
              status: "PENDING_PAYMENT",
              holdExpiresAt: new Date("2026-06-30T00:00:00.000Z"),
            }),
          ],
        }),
      ],
      now,
    );

    expect(row!.students.map((s) => s.name)).toEqual(["Aiko"]);
    expect(row!.seats.taken).toBe(1);
  });

  test("keeps a student whose hold still stands", () => {
    const [row] = buildGroupClassRows(
      [
        session({
          bookings: [
            seat("bk-1", "Aiko", {
              status: "PENDING_PAYMENT",
              holdExpiresAt: new Date("2026-07-01T03:00:00.000Z"),
            }),
          ],
        }),
      ],
      now,
    );

    expect(row!.students.map((s) => s.name)).toEqual(["Aiko"]);
  });

  test("drops a student who cancelled", () => {
    const [row] = buildGroupClassRows(
      [session({ bookings: [seat("bk-1", "Aiko"), seat("bk-2", "Ben", { status: "CANCELLED" })] })],
      now,
    );

    expect(row!.students.map((s) => s.name)).toEqual(["Aiko"]);
  });

  test("marks a class the teacher called off", () => {
    const [row] = buildGroupClassRows(
      [session({ cancelledAt: new Date("2026-07-02T00:00:00.000Z") })],
      now,
    );

    expect(row!.cancelled).toBe(true);
  });

  test("shows an empty class as entirely open", () => {
    const [row] = buildGroupClassRows([session({ bookings: [] })], now);

    expect(row!.students).toEqual([]);
    expect(row!.seats).toMatchObject({ taken: 0, remaining: 5 });
  });

  test("closes a class once every seat is taken", () => {
    const [row] = buildGroupClassRows(
      [session({ capacity: 2 })],
      now,
    );

    expect(row!.seats.full).toBe(true);
  });

  test("puts the soonest class first", () => {
    const rows = buildGroupClassRows(
      [
        session({ id: "later", startsAt: new Date("2026-07-12T01:30:00.000Z") }),
        session({ id: "sooner", startsAt: new Date("2026-07-05T01:30:00.000Z") }),
      ],
      now,
    );

    expect(rows.map((r) => r.sessionId)).toEqual(["sooner", "later"]);
  });
});
