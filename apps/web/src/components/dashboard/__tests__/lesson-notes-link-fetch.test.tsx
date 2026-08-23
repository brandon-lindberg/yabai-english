// @vitest-environment jsdom

import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { NextIntlClientProvider } from "next-intl";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import en from "../../../../messages/en.json";
import { TeacherLessonCompletionNotesForm } from "../teacher-lesson-completion-notes-form";

const NOTES_URL = "https://docs.google.com/document/d/abc/edit?tab=t.x";
const copy = en.dashboard.schedulePage;

function mockFetch(outcome: Record<string, unknown>, ok = true) {
  return vi.fn().mockResolvedValue({ ok, json: async () => outcome });
}

function renderForm(props: Partial<Parameters<typeof TeacherLessonCompletionNotesForm>[0]> = {}) {
  return render(
    <NextIntlClientProvider locale="en" messages={en}>
      <TeacherLessonCompletionNotesForm
        bookingId="b-1"
        initialCompletionNotesMd={null}
        initialExternalTranscriptUrl={null}
        canFetchNotesLink
        {...props}
      />
    </NextIntlClientProvider>,
  );
}

const linkField = () => screen.getByLabelText(copy.transcriptLinkLabel) as HTMLInputElement;

beforeEach(() => {
  vi.stubGlobal("fetch", mockFetch({ status: "FOUND", url: NOTES_URL }));
});
afterEach(() => {
  vi.unstubAllGlobals();
});

describe("lesson notes link — automatic fetch on open", () => {
  test("fills the link in when the lesson is opened with an empty field", async () => {
    renderForm();

    await waitFor(() => expect(linkField().value).toBe(NOTES_URL));
    expect(fetch).toHaveBeenCalledWith("/api/bookings/b-1/notes-link", { method: "POST" });
  });

  test("leaves a link the teacher already saved alone", async () => {
    // Their own link must not be second-guessed, and it is not worth a round trip.
    renderForm({ initialExternalTranscriptUrl: "https://example.test/mine" });

    await waitFor(() => expect(linkField().value).toBe("https://example.test/mine"));
    expect(fetch).not.toHaveBeenCalled();
  });

  test("does nothing for a lesson with no calendar event", async () => {
    renderForm({ canFetchNotesLink: false });

    await waitFor(() => expect(screen.queryByRole("button", { name: copy.notesLinkFetch })).toBeNull());
    expect(fetch).not.toHaveBeenCalled();
  });

  test("says the notes are not published yet rather than failing silently", async () => {
    vi.stubGlobal("fetch", mockFetch({ status: "NO_NOTES_YET" }));

    renderForm();

    await waitFor(() => expect(screen.getByText(copy.notesLinkPending)).toBeInTheDocument());
    expect(linkField().value).toBe("");
  });

  test("surfaces a Google outage as recoverable, not as an empty result", async () => {
    vi.stubGlobal("fetch", mockFetch({ status: "LOOKUP_FAILED" }, false));

    renderForm();

    await waitFor(() => expect(screen.getByText(copy.notesLinkFailed)).toBeInTheDocument());
  });
});

describe("lesson notes link — manual fetch", () => {
  test("retries on demand, which is the point of the button", async () => {
    // Gemini publishes minutes after the call, so the automatic pass on open
    // often lands too early; the teacher needs a way to ask again.
    vi.stubGlobal("fetch", mockFetch({ status: "NO_NOTES_YET" }));
    renderForm();
    await waitFor(() => expect(screen.getByText(copy.notesLinkPending)).toBeInTheDocument());

    vi.stubGlobal("fetch", mockFetch({ status: "FOUND", url: NOTES_URL }));
    fireEvent.click(screen.getByRole("button", { name: copy.notesLinkFetch }));

    await waitFor(() => expect(linkField().value).toBe(NOTES_URL));
    expect(screen.getByText(copy.notesLinkFound)).toBeInTheDocument();
  });

  test("stays available even when a link is already present", async () => {
    renderForm({ initialExternalTranscriptUrl: "https://example.test/mine" });

    expect(screen.getByRole("button", { name: copy.notesLinkFetch })).toBeInTheDocument();
  });

  test("the automatic pass runs once, so reopening does not spam Google", async () => {
    const spy = mockFetch({ status: "NO_NOTES_YET" });
    vi.stubGlobal("fetch", spy);

    const view = renderForm();
    await waitFor(() => expect(spy).toHaveBeenCalledTimes(1));
    view.rerender(
      <NextIntlClientProvider locale="en" messages={en}>
        <TeacherLessonCompletionNotesForm
          bookingId="b-1"
          initialCompletionNotesMd={null}
          initialExternalTranscriptUrl={null}
          canFetchNotesLink
        />
      </NextIntlClientProvider>,
    );

    expect(spy).toHaveBeenCalledTimes(1);
  });
});
