// @vitest-environment jsdom

import { render, screen } from "@testing-library/react";
import { NextIntlClientProvider } from "next-intl";
import { describe, expect, test, vi } from "vitest";
import en from "../../../../messages/en.json";
import { TeacherCompletedLessonsClient } from "../teacher-completed-lessons-client";

describe("TeacherCompletedLessonsClient", () => {
  test("shows invoice download links when an invoice exists", () => {
    render(
      <NextIntlClientProvider locale="en" messages={en}>
        <TeacherCompletedLessonsClient
          lessons={[
            {
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
            },
          ]}
        />
      </NextIntlClientProvider>,
    );

    expect(
      screen.getByRole("link", { name: en.dashboard.downloadInvoiceEn }),
    ).toHaveAttribute("href", "/api/invoices/inv-1/pdf?lang=en");
    expect(
      screen.getByRole("link", { name: en.dashboard.downloadInvoiceJa }),
    ).toHaveAttribute("href", "/api/invoices/inv-1/pdf?lang=ja");
  });
});
