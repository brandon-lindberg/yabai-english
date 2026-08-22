// @vitest-environment jsdom

import { fireEvent, render, screen } from "@testing-library/react";
import { NextIntlClientProvider } from "next-intl";
import { describe, expect, test } from "vitest";
import en from "../../../../messages/en.json";
import {
  TeacherCompletedLessonsClient,
  type TeacherCompletedLessonItem,
} from "../teacher-completed-lessons-client";

function lesson(overrides: Partial<TeacherCompletedLessonItem> = {}): TeacherCompletedLessonItem {
  return {
    id: "booking-1",
    startsAtIso: "2026-05-10T10:00:00.000Z",
    endsAtIso: "2026-05-10T10:30:00.000Z",
    lessonTitleJa: "初級",
    lessonTitleEn: "Beginner",
    studentDisplay: "Student S",
    initialCompletionNotesMd: null,
    initialExternalTranscriptUrl: null,
    notesDocId: null,
    transcriptArtifactIds: [],
    smartNotesIds: [],
    recordingIds: [],
    hasSavedContent: false,
    invoiceId: "inv-1",
    ...overrides,
  };
}

function renderCompletedLessons(lessons: TeacherCompletedLessonItem[] = [lesson()]) {
  return render(
    <NextIntlClientProvider locale="en" messages={en}>
      <TeacherCompletedLessonsClient lessons={lessons} />
    </NextIntlClientProvider>,
  );
}

function clickDownloadLink(link: HTMLElement) {
  link.addEventListener("click", (event) => event.preventDefault(), { once: true });
  fireEvent.click(link);
}

describe("TeacherCompletedLessonsClient", () => {
  test("shows invoice download links when an invoice exists", () => {
    renderCompletedLessons();

    expect(screen.getByRole("link", { name: en.dashboard.downloadInvoiceEn })).toHaveAttribute(
      "href",
      "/api/invoices/inv-1/pdf?lang=en",
    );
    expect(screen.getByRole("link", { name: en.dashboard.downloadInvoiceJa })).toHaveAttribute(
      "href",
      "/api/invoices/inv-1/pdf?lang=ja",
    );
  });

  test("clicking an invoice link does not expand the lesson", () => {
    renderCompletedLessons();

    const toggle = screen.getByRole("button", { name: /初級 \/ Beginner/ });
    expect(toggle).toHaveAttribute("aria-expanded", "false");

    clickDownloadLink(screen.getByRole("link", { name: en.dashboard.downloadInvoiceEn }));

    expect(toggle).toHaveAttribute("aria-expanded", "false");
  });

  test("expanding a lesson opens its panel", () => {
    renderCompletedLessons();

    const toggle = screen.getByRole("button", { name: /初級 \/ Beginner/ });
    fireEvent.click(toggle);

    expect(toggle).toHaveAttribute("aria-expanded", "true");
  });

  test("names each student once, however many lessons they had", () => {
    // The screen sorts by student, and used to print the student's name again
    // on every row — four identical headings in a column.
    renderCompletedLessons([
      lesson({ id: "b1", studentDisplay: "Student S" }),
      lesson({ id: "b2", studentDisplay: "Student S", invoiceId: null }),
      lesson({ id: "b3", studentDisplay: "Student S", invoiceId: null }),
      lesson({ id: "b4", studentDisplay: "Other T", invoiceId: null }),
    ]);

    expect(screen.getAllByRole("heading", { name: /Student S/ })).toHaveLength(1);
    expect(screen.getAllByRole("heading", { name: /Other T/ })).toHaveLength(1);
  });

  test("counts the lessons in each student's group", () => {
    renderCompletedLessons([
      lesson({ id: "b1", studentDisplay: "Student S" }),
      lesson({ id: "b2", studentDisplay: "Student S", invoiceId: null }),
    ]);

    expect(screen.getByRole("heading", { name: /Student S/ }).textContent).toContain("2 lessons");
  });

  test("starts a new group when the same student appears in a later run", () => {
    // Grouping follows the caller's order rather than re-sorting, so a repeat
    // run is its own group — never silently merged out of order.
    renderCompletedLessons([
      lesson({ id: "b1", studentDisplay: "A" }),
      lesson({ id: "b2", studentDisplay: "B", invoiceId: null }),
      lesson({ id: "b3", studentDisplay: "A", invoiceId: null }),
    ]);

    expect(screen.getAllByRole("heading", { name: /^A/ })).toHaveLength(2);
  });

  test("states the date once for a lesson that starts and ends on the same day", () => {
    // Regression guard: this screen used to print the full date at both ends,
    // "May 10, 2026, 7:00 PM – May 10, 2026, 7:30 PM".
    renderCompletedLessons();

    const toggle = screen.getByRole("button", { name: /初級 \/ Beginner/ });
    const dates = toggle.textContent?.match(/May 10, 2026/g) ?? [];
    expect(dates).toHaveLength(1);
  });

  test("each student is a collapsible section", () => {
    // A full-time roster is unusable as one open list; the student is the unit
    // a teacher navigates by.
    renderCompletedLessons([
      lesson({ id: "b1", studentDisplay: "Recent R" }),
      lesson({ id: "b2", studentDisplay: "Older O", invoiceId: null }),
    ]);

    expect(screen.getByRole("button", { name: /Recent R/ })).toHaveAttribute(
      "aria-expanded",
      "true",
    );
    expect(screen.getByRole("button", { name: /Older O/ })).toHaveAttribute(
      "aria-expanded",
      "false",
    );
  });

  test("opens the most recent student and leaves the rest closed", () => {
    // The caller sorts most-recent-first, so the first run is who you are
    // teaching now — the one worth showing without a click.
    renderCompletedLessons([
      lesson({ id: "b1", studentDisplay: "Recent R" }),
      lesson({ id: "b2", studentDisplay: "Older O", invoiceId: null }),
    ]);

    expect(screen.getByRole("button", { name: /初級 \/ Beginner/ })).toBeInTheDocument();
    expect(screen.queryAllByRole("button", { name: /初級 \/ Beginner/ })).toHaveLength(1);
  });

  test("collapsing a student hides their lessons", () => {
    renderCompletedLessons();

    const student = screen.getByRole("button", { name: /Student S/ });
    fireEvent.click(student);

    expect(student).toHaveAttribute("aria-expanded", "false");
    expect(screen.queryByRole("button", { name: /初級 \/ Beginner/ })).toBeNull();
  });

  test("expanding a closed student reveals their lessons", () => {
    renderCompletedLessons([
      lesson({ id: "b1", studentDisplay: "Recent R" }),
      lesson({ id: "b2", studentDisplay: "Older O", invoiceId: null }),
    ]);

    fireEvent.click(screen.getByRole("button", { name: /Older O/ }));

    expect(screen.queryAllByRole("button", { name: /初級 \/ Beginner/ })).toHaveLength(2);
  });

  test("groups a student's lessons under year, then month", () => {
    renderCompletedLessons([
      lesson({ id: "b1", startsAtIso: "2026-05-10T10:00:00.000Z", endsAtIso: "2026-05-10T10:30:00.000Z" }),
      lesson({ id: "b2", startsAtIso: "2026-04-02T10:00:00.000Z", endsAtIso: "2026-04-02T10:30:00.000Z", invoiceId: null }),
      lesson({ id: "b3", startsAtIso: "2025-11-02T10:00:00.000Z", endsAtIso: "2025-11-02T10:30:00.000Z", invoiceId: null }),
    ]);

    expect(screen.getByRole("button", { name: /^2026/ })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: /May 2026/ })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: /April 2026/ })).toBeInTheDocument();
  });

  test("a year is collapsible and counts its lessons across months", () => {
    renderCompletedLessons([
      lesson({ id: "b1", startsAtIso: "2026-05-10T10:00:00.000Z", endsAtIso: "2026-05-10T10:30:00.000Z" }),
      lesson({ id: "b2", startsAtIso: "2026-04-02T10:00:00.000Z", endsAtIso: "2026-04-02T10:30:00.000Z", invoiceId: null }),
    ]);

    const year = screen.getByRole("button", { name: /^2026/ });
    expect(year.textContent).toContain("2 lessons");

    fireEvent.click(year);
    expect(year).toHaveAttribute("aria-expanded", "false");
    expect(screen.queryByRole("heading", { name: /May 2026/ })).toBeNull();
  });

  test("opens only the most recent year within a student", () => {
    renderCompletedLessons([
      lesson({ id: "b1", startsAtIso: "2026-05-10T10:00:00.000Z", endsAtIso: "2026-05-10T10:30:00.000Z" }),
      lesson({ id: "b2", startsAtIso: "2025-11-02T10:00:00.000Z", endsAtIso: "2025-11-02T10:30:00.000Z", invoiceId: null }),
    ]);

    expect(screen.getByRole("button", { name: /^2026/ })).toHaveAttribute("aria-expanded", "true");
    expect(screen.getByRole("button", { name: /^2025/ })).toHaveAttribute("aria-expanded", "false");
  });
});
