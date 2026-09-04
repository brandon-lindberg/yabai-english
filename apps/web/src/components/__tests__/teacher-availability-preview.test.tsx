// @vitest-environment jsdom

import { render, screen, within } from "@testing-library/react";
import { NextIntlClientProvider } from "next-intl";
import { describe, expect, test, vi } from "vitest";
import en from "../../../messages/en.json";
import { TeacherAvailabilityPreview } from "@/components/teacher-availability-preview";

vi.mock("@/i18n/navigation", () => ({
  Link: ({
    href,
    children,
    ...rest
  }: { href: string; children: React.ReactNode } & React.AnchorHTMLAttributes<HTMLAnchorElement>) => (
    <a href={String(href)} {...rest}>
      {children}
    </a>
  ),
}));

/*
  A glance at when a teacher is free, in the student's own hours.

  Drawn as a table rather than a wall of divs: the filled cells are the whole
  content, so a reader who cannot see them needs the days and the hours as
  headers and each cell to say which it is. A picture of availability that only
  works visually would say nothing at all to a screen reader.
*/

const days = [
  { dayKey: "2026-09-07", shortLabel: "Mo", dayOfMonth: "7" },
  { dayKey: "2026-09-08", shortLabel: "Tu", dayOfMonth: "8" },
];

vi.mock("next-intl", async (importOriginal) => ({
  ...(await importOriginal<typeof import("next-intl")>()),
  useLocale: () => "en-US",
}));

function grid(filled: Array<[number, number]>) {
  const g = Array.from({ length: 2 }, () => Array.from({ length: 6 }, () => false));
  for (const [d, b] of filled) g[d][b] = true;
  return g;
}

function renderPreview(filled: Array<[number, number]> = [[1, 2]]) {
  return render(
    <NextIntlClientProvider locale="en" messages={en}>
      <TeacherAvailabilityPreview
        days={days}
        grid={grid(filled)}
        timeZone="Asia/Tokyo"
        profileHref="/book/teachers/t-1"
      />
    </NextIntlClientProvider>,
  );
}

describe("TeacherAvailabilityPreview", () => {
  test("labels the days across the top", () => {
    renderPreview();

    expect(screen.getByRole("columnheader", { name: /Tu/ })).toBeInTheDocument();
  });

  test("labels the hours down the side", () => {
    renderPreview();

    expect(screen.getByRole("rowheader", { name: "08 – 12" })).toBeInTheDocument();
  });

  test("says which cells are free, not only shows it", () => {
    renderPreview([[1, 2]]);

    const row = screen.getByRole("rowheader", { name: "08 – 12" }).closest("tr")!;
    const cells = within(row).getAllByRole("cell");
    expect(cells[1]).toHaveAccessibleName(en.booking.availabilityPreviewFree);
    expect(cells[0]).toHaveAccessibleName(en.booking.availabilityPreviewBusy);
  });

  test("names the week it is showing", () => {
    // Weekday names and day numbers alone read as a generic timetable, and are
    // outright ambiguous across a month boundary: "Mon 31 · Tue 1".
    renderPreview();

    expect(screen.getByText(/Sep 7/)).toBeInTheDocument();
  });

  test("names the timezone the grid is drawn in", () => {
    // Without it the grid is unreadable: the student cannot tell whose
    // morning it means.
    renderPreview();

    expect(screen.getByText(/Asia\/Tokyo/)).toBeInTheDocument();
  });

  test("offers the way through to the real calendar", () => {
    // A four-hour band means *some* of that band. Picking a time happens on
    // the teacher's own page.
    renderPreview();

    expect(
      screen.getByRole("link", { name: en.booking.availabilityPreviewFullSchedule }),
    ).toHaveAttribute("href", "/book/teachers/t-1");
  });

  test("gives every day column the same width", () => {
    /*
      Columns sized to their content made the grid ragged: "10" is wider than
      "4", so Thursday's cells came out fatter than Friday's. A fixed layout
      splits the width evenly instead, which is what makes the marks comparable
      down a column at all.
    */
    renderPreview();

    expect(screen.getByRole("table").className).toContain("table-fixed");
  });

  test("keeps the hours column out of the split", () => {
    // Under a fixed layout the first column takes its declared width and the
    // day columns share what is left; without one they would all be equal and
    // "00 - 04" would wrap.
    renderPreview();

    expect(screen.getByRole("rowheader", { name: "08 – 12" }).className).toMatch(/\bw-/);
  });

  test("says so when there is nothing in the window", () => {
    renderPreview([]);

    expect(screen.getByText(en.booking.availabilityPreviewNone)).toBeInTheDocument();
  });

  test("drops the timezone note when there is no grid to caption", () => {
    // It explains how to read the marks. With no marks it explains nothing.
    renderPreview([]);

    expect(screen.queryByText(/Asia\/Tokyo/)).toBeNull();
  });

  test("still offers the full schedule when the week is empty", () => {
    // Nothing this week is not nothing ever, so the way through has to stay.
    renderPreview([]);

    expect(
      screen.getByRole("link", { name: en.booking.availabilityPreviewFullSchedule }),
    ).toBeInTheDocument();
  });
});
