import { describe, expect, test } from "vitest";
import {
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
