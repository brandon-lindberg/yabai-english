import { describe, expect, test } from "vitest";
import {
  resolveTeacherStripeSetupState,
  summarizeStripeRequirements,
} from "@/lib/teacher-stripe-setup";

describe("resolveTeacherStripeSetupState", () => {
  const readyStripe = {
    id: "acct-1",
    provider: "STRIPE" as const,
    providerAccountId: "acct_123",
    status: "ENABLED" as const,
    chargesEnabled: true,
    payoutsEnabled: true,
    requirementsDue: [] as string[],
    methods: [{ method: "CARD" as const, enabled: true }],
  };

  test("returns policy_required when payment policy is not accepted", () => {
    expect(
      resolveTeacherStripeSetupState({
        paymentPolicyAcceptedAt: null,
        accounts: [],
        stripeConnectEnabled: true,
      }),
    ).toEqual({ state: "policy_required" });
  });

  test("returns not_started when policy is accepted but no real Stripe account exists", () => {
    expect(
      resolveTeacherStripeSetupState({
        paymentPolicyAcceptedAt: "2026-05-01T00:00:00.000Z",
        accounts: [],
        stripeConnectEnabled: true,
      }),
    ).toEqual({ state: "not_started" });
  });

  test("returns in_progress when Stripe account exists but is not ready", () => {
    expect(
      resolveTeacherStripeSetupState({
        paymentPolicyAcceptedAt: "2026-05-01T00:00:00.000Z",
        accounts: [
          {
            ...readyStripe,
            status: "PENDING",
            chargesEnabled: false,
            payoutsEnabled: false,
          },
        ],
        stripeConnectEnabled: true,
      }),
    ).toEqual({ state: "in_progress", stripeAccountId: "acct-1" });
  });

  test("returns action_required when Stripe reports outstanding requirements", () => {
    expect(
      resolveTeacherStripeSetupState({
        paymentPolicyAcceptedAt: "2026-05-01T00:00:00.000Z",
        accounts: [
          {
            ...readyStripe,
            status: "REQUIREMENTS_DUE",
            chargesEnabled: false,
            requirementsDue: ["individual.verification.document"],
          },
        ],
        stripeConnectEnabled: true,
      }),
    ).toEqual({
      state: "action_required",
      stripeAccountId: "acct-1",
      requirementsDue: ["individual.verification.document"],
    });
  });

  test("returns ready when Stripe account is fully enabled", () => {
    expect(
      resolveTeacherStripeSetupState({
        paymentPolicyAcceptedAt: "2026-05-01T00:00:00.000Z",
        accounts: [readyStripe],
        stripeConnectEnabled: true,
      }),
    ).toEqual({ state: "ready", stripeAccountId: "acct-1" });
  });

  test("ignores local dev Stripe accounts when resolving real Connect state", () => {
    expect(
      resolveTeacherStripeSetupState({
        paymentPolicyAcceptedAt: "2026-05-01T00:00:00.000Z",
        accounts: [
          {
            id: "local",
            provider: "STRIPE",
            providerAccountId: "acct_local_teacher-profile-1",
            status: "ENABLED",
            chargesEnabled: true,
            payoutsEnabled: true,
            requirementsDue: [],
            methods: [{ method: "CARD", enabled: true }],
          },
        ],
        stripeConnectEnabled: true,
      }),
    ).toEqual({ state: "not_started" });
  });
});

describe("summarizeStripeRequirements", () => {
  test("maps identity-related requirements to identity hint", () => {
    expect(summarizeStripeRequirements(["individual.verification.document"])).toEqual([
      "identity",
    ]);
  });

  test("maps bank-related requirements to bank hint", () => {
    expect(summarizeStripeRequirements(["external_account"])).toEqual(["bank"]);
  });
});
