// @vitest-environment jsdom

import { act, fireEvent, render, screen } from "@testing-library/react";
import { NextIntlClientProvider } from "next-intl";
import { describe, expect, test, vi } from "vitest";
import en from "../../../../messages/en.json";
import {
  TeacherCompletedLessonsClient,
  type TeacherCompletedLessonItem,
} from "../teacher-completed-lessons-client";

const lessonWithInvoice: TeacherCompletedLessonItem = {
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
};

function renderCompletedLessons(lessons: TeacherCompletedLessonItem[] = [lessonWithInvoice]) {
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

    expect(
      screen.getByRole("link", { name: en.dashboard.downloadInvoiceEn }),
    ).toHaveAttribute("href", "/api/invoices/inv-1/pdf?lang=en");
    expect(
      screen.getByRole("link", { name: en.dashboard.downloadInvoiceJa }),
    ).toHaveAttribute("href", "/api/invoices/inv-1/pdf?lang=ja");
  });

  test("clicking an invoice link does not expand a lesson card", () => {
    renderCompletedLessons();

    const lessonToggle = screen.getByRole("button", { name: /初級 \/ Beginner/ });
    expect(lessonToggle).toHaveAttribute("aria-expanded", "false");

    clickDownloadLink(screen.getByRole("link", { name: en.dashboard.downloadInvoiceEn }));

    expect(lessonToggle).toHaveAttribute("aria-expanded", "false");
  });

  test("clicking an invoice link does not expand a lesson row in list view", async () => {
    renderCompletedLessons();

    await act(async () => {
      fireEvent.click(
        screen.getByRole("button", {
          name: en.dashboard.schedulePage.completedLessonsViewList,
        }),
      );
      await Promise.resolve();
    });
    const lessonToggle = screen.getByRole("button", { name: /Student S/ });
    expect(lessonToggle).toHaveAttribute("aria-expanded", "false");

    clickDownloadLink(screen.getByRole("link", { name: en.dashboard.downloadInvoiceJa }));

    expect(lessonToggle).toHaveAttribute("aria-expanded", "false");
  });
});
