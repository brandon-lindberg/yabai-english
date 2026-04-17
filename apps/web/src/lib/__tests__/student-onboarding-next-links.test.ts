import { describe, expect, test } from "vitest";
import {
  buildStudentOnboardingChecklist,
  computeStudentOnboardingCompletion,
  summarizeStudentOnboardingProgress,
} from "@/lib/student-onboarding-next-links";

describe("buildStudentOnboardingChecklist", () => {
  test("profile href is locale-prefixed and includes onboardingNext", () => {
    const items = buildStudentOnboardingChecklist({
      locale: "en",
      canStartPlacement: true,
    });
    const profile = items.find((i) => i.key === "profile");
    expect(profile).toBeDefined();
    expect(profile?.href).toContain("/en/dashboard/profile?onboardingNext=");
    expect(profile?.href).toContain(encodeURIComponent("/onboarding/next"));
  });

  test("honors ja locale", () => {
    const items = buildStudentOnboardingChecklist({
      locale: "ja",
      canStartPlacement: true,
    });
    const profile = items.find((i) => i.key === "profile");
    expect(profile?.href?.startsWith("/ja/dashboard/profile?")).toBe(true);
  });

  test("integrations/book/chat/placement/materials all carry onboardingNext", () => {
    const items = buildStudentOnboardingChecklist({
      locale: "en",
      canStartPlacement: true,
    });
    for (const key of [
      "integrations",
      "bookLesson",
      "chat",
      "placement",
      "materials",
    ]) {
      const item = items.find((i) => i.key === key);
      expect(item, `missing item ${key}`).toBeDefined();
      expect(item!.href).toContain("onboardingNext=");
    }
  });

  test("teacherProfiles step is removed (combined with bookLesson)", () => {
    const items = buildStudentOnboardingChecklist({
      locale: "en",
      canStartPlacement: true,
    });
    expect(items.find((i) => i.key === ("teacherProfiles" as never))).toBeUndefined();
  });

  test("chat step opens the chat popup on arrival via openChat=1", () => {
    const items = buildStudentOnboardingChecklist({
      locale: "en",
      canStartPlacement: true,
    });
    const chat = items.find((i) => i.key === "chat");
    expect(chat?.href).toMatch(/[?&]openChat=1(&|$)/);
  });

  test("placement disabled when not allowed", () => {
    const items = buildStudentOnboardingChecklist({
      locale: "en",
      canStartPlacement: false,
    });
    const placement = items.find((i) => i.key === "placement");
    expect(placement?.disabled).toBe(true);
  });

  test("custom return href is used", () => {
    const items = buildStudentOnboardingChecklist({
      locale: "en",
      canStartPlacement: true,
      onboardingReturnHref: "/onboarding/next?completed=profile",
    });
    const profile = items.find((i) => i.key === "profile");
    expect(profile?.href).toContain(
      encodeURIComponent("/onboarding/next?completed=profile"),
    );
  });

  test("marks items as completed when provided completion flags", () => {
    const items = buildStudentOnboardingChecklist({
      locale: "en",
      canStartPlacement: true,
      completion: { profile: true, integrations: false, placement: true },
    });
    expect(items.find((i) => i.key === "profile")?.completed).toBe(true);
    expect(items.find((i) => i.key === "integrations")?.completed).toBe(false);
    expect(items.find((i) => i.key === "placement")?.completed).toBe(true);
    expect(items.find((i) => i.key === "materials")?.completed).toBe(false);
  });

  test("each item's href includes onboardingStep matching its key", () => {
    const items = buildStudentOnboardingChecklist({
      locale: "en",
      canStartPlacement: true,
    });
    for (const item of items) {
      expect(item.href).toContain(`onboardingStep=${item.key}`);
    }
  });
});

describe("computeStudentOnboardingCompletion", () => {
  const base = {
    profileShortBio: null,
    userName: null,
    userImage: null,
    googleCalendarConnected: false,
    googleDriveConnected: false,
    hasAnyBooking: false,
    hasAnyChatThread: false,
    placementCompletedAt: null,
    hasStudiedAny: false,
  };

  test("profile completes when any of shortBio/name/image present", () => {
    expect(
      computeStudentOnboardingCompletion({ ...base, profileShortBio: "Hi" }).profile,
    ).toBe(true);
    expect(
      computeStudentOnboardingCompletion({ ...base, userName: "Naoko" }).profile,
    ).toBe(true);
    expect(
      computeStudentOnboardingCompletion({ ...base, userImage: "https://x" }).profile,
    ).toBe(true);
    expect(computeStudentOnboardingCompletion(base).profile).toBe(false);
  });

  test("integrations complete when calendar or drive connected", () => {
    expect(
      computeStudentOnboardingCompletion({ ...base, googleCalendarConnected: true })
        .integrations,
    ).toBe(true);
    expect(
      computeStudentOnboardingCompletion({ ...base, googleDriveConnected: true })
        .integrations,
    ).toBe(true);
    expect(computeStudentOnboardingCompletion(base).integrations).toBe(false);
  });

  test("book step completes on first booking", () => {
    const res = computeStudentOnboardingCompletion({ ...base, hasAnyBooking: true });
    expect(res.bookLesson).toBe(true);
  });

  test("chat completes when any thread exists", () => {
    expect(
      computeStudentOnboardingCompletion({ ...base, hasAnyChatThread: true }).chat,
    ).toBe(true);
  });

  test("placement completes when placementCompletedAt set", () => {
    expect(
      computeStudentOnboardingCompletion({
        ...base,
        placementCompletedAt: new Date(),
      }).placement,
    ).toBe(true);
  });

  test("materials complete when user has studied any cards/levels", () => {
    expect(
      computeStudentOnboardingCompletion({ ...base, hasStudiedAny: true }).materials,
    ).toBe(true);
  });

  test("skipped steps are treated as completed regardless of signals", () => {
    const result = computeStudentOnboardingCompletion(
      { ...base },
      { skippedSteps: ["integrations", "chat", "materials"] },
    );
    expect(result.integrations).toBe(true);
    expect(result.chat).toBe(true);
    expect(result.materials).toBe(true);
    expect(result.profile).toBe(false);
  });

  test("an underlying signal still wins when a step is skipped", () => {
    const result = computeStudentOnboardingCompletion(
      { ...base, hasAnyBooking: true },
      { skippedSteps: ["bookLesson"] },
    );
    expect(result.bookLesson).toBe(true);
  });
});

describe("summarizeStudentOnboardingProgress", () => {
  test("counts completed items over total and returns percent", () => {
    const items = buildStudentOnboardingChecklist({
      locale: "en",
      canStartPlacement: true,
      completion: { profile: true, integrations: true, chat: true },
    });
    const summary = summarizeStudentOnboardingProgress(items);
    expect(summary.total).toBe(items.length);
    expect(summary.completed).toBe(3);
    expect(summary.percent).toBe(Math.round((3 / items.length) * 100));
  });

  test("returns 0 completed and 0 percent when nothing completed", () => {
    const items = buildStudentOnboardingChecklist({
      locale: "en",
      canStartPlacement: true,
    });
    const summary = summarizeStudentOnboardingProgress(items);
    expect(summary.completed).toBe(0);
    expect(summary.percent).toBe(0);
  });

  test("returns 100 percent when all completed", () => {
    const items = buildStudentOnboardingChecklist({
      locale: "en",
      canStartPlacement: true,
      completion: {
        profile: true,
        integrations: true,
        bookLesson: true,
        chat: true,
        placement: true,
        materials: true,
      },
    });
    const summary = summarizeStudentOnboardingProgress(items);
    expect(summary.completed).toBe(items.length);
    expect(summary.percent).toBe(100);
  });
});
