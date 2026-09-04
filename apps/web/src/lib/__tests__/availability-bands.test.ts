import { describe, expect, test } from "vitest";
import {
  AVAILABILITY_BANDS,
  availabilityBands,
  previewDays,
  previewWindow,
} from "@/lib/availability-bands";

/*
  A compact "when is this teacher free" grid: the days across, four-hour bands
  down, filled where the teacher has an occurrence.

  The list currently answers this with "6 available slots", which counts
  recurrence rules — not bookable times, and silent about when. For a Tokyo
  student choosing between teachers in Canada and Australia, when is the whole
  question, so every band here is computed in the *student's* timezone.
*/

const DAYS = ["2026-09-07", "2026-09-08", "2026-09-09"];

function bandsFor(occurrences: { startsAtIso: string; endsAtIso: string }[], timeZone: string) {
  return availabilityBands({ occurrences, dayKeys: DAYS, timeZone });
}

describe("availabilityBands", () => {
  test("splits the day into four-hour bands", () => {
    expect(AVAILABILITY_BANDS).toHaveLength(6);
    expect(AVAILABILITY_BANDS[0]).toEqual({ startHour: 0, endHour: 4 });
    expect(AVAILABILITY_BANDS[5]).toEqual({ startHour: 20, endHour: 24 });
  });

  test("fills the band an occurrence sits in", () => {
    // 10:00 JST on the 8th -> the 08-12 band, which is index 2.
    const grid = bandsFor(
      [{ startsAtIso: "2026-09-08T01:00:00.000Z", endsAtIso: "2026-09-08T02:00:00.000Z" }],
      "Asia/Tokyo",
    );

    expect(grid[1][2]).toBe(true);
    expect(grid[1][1]).toBe(false);
  });

  test("an occurrence straddling two bands fills both", () => {
    // 11:00-13:00 JST covers 08-12 and 12-16.
    const grid = bandsFor(
      [{ startsAtIso: "2026-09-08T02:00:00.000Z", endsAtIso: "2026-09-08T04:00:00.000Z" }],
      "Asia/Tokyo",
    );

    expect(grid[1][2]).toBe(true);
    expect(grid[1][3]).toBe(true);
  });

  test("bands are the student's hours, not the teacher's", () => {
    // The single reason this exists. The same instant is Tuesday morning in
    // Tokyo and Monday evening in New York, and the student needs their own.
    const occurrence = [
      { startsAtIso: "2026-09-08T01:00:00.000Z", endsAtIso: "2026-09-08T02:00:00.000Z" },
    ];

    const tokyo = bandsFor(occurrence, "Asia/Tokyo");
    const newYork = bandsFor(occurrence, "America/New_York");

    // 10:00 Tue in Tokyo; 21:00 Mon in New York.
    expect(tokyo[1][2]).toBe(true);
    expect(newYork[0][5]).toBe(true);
    expect(newYork[1][2]).toBe(false);
  });

  test("an occurrence crossing local midnight fills both days", () => {
    // 23:00 Tue to 01:00 Wed, Tokyo.
    const grid = bandsFor(
      [{ startsAtIso: "2026-09-08T14:00:00.000Z", endsAtIso: "2026-09-08T16:00:00.000Z" }],
      "Asia/Tokyo",
    );

    expect(grid[1][5]).toBe(true);
    expect(grid[2][0]).toBe(true);
  });

  test("days with nothing stay empty", () => {
    const grid = bandsFor([], "Asia/Tokyo");

    expect(grid.every((day) => day.every((band) => !band))).toBe(true);
  });

  test("occurrences outside the shown days are ignored", () => {
    const grid = bandsFor(
      [{ startsAtIso: "2026-10-01T01:00:00.000Z", endsAtIso: "2026-10-01T02:00:00.000Z" }],
      "Asia/Tokyo",
    );

    expect(grid.every((day) => day.every((band) => !band))).toBe(true);
  });

  test("an occurrence ending exactly on a boundary does not spill into the next band", () => {
    // 08:00-12:00 JST is the 08-12 band and nothing more; an inclusive end
    // would light 12-16 for a lesson that finished.
    const grid = bandsFor(
      [{ startsAtIso: "2026-09-07T23:00:00.000Z", endsAtIso: "2026-09-08T03:00:00.000Z" }],
      "Asia/Tokyo",
    );

    expect(grid[1][2]).toBe(true);
    expect(grid[1][3]).toBe(false);
  });
});

describe("previewDays", () => {
  /*
    A week reads Monday to Sunday. Seven days counted forward from today put
    the columns in whatever order the current weekday happened to fall — Fri,
    Sat, Sun, Mon… — which reads as broken even though every column was
    correctly labelled. This is the same Monday-first week the rest of the
    calendars use.
  */
  test("runs Monday to Sunday", () => {
    // 2026-09-11 is a Friday in Tokyo.
    const days = previewDays("Asia/Tokyo", "en", new Date("2026-09-11T01:00:00.000Z"));

    expect(days).toHaveLength(7);
    expect(days[0].dayKey).toBe("2026-09-07");
    expect(days[6].dayKey).toBe("2026-09-13");
  });

  test("is the week the viewer is currently in, in their own zone", () => {
    // 22:00 Sunday UTC is already Monday in Tokyo, so the week has turned over.
    const days = previewDays("Asia/Tokyo", "en", new Date("2026-09-13T22:00:00.000Z"));

    expect(days[0].dayKey).toBe("2026-09-14");
  });

  test("labels each day for reading, keyed for matching", () => {
    const days = previewDays("Asia/Tokyo", "en", new Date("2026-09-08T01:00:00.000Z"));

    expect(days[0]).toMatchObject({ dayKey: "2026-09-07", dayOfMonth: "7" });
    expect(days[0].shortLabel).toBeTruthy();
  });
});

describe("previewWindow", () => {
  /*
    The window the occurrences are expanded over has to be the week on screen,
    or the last column is drawn from data that was never fetched. It also has
    to start no earlier than now: a Monday slot is not availability on Friday,
    and showing it would put the panel back in the business of advertising
    times nobody can book.
  */
  const days = ["2026-09-07", "2026-09-08", "2026-09-09", "2026-09-10", "2026-09-11", "2026-09-12", "2026-09-13"];

  test("ends at the close of the last day shown", () => {
    const { end } = previewWindow(days, "Asia/Tokyo", new Date("2026-09-11T01:00:00.000Z"));

    // Midnight ending Sunday the 13th in Tokyo is 15:00 UTC on the 13th.
    expect(end.toISOString()).toBe("2026-09-13T15:00:00.000Z");
  });

  test("starts now when the week is already under way", () => {
    const now = new Date("2026-09-11T01:00:00.000Z");
    const { start } = previewWindow(days, "Asia/Tokyo", now);

    expect(start.toISOString()).toBe(now.toISOString());
  });

  test("starts at the top of the week when the week has not begun", () => {
    // Only reachable if a caller asks for a future week, but the clamp must
    // not run the other way and expand from a date before the grid.
    const { start } = previewWindow(days, "Asia/Tokyo", new Date("2026-09-01T00:00:00.000Z"));

    expect(start.toISOString()).toBe("2026-09-06T15:00:00.000Z");
  });
});

