import { describe, expect, test } from "vitest";
import { groupBookingsForDashboard } from "@/lib/dashboard/booking-groups";

const NOW = new Date("2026-09-01T12:00:00Z");
const booking = (id: string, startsAt: string, status: "CONFIRMED" | "CANCELLED" | "COMPLETED") => ({
  id,
  startsAt: new Date(startsAt),
  endsAt: new Date(new Date(startsAt).getTime() + 40 * 60_000),
  status,
});

describe("groupBookingsForDashboard", () => {
  test("splits future and past lessons as before", () => {
    const { upcoming, completed } = groupBookingsForDashboard(
      [
        booking("future", "2026-09-05T01:00:00Z", "CONFIRMED"),
        booking("past", "2026-08-20T01:00:00Z", "COMPLETED"),
      ],
      NOW,
    );
    expect(upcoming.map((b) => b.id)).toEqual(["future"]);
    expect(completed.map((b) => b.id)).toEqual(["past"]);
  });

  test("a cancelled lesson is in neither, whichever side of now it falls", () => {
    const { upcoming, completed } = groupBookingsForDashboard(
      [
        booking("cancelled-future", "2026-09-05T01:00:00Z", "CANCELLED"),
        booking("cancelled-past", "2026-08-20T01:00:00Z", "CANCELLED"),
      ],
      NOW,
    );
    expect(upcoming).toEqual([]);
    expect(completed).toEqual([]);
  });

  test("a cancelled lesson that was refunded is reported so its credit note is reachable", () => {
    const refunded = {
      ...booking("refunded", "2026-08-20T01:00:00Z", "CANCELLED"),
      refunds: [{ id: "r1", creditNoteNo: "CRN-1" }],
    };
    const cancelledOnly = {
      ...booking("no-money-moved", "2026-08-21T01:00:00Z", "CANCELLED"),
      refunds: [],
    };

    const { refunded: group } = groupBookingsForDashboard([refunded, cancelledOnly], NOW);

    // Only a refund with a document to show — a cancellation that never
    // involved money has nothing for the student to download.
    expect(group.map((b) => b.id)).toEqual(["refunded"]);
  });

  test("newest refund first", () => {
    const older = { ...booking("older", "2026-08-01T01:00:00Z", "CANCELLED"), refunds: [{ id: "r1", creditNoteNo: "C1" }] };
    const newer = { ...booking("newer", "2026-08-25T01:00:00Z", "CANCELLED"), refunds: [{ id: "r2", creditNoteNo: "C2" }] };

    expect(
      groupBookingsForDashboard([older, newer], NOW).refunded.map((b) => b.id),
    ).toEqual(["newer", "older"]);
  });
});
