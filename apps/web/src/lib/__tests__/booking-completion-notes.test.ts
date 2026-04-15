import { describe, expect, test } from "vitest";
import {
  BOOKING_COMPLETION_NOTES_MD_MAX,
  normalizeBookingCompletionNotesPatch,
} from "@/lib/booking-completion-notes";

describe("bookingCompletionNotesPatchSchema", () => {
  test("rejects empty body", () => {
    expect(normalizeBookingCompletionNotesPatch({}).success).toBe(false);
  });

  test("accepts valid markdown and https URL", () => {
    const r = normalizeBookingCompletionNotesPatch({
      completionNotesMd: "## Summary\n\nGreat session.",
      externalTranscriptUrl: "https://docs.google.com/document/d/abc123/edit",
    });
    expect(r.success).toBe(true);
  });

  test("maps whitespace-only transcript URL to null after transform", () => {
    const r = normalizeBookingCompletionNotesPatch({
      completionNotesMd: "Hi",
      externalTranscriptUrl: "   ",
    });
    expect(r.success).toBe(true);
    if (r.success) {
      expect(r.data.externalTranscriptUrl).toBeNull();
    }
  });

  test("rejects invalid URL", () => {
    const r = normalizeBookingCompletionNotesPatch({
      externalTranscriptUrl: "not-a-url",
    });
    expect(r.success).toBe(false);
  });

  test("rejects markdown over max length", () => {
    const r = normalizeBookingCompletionNotesPatch({
      completionNotesMd: "x".repeat(BOOKING_COMPLETION_NOTES_MD_MAX + 1),
      externalTranscriptUrl: null,
    });
    expect(r.success).toBe(false);
  });

  test("accepts transcript URL only", () => {
    const r = normalizeBookingCompletionNotesPatch({
      externalTranscriptUrl: "https://example.com/recap",
    });
    expect(r.success).toBe(true);
  });
});
