import { beforeEach, describe, expect, test, vi } from "vitest";
import { syncTeacherPaymentAccountFromStripe } from "@/lib/stripe/sync-teacher-payment-account";

function syncPrisma() {
  return {
    teacherPaymentMethod: { upsert: vi.fn().mockResolvedValue({}) },
    teacherPaymentAccount: { update: vi.fn().mockResolvedValue({ id: "acct-row-1" }) },
  };
}

const readyWithBoth = {
  charges_enabled: true,
  payouts_enabled: true,
  requirements: { currently_due: [], past_due: [] },
  capabilities: { card_payments: "active" },
};

function upsertedMethods(prisma: ReturnType<typeof syncPrisma>) {
  return prisma.teacherPaymentMethod.upsert.mock.calls.map(([args]) => ({
    method: args.where.accountId_method.method,
    enabled: args.update.enabled,
  }));
}

describe("syncTeacherPaymentAccountFromStripe", () => {
  beforeEach(() => vi.clearAllMocks());

  test("enables every method the connected account can charge", async () => {
    const prisma = syncPrisma();

    await syncTeacherPaymentAccountFromStripe(prisma, {
      paymentAccountId: "acct-row-1",
      stripeAccount: readyWithBoth,
    });

    expect(upsertedMethods(prisma)).toEqual([{ method: "CARD", enabled: true }]);
  });

  // A method row must be written even when off, so losing a capability turns the
  // option off for students rather than leaving a stale row enabled.
  test("writes a disabled row for a method the account cannot charge", async () => {
    const prisma = syncPrisma();

    await syncTeacherPaymentAccountFromStripe(prisma, {
      paymentAccountId: "acct-row-1",
      stripeAccount: { ...readyWithBoth, capabilities: { card_payments: "inactive" } },
    });

    expect(upsertedMethods(prisma)).toEqual([{ method: "CARD", enabled: false }]);
  });

  test("records the account's onboarding state alongside the methods", async () => {
    const prisma = syncPrisma();

    await syncTeacherPaymentAccountFromStripe(prisma, {
      paymentAccountId: "acct-row-1",
      stripeAccount: {
        charges_enabled: true,
        payouts_enabled: false,
        requirements: { currently_due: ["external_account"], past_due: [] },
        capabilities: { card_payments: "active" },
      },
    });

    expect(prisma.teacherPaymentAccount.update).toHaveBeenCalledWith({
      where: { id: "acct-row-1" },
      data: {
        status: "REQUIREMENTS_DUE",
        chargesEnabled: true,
        payoutsEnabled: false,
        requirementsDue: ["external_account"],
        detailsSubmitted: false,
        pendingVerification: [],
        disabledReason: null,
      },
    });
  });

  // The review columns are what let the teacher UI say "Stripe is checking,
  // sit tight" instead of "go finish setup", so they have to survive the sync.
  test("persists the review signals Stripe reports", async () => {
    const prisma = syncPrisma();

    await syncTeacherPaymentAccountFromStripe(prisma, {
      paymentAccountId: "acct-row-1",
      stripeAccount: {
        charges_enabled: false,
        payouts_enabled: true,
        details_submitted: true,
        requirements: {
          currently_due: [],
          past_due: [],
          pending_verification: ["individual.verification.document"],
          disabled_reason: "under_review",
        },
        capabilities: { card_payments: "pending" },
      },
    });

    expect(prisma.teacherPaymentAccount.update).toHaveBeenCalledWith({
      where: { id: "acct-row-1" },
      data: {
        status: "PENDING",
        chargesEnabled: false,
        payoutsEnabled: true,
        requirementsDue: [],
        detailsSubmitted: true,
        pendingVerification: ["individual.verification.document"],
        disabledReason: "under_review",
      },
    });
  });

  test("returns the updated account row for the caller to respond with", async () => {
    const prisma = syncPrisma();

    const result = await syncTeacherPaymentAccountFromStripe(prisma, {
      paymentAccountId: "acct-row-1",
      stripeAccount: readyWithBoth,
    });

    expect(result).toEqual({ id: "acct-row-1" });
  });

  test("lets the caller ask for extra fields on the returned row", async () => {
    const prisma = syncPrisma();

    await syncTeacherPaymentAccountFromStripe(prisma, {
      paymentAccountId: "acct-row-1",
      stripeAccount: readyWithBoth,
      select: { id: true, provider: true },
    });

    expect(prisma.teacherPaymentAccount.update).toHaveBeenCalledWith(
      expect.objectContaining({ select: { id: true, provider: true } }),
    );
  });
});
