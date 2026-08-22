import { beforeEach, describe, expect, test, vi } from "vitest";

const { createNotificationMock } = vi.hoisted(() => ({
  createNotificationMock: vi.fn(),
}));

vi.mock("@/lib/notifications", () => ({
  createUserNotification: createNotificationMock,
}));

import { notifyTeacherOfStripePhaseChange } from "@/lib/stripe/stripe-account-notifications";

describe("notifyTeacherOfStripePhaseChange", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // `account.updated` fires for payout-schedule edits and metadata writes too.
  // Re-announcing the same phase on each one is how a notification bell becomes
  // something people stop reading.
  test("says nothing when the phase has not changed", async () => {
    const sent = await notifyTeacherOfStripePhaseChange({
      userId: "user-1",
      previousPhase: "in_review",
      nextPhase: "in_review",
    });

    expect(sent).toBe(false);
    expect(createNotificationMock).not.toHaveBeenCalled();
  });

  test("says nothing about in_progress, which is not news to the teacher", async () => {
    const sent = await notifyTeacherOfStripePhaseChange({
      userId: "user-1",
      previousPhase: "not_started" as never,
      nextPhase: "in_progress",
    });

    expect(sent).toBe(false);
    expect(createNotificationMock).not.toHaveBeenCalled();
  });

  test("announces approval in both languages", async () => {
    const sent = await notifyTeacherOfStripePhaseChange({
      userId: "user-1",
      previousPhase: "in_review",
      nextPhase: "ready",
    });

    expect(sent).toBe(true);
    const arg = createNotificationMock.mock.calls[0][0];
    expect(arg.userId).toBe("user-1");
    expect(arg.titleEn).toContain("approved");
    expect(arg.titleJa).toContain("承認");
    expect(arg.href).toBe("/dashboard/settings?tab=payments");
  });

  test("reassures rather than alarms when a review starts", async () => {
    await notifyTeacherOfStripePhaseChange({
      userId: "user-1",
      previousPhase: "in_progress",
      nextPhase: "in_review",
    });

    const arg = createNotificationMock.mock.calls[0][0];
    expect(arg.bodyEn).toContain("nothing for you to do");
    expect(arg.bodyEn).toContain("normal");
  });

  // "Stripe needs something" without saying what sends the teacher hunting.
  test("names the missing pieces when Stripe says what they are", async () => {
    await notifyTeacherOfStripePhaseChange({
      userId: "user-1",
      previousPhase: "in_review",
      nextPhase: "action_required",
      requirementsDue: ["individual.verification.document", "external_account"],
    });

    const arg = createNotificationMock.mock.calls[0][0];
    expect(arg.bodyEn).toContain("identity verification");
    expect(arg.bodyEn).toContain("bank account");
    expect(arg.bodyJa).toContain("本人確認");
  });

  test("falls back to pointing at Stripe when the requirement list is empty", async () => {
    await notifyTeacherOfStripePhaseChange({
      userId: "user-1",
      previousPhase: "in_review",
      nextPhase: "action_required",
      requirementsDue: [],
    });

    const arg = createNotificationMock.mock.calls[0][0];
    expect(arg.bodyEn).toContain("Open Stripe");
  });

  // A restricted account must never be told to wait it out.
  test("tells a restricted account to contact Stripe, not to wait", async () => {
    await notifyTeacherOfStripePhaseChange({
      userId: "user-1",
      previousPhase: "in_review",
      nextPhase: "restricted",
    });

    const arg = createNotificationMock.mock.calls[0][0];
    expect(arg.bodyEn).toContain("will not clear on its own");
    expect(arg.bodyEn).toContain("contact Stripe support");
    expect(arg.bodyEn).not.toContain("few business days");
  });
});
