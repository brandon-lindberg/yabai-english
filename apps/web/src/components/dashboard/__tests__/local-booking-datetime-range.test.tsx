// @vitest-environment jsdom

import { describe, expect, test } from "vitest";
import { render, screen } from "@testing-library/react";
import { LocalBookingDateTimeRange } from "../local-booking-datetime-range";

describe("LocalBookingDateTimeRange", () => {
  test("with timeZone, renders JST wall time for a UTC instant", () => {
    const iso = "2026-05-03T01:30:00.000Z";
    render(
      <LocalBookingDateTimeRange
        locale="en-US"
        startsAtIso={iso}
        endsAtIso="2026-05-03T02:10:00.000Z"
        timeZone="Asia/Tokyo"
        separator=" - "
      />,
    );
    const el = screen.getByText(/10:30/);
    expect(el.textContent).toMatch(/May 3, 2026/i);
    expect(el.textContent).toMatch(/11:10|11:10/);
  });
});
