import { describe, expect, test, vi } from "vitest";
import { pickNotesAttachment, resolveBookingNotesLink } from "@/lib/google/meeting-notes-link";

const DOC = "application/vnd.google-apps.document";
const NOTES_URL =
  "https://docs.google.com/document/d/1F-wzwk5CaVF3U_J-J2jPpVwcPYVtRppFJG9myzyrS-Q/edit?tab=t.pfel1dutdy5f";

describe("pickNotesAttachment", () => {
  test("takes the Gemini notes document off the event", () => {
    expect(
      pickNotesAttachment([
        { mimeType: DOC, fileUrl: NOTES_URL, title: "Notes by Gemini" },
      ]),
    ).toEqual({ url: NOTES_URL, title: "Notes by Gemini" });
  });

  test("prefers the generated notes over an agenda the teacher attached", () => {
    const picked = pickNotesAttachment([
      { mimeType: DOC, fileUrl: "https://docs.google.com/document/d/agenda/edit", title: "Lesson agenda" },
      { mimeType: DOC, fileUrl: NOTES_URL, title: "Notes by Gemini" },
    ]);

    expect(picked?.url).toBe(NOTES_URL);
  });

  test("falls back to the only document rather than returning nothing", () => {
    // Google has renamed this document before; an unrecognised title is not a
    // reason to give the teacher no link at all.
    const picked = pickNotesAttachment([
      { mimeType: DOC, fileUrl: NOTES_URL, title: "Untitled document" },
    ]);

    expect(picked?.url).toBe(NOTES_URL);
  });

  test("builds a URL from the file id when Google omits one", () => {
    expect(pickNotesAttachment([{ mimeType: DOC, fileId: "abc123", title: "Notes" }])).toEqual({
      url: "https://docs.google.com/document/d/abc123/edit",
      title: "Notes",
    });
  });

  test("ignores recordings and other non-documents", () => {
    expect(
      pickNotesAttachment([
        { mimeType: "video/mp4", fileUrl: "https://drive.google.com/file/d/rec/view", title: "Recording" },
        { mimeType: "application/vnd.google-apps.spreadsheet", fileUrl: "https://x", title: "Sheet" },
      ]),
    ).toBeNull();
  });

  test("handles an event with no attachments", () => {
    expect(pickNotesAttachment([])).toBeNull();
    expect(pickNotesAttachment(null)).toBeNull();
    expect(pickNotesAttachment(undefined)).toBeNull();
  });
});

function prismaStub({
  booking,
  account = { refreshToken: "enc", revoked: false },
}: {
  booking: Record<string, unknown> | null;
  account?: { refreshToken: string | null; revoked: boolean } | null;
}) {
  return {
    stub: {
      booking: { findUnique: vi.fn().mockResolvedValue(booking) },
      googleIntegrationAccount: { findUnique: vi.fn().mockResolvedValue(account) },
    },
  };
}

const linkedBooking = {
  id: "b-1",
  googleEventId: "evt-1",
  googleCalendarId: "primary",
  externalTranscriptUrl: null,
  teacher: { userId: "u-teacher" },
};

describe("resolveBookingNotesLink", () => {
  test("never overwrites a link the teacher typed", async () => {
    // Their chosen document beats one guessed from an attachment list.
    const { stub } = prismaStub({
      booking: { ...linkedBooking, externalTranscriptUrl: "https://example.test/mine" },
    });

    const outcome = await resolveBookingNotesLink(stub, { bookingId: "b-1" });

    expect(outcome).toEqual({ status: "ALREADY_SET", url: "https://example.test/mine" });
    expect(stub.googleIntegrationAccount.findUnique).not.toHaveBeenCalled();
  });

  test("does not write anything — publishing is the teacher's call", async () => {
    /*
      `externalTranscriptUrl` is rendered to the student. Persisting here would
      publish the teacher's Gemini notes the moment they opened the lesson
      panel, before they had read them. The stub deliberately exposes no
      `update`, so any write would throw rather than pass quietly.
    */
    const { stub } = prismaStub({ booking: linkedBooking, account: null });

    await resolveBookingNotesLink(stub, { bookingId: "b-1" });

    expect(Object.keys(stub.booking)).toEqual(["findUnique"]);
  });

  test("reports a lesson that never had a calendar event", async () => {
    const { stub } = prismaStub({ booking: { ...linkedBooking, googleEventId: null } });

    expect(await resolveBookingNotesLink(stub, { bookingId: "b-1" })).toEqual({
      status: "NO_CALENDAR_EVENT",
    });
  });

  test("reports a disconnected Google account instead of throwing", async () => {
    const { stub } = prismaStub({ booking: linkedBooking, account: null });

    expect(await resolveBookingNotesLink(stub, { bookingId: "b-1" })).toEqual({
      status: "NOT_CONNECTED",
    });
  });

  test("reports a revoked grant as disconnected", async () => {
    const { stub } = prismaStub({
      booking: linkedBooking,
      account: { refreshToken: "enc", revoked: true },
    });

    expect(await resolveBookingNotesLink(stub, { bookingId: "b-1" })).toEqual({
      status: "NOT_CONNECTED",
    });
  });

  test("reports a missing booking rather than crashing the route", async () => {
    const { stub } = prismaStub({ booking: null });

    expect(await resolveBookingNotesLink(stub, { bookingId: "nope" })).toEqual({
      status: "NO_CALENDAR_EVENT",
    });
  });
});
