import { describe, expect, test } from "vitest";
import { groupBookingsForDashboard } from "@/lib/dashboard/booking-groups";

const d = (iso: string) => new Date(iso);

describe("groupBookingsForDashboard", () => {
  test("puts future lessons in upcoming and sorts completed by most recent first", () => {
    const now = d("2026-04-13T12:00:00.000Z");
    const bookings = [
      {
        id: "a",
        startsAt: d("2026-04-10T10:00:00.000Z"),
        endsAt: d("2026-04-10T11:00:00.000Z"),
        status: "CONFIRMED" as const,
      },
      {
        id: "b",
        startsAt: d("2026-04-12T14:00:00.000Z"),
        endsAt: d("2026-04-12T15:00:00.000Z"),
        status: "COMPLETED" as const,
      },
      {
        id: "c",
        startsAt: d("2026-04-20T09:00:00.000Z"),
        endsAt: d("2026-04-20T10:00:00.000Z"),
        status: "CONFIRMED" as const,
      },
    ];

    const { upcoming, completed } = groupBookingsForDashboard(bookings, now);

    expect(upcoming.map((b) => b.id)).toEqual(["c"]);
    expect(completed.map((b) => b.id)).toEqual(["b", "a"]);
  });

  test("excludes cancelled lessons from completed even when in the past", () => {
    const now = d("2026-04-13T12:00:00.000Z");
    const bookings = [
      {
        id: "x",
        startsAt: d("2026-04-01T10:00:00.000Z"),
        endsAt: d("2026-04-01T11:00:00.000Z"),
        status: "CANCELLED" as const,
      },
    ];

    const { completed } = groupBookingsForDashboard(bookings, now);
    expect(completed).toEqual([]);
  });

  test("includes non-cancelled past bookings such as pending payment after the slot", () => {
    const now = d("2026-04-13T12:00:00.000Z");
    const bookings = [
      {
        id: "p",
        startsAt: d("2026-04-10T10:00:00.000Z"),
        endsAt: d("2026-04-10T11:00:00.000Z"),
        status: "PENDING_PAYMENT" as const,
      },
    ];

    const { completed } = groupBookingsForDashboard(bookings, now);
    expect(completed.map((b) => b.id)).toEqual(["p"]);
  });

  test("excludes cancelled lessons from upcoming even when the slot is still in the future", () => {
    const now = d("2026-04-13T12:00:00.000Z");
    const bookings = [
      {
        id: "gone",
        startsAt: d("2026-04-20T10:00:00.000Z"),
        endsAt: d("2026-04-20T11:00:00.000Z"),
        status: "CANCELLED" as const,
      },
      {
        id: "kept",
        startsAt: d("2026-04-20T12:00:00.000Z"),
        endsAt: d("2026-04-20T13:00:00.000Z"),
        status: "CONFIRMED" as const,
      },
    ];

    const { upcoming } = groupBookingsForDashboard(bookings, now);
    expect(upcoming.map((b) => b.id)).toEqual(["kept"]);
  });
});
