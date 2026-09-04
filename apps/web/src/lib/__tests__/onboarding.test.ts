import { describe, expect, test } from "vitest";
import { LEARNING_GOALS as SHARED_GOALS } from "@/lib/student-learning-goals";
import {
  LEARNING_GOALS,
  onboardingPayloadSchema,
  isStudentOnboardingComplete,
} from "@/lib/onboarding";

describe("onboarding payload schema", () => {
  test("accepts a valid payload", () => {
    const parsed = onboardingPayloadSchema.parse({
      timezone: "Asia/Tokyo",
      learningGoals: ["conversation", "business"],
      notifyLessonReminders: true,
      notifyMessages: true,
      notifyPayments: false,
      acceptedTerms: true,
      acceptedPrivacy: true,
      acceptedRecordingConsent: true,
    });

    expect(parsed.timezone).toBe("Asia/Tokyo");
    expect(parsed.learningGoals).toEqual(["conversation", "business"]);
  });

  test("rejects payload when legal consents are not all true", () => {
    expect(() =>
      onboardingPayloadSchema.parse({
        timezone: "Asia/Tokyo",
        learningGoals: ["conversation"],
        notifyLessonReminders: true,
        notifyMessages: true,
        notifyPayments: true,
        acceptedTerms: false,
        acceptedPrivacy: true,
        acceptedRecordingConsent: true,
      }),
    ).toThrow();
  });

  test("rejects unsupported learning goals", () => {
    expect(() =>
      onboardingPayloadSchema.parse({
        timezone: "Asia/Tokyo",
        learningGoals: ["kids"],
        notifyLessonReminders: true,
        notifyMessages: true,
        notifyPayments: true,
        acceptedTerms: true,
        acceptedPrivacy: true,
        acceptedRecordingConsent: true,
      }),
    ).toThrow();
  });
});

describe("isStudentOnboardingComplete", () => {
  test("returns true when all required student onboarding fields are present", () => {
    expect(
      isStudentOnboardingComplete({
        timezone: "Asia/Tokyo",
        learningGoals: ["conversation"],
        termsAcceptedAt: new Date(),
        privacyAcceptedAt: new Date(),
        recordingConsentAt: new Date(),
        onboardingCompletedAt: new Date(),
      }),
    ).toBe(true);
  });

  test("returns false when onboarding completion timestamp is missing", () => {
    expect(
      isStudentOnboardingComplete({
        timezone: "Asia/Tokyo",
        learningGoals: ["conversation"],
        termsAcceptedAt: new Date(),
        privacyAcceptedAt: new Date(),
        recordingConsentAt: new Date(),
        onboardingCompletedAt: null,
      }),
    ).toBe(false);
  });
});

describe("a goal in the student's own words", () => {
  /*
    The payload schema is `.strict()`, so an unknown key is a 400 — the wizard
    would have collected the free-text goal and then failed the whole save on
    it. And the goal list lived here a third time, as a bare string tuple; it
    is derived from the shared one now, so the wizard, the profile and the
    validator cannot offer three different sets.
  */
  const valid = {
    timezone: "Asia/Tokyo",
    learningGoals: ["conversation"],
    notifyLessonReminders: true,
    notifyMessages: true,
    notifyPayments: true,
    acceptedTerms: true,
    acceptedPrivacy: true,
    acceptedRecordingConsent: true,
  } as const;

  test("accepts the note", () => {
    const parsed = onboardingPayloadSchema.safeParse({
      ...valid,
      learningGoalsNote: "Pass N2 by March",
    });

    expect(parsed.success).toBe(true);
  });

  test("accepts its absence", () => {
    expect(onboardingPayloadSchema.safeParse(valid).success).toBe(true);
  });

  test("refuses one longer than the column", () => {
    const parsed = onboardingPayloadSchema.safeParse({
      ...valid,
      learningGoalsNote: "x".repeat(201),
    });

    expect(parsed.success).toBe(false);
  });

  test("offers exactly the shared list of goals", () => {
    expect([...LEARNING_GOALS]).toEqual(SHARED_GOALS.map((goal) => goal.id));
  });
});
