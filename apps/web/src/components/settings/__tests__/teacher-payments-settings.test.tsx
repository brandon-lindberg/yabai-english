// @vitest-environment jsdom

import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { NextIntlClientProvider } from "next-intl";
import { afterEach, describe, expect, test, vi } from "vitest";
import en from "../../../../messages/en.json";
import { TeacherPaymentsSettings } from "@/components/settings/teacher-payments-settings";

const useSearchParamsMock = vi.fn(() => new URLSearchParams());

vi.mock("next/navigation", async (importOriginal) => ({
  ...(await importOriginal<typeof import("next/navigation")>()),
  useSearchParams: () => useSearchParamsMock(),
}));

describe("TeacherPaymentsSettings", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    useSearchParamsMock.mockReturnValue(new URLSearchParams());
  });

  test("shows connected payment method logos and policy status", () => {
    render(
      <NextIntlClientProvider locale="en" messages={en}>
        <TeacherPaymentsSettings
          paymentPolicyAcceptedAt="2026-05-15T00:00:00.000Z"
          devPaymentsEnabled={false}
          stripeConnectEnabled
          accounts={[
            {
              id: "acct-1",
              provider: "STRIPE",
              status: "ENABLED",
              chargesEnabled: true,
              payoutsEnabled: true,
              providerAccountId: "acct_test",
              methods: [{ method: "CARD", enabled: true }],
            },
          ]}
        />
      </NextIntlClientProvider>,
    );

    expect(screen.getByText(en.dashboard.settingsPage.paymentsConnectedTitle)).toBeTruthy();
    expect(screen.getByLabelText("Stripe available")).toBeTruthy();
    expect(screen.getByText(en.dashboard.settingsPage.paymentPolicyAccepted)).toBeTruthy();
  });

  // The bug this covers: an account under Stripe review is not "ready", so it
  // fell through to the same "finish your setup" copy and Continue button as an
  // account that had never been onboarded. Nothing the teacher clicked helped.
  test("tells a teacher under Stripe review to wait, and offers nothing to click", () => {
    render(
      <NextIntlClientProvider locale="en" messages={en}>
        <TeacherPaymentsSettings
          paymentPolicyAcceptedAt="2026-05-15T00:00:00.000Z"
          devPaymentsEnabled={false}
          stripeConnectEnabled
          accounts={[
            {
              id: "acct-1",
              provider: "STRIPE",
              status: "PENDING",
              chargesEnabled: false,
              payoutsEnabled: true,
              providerAccountId: "acct_test",
              detailsSubmitted: true,
              disabledReason: "under_review",
              methods: [{ method: "CARD", enabled: false }],
            },
          ]}
        />
      </NextIntlClientProvider>,
    );

    const copy = en.dashboard.settingsPage;
    expect(screen.getByText(copy.stripeSetupState_in_review)).toBeTruthy();
    expect(screen.getByText(copy.stripeSetupInReviewNoAction)).toBeTruthy();
    expect(screen.getByText(copy.stripeSetupInReviewTimeline)).toBeTruthy();

    // The misleading half: no "setup in progress", and no button implying the
    // teacher has onboarding left to do.
    expect(screen.queryByText(copy.stripeSetupState_in_progress)).toBeNull();
    expect(screen.queryByLabelText(copy.continueStripeSetup)).toBeNull();
    // Refreshing is still allowed \u2014 it is how the wait ends early.
    expect(screen.getByText(copy.refreshStripe)).toBeTruthy();

    // ...and instead of a dead Continue button, a way to go look at Stripe.
    const stripeLink = screen.getByText(copy.stripeCheckStatusOnStripe);
    expect(stripeLink.getAttribute("href")).toBe("https://dashboard.stripe.com/");
    expect(stripeLink.getAttribute("target")).toBe("_blank");
  });

  test("keeps telling a rejected account to act, rather than to wait it out", () => {
    render(
      <NextIntlClientProvider locale="en" messages={en}>
        <TeacherPaymentsSettings
          paymentPolicyAcceptedAt="2026-05-15T00:00:00.000Z"
          devPaymentsEnabled={false}
          stripeConnectEnabled
          accounts={[
            {
              id: "acct-1",
              provider: "STRIPE",
              status: "PENDING",
              chargesEnabled: false,
              payoutsEnabled: false,
              providerAccountId: "acct_test",
              detailsSubmitted: true,
              disabledReason: "rejected.fraud",
              methods: [{ method: "CARD", enabled: false }],
            },
          ]}
        />
      </NextIntlClientProvider>,
    );

    const copy = en.dashboard.settingsPage;
    expect(screen.getByText(copy.stripeSetupState_restricted)).toBeTruthy();
    expect(screen.queryByText(copy.stripeSetupInReviewTimeline)).toBeNull();
  });

  test("does not present a local dev Stripe account as real Connect-ready", () => {
    render(
      <NextIntlClientProvider locale="en" messages={en}>
        <TeacherPaymentsSettings
          paymentPolicyAcceptedAt="2026-05-15T00:00:00.000Z"
          devPaymentsEnabled
          stripeConnectEnabled={false}
          accounts={[
            {
              id: "acct-1",
              provider: "STRIPE",
              status: "ENABLED",
              chargesEnabled: true,
              payoutsEnabled: true,
              providerAccountId: "acct_local_teacher-profile-1",
              methods: [{ method: "CARD", enabled: true }],
            },
          ]}
        />
      </NextIntlClientProvider>,
    );

    expect(screen.queryByLabelText("Stripe available")).toBeNull();
    expect(screen.getByText(en.dashboard.settingsPage.paymentsNone)).toBeTruthy();
    expect(screen.getByText(en.dashboard.settingsPage.paymentAccountLocalReady)).toBeTruthy();
    expect(screen.queryByRole("button", { name: en.dashboard.settingsPage.enableDevStripe })).toBeNull();
  });

  test("offers local dev payment setup when no method exists", () => {
    render(
      <NextIntlClientProvider locale="en" messages={en}>
        <TeacherPaymentsSettings
          paymentPolicyAcceptedAt={null}
          devPaymentsEnabled
          stripeConnectEnabled={false}
          accounts={[]}
        />
      </NextIntlClientProvider>,
    );

    expect(screen.getByText(en.dashboard.settingsPage.paymentsNone)).toBeTruthy();
    expect(screen.getByRole("button", { name: en.dashboard.settingsPage.enableDevStripe })).toBeTruthy();
  });

  test("starts Stripe Connect onboarding from settings", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        onboardingUrl: "https://connect.stripe.com/setup/s/acct_123",
      }),
    });
    vi.stubGlobal("fetch", fetchMock);
    const assignMock = vi.fn();
    Object.defineProperty(window, "location", {
      configurable: true,
      value: { assign: assignMock },
    });

    render(
      <NextIntlClientProvider locale="en" messages={en}>
        <TeacherPaymentsSettings
          paymentPolicyAcceptedAt="2026-05-15T00:00:00.000Z"
          devPaymentsEnabled={false}
          stripeConnectEnabled
          accounts={[]}
        />
      </NextIntlClientProvider>,
    );

    fireEvent.click(screen.getByRole("button", { name: en.dashboard.settingsPage.connectStripe }));

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith("/api/teacher/payment-accounts/stripe/connect", { method: "POST" });
      expect(assignMock).toHaveBeenCalledWith("https://connect.stripe.com/setup/s/acct_123");
    });
  });

  test("continues Stripe setup when a connected account is incomplete", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        onboardingUrl: "https://connect.stripe.com/setup/s/acct_123",
      }),
    });
    vi.stubGlobal("fetch", fetchMock);
    const assignMock = vi.fn();
    Object.defineProperty(window, "location", {
      configurable: true,
      value: { assign: assignMock },
    });

    render(
      <NextIntlClientProvider locale="en" messages={en}>
        <TeacherPaymentsSettings
          paymentPolicyAcceptedAt="2026-05-15T00:00:00.000Z"
          devPaymentsEnabled={false}
          stripeConnectEnabled
          accounts={[
            {
              id: "acct-1",
              provider: "STRIPE",
              status: "PENDING",
              chargesEnabled: false,
              payoutsEnabled: false,
              providerAccountId: "acct_test",
              methods: [{ method: "CARD", enabled: false }],
            },
          ]}
        />
      </NextIntlClientProvider>,
    );

    fireEvent.click(screen.getByRole("button", { name: en.dashboard.settingsPage.continueStripeSetup }));

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith("/api/teacher/payment-accounts/stripe/connect", { method: "POST" });
      expect(assignMock).toHaveBeenCalledWith("https://connect.stripe.com/setup/s/acct_123");
    });
  });

  test("reopens Stripe setup automatically when Stripe sends the teacher back to refresh", async () => {
    useSearchParamsMock.mockReturnValue(new URLSearchParams("stripe=refresh"));
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        onboardingUrl: "https://connect.stripe.com/setup/s/acct_123",
      }),
    });
    vi.stubGlobal("fetch", fetchMock);
    const assignMock = vi.fn();
    Object.defineProperty(window, "location", {
      configurable: true,
      value: { assign: assignMock },
    });

    render(
      <NextIntlClientProvider locale="en" messages={en}>
        <TeacherPaymentsSettings
          paymentPolicyAcceptedAt={null}
          devPaymentsEnabled={false}
          stripeConnectEnabled
          accounts={[
            {
              id: "acct-1",
              provider: "STRIPE",
              status: "PENDING",
              chargesEnabled: false,
              payoutsEnabled: false,
              providerAccountId: "acct_test",
              methods: [{ method: "CARD", enabled: false }],
            },
          ]}
        />
      </NextIntlClientProvider>,
    );

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith("/api/teacher/payment-accounts/stripe/connect", { method: "POST" });
      expect(assignMock).toHaveBeenCalledWith("https://connect.stripe.com/setup/s/acct_123");
    });
  });

  test("refreshes Stripe account status from settings", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        account: {
          id: "acct-1",
          provider: "STRIPE",
          status: "ENABLED",
          chargesEnabled: true,
          payoutsEnabled: true,
          providerAccountId: "acct_test",
          methods: [{ method: "CARD", enabled: true }],
        },
      }),
    });
    vi.stubGlobal("fetch", fetchMock);

    render(
      <NextIntlClientProvider locale="en" messages={en}>
        <TeacherPaymentsSettings
          paymentPolicyAcceptedAt="2026-05-15T00:00:00.000Z"
          devPaymentsEnabled={false}
          stripeConnectEnabled
          accounts={[
            {
              id: "acct-1",
              provider: "STRIPE",
              status: "PENDING",
              chargesEnabled: false,
              payoutsEnabled: false,
              providerAccountId: "acct_test",
              methods: [{ method: "CARD", enabled: false }],
            },
          ]}
        />
      </NextIntlClientProvider>,
    );

    fireEvent.click(screen.getByRole("button", { name: en.dashboard.settingsPage.refreshStripe }));

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith("/api/teacher/payment-accounts/stripe/sync", { method: "POST" });
      expect(screen.getByLabelText("Stripe available")).toBeTruthy();
    });
  });

  test("shows Stripe setup status card and hides connect when ready", () => {
    render(
      <NextIntlClientProvider locale="en" messages={en}>
        <TeacherPaymentsSettings
          paymentPolicyAcceptedAt="2026-05-15T00:00:00.000Z"
          devPaymentsEnabled={false}
          stripeConnectEnabled
          accounts={[
            {
              id: "acct-1",
              provider: "STRIPE",
              status: "ENABLED",
              chargesEnabled: true,
              payoutsEnabled: true,
              providerAccountId: "acct_test",
              methods: [{ method: "CARD", enabled: true }],
            },
          ]}
        />
      </NextIntlClientProvider>,
    );

    expect(screen.getByText(en.dashboard.settingsPage.stripeSetupTitle)).toBeTruthy();
    expect(screen.getByText(en.dashboard.settingsPage.stripeSetupState_ready)).toBeTruthy();
    expect(screen.queryByRole("button", { name: en.dashboard.settingsPage.connectStripe })).toBeNull();
    expect(screen.queryByRole("button", { name: en.dashboard.settingsPage.continueStripeSetup })).toBeNull();
  });

  test("accepting the marketplace policy unlocks Stripe without a reload", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        id: "tp-1",
        paymentPolicyAcceptedAt: "2026-08-20T00:00:00.000Z",
      }),
    });
    vi.stubGlobal("fetch", fetchMock);

    render(
      <NextIntlClientProvider locale="en" messages={en}>
        <TeacherPaymentsSettings
          paymentPolicyAcceptedAt={null}
          devPaymentsEnabled={false}
          stripeConnectEnabled
          accounts={[]}
        />
      </NextIntlClientProvider>,
    );

    // Gated to begin with: the policy has not been accepted.
    expect(
      screen.getByText(en.dashboard.settingsPage.stripeSetupPolicyRequiredBody),
    ).toBeTruthy();
    expect(screen.queryByRole("button", { name: en.dashboard.settingsPage.connectStripe })).toBeNull();

    fireEvent.click(
      screen.getByRole("checkbox", {
        name: (name) => name.includes(en.dashboard.settingsPage.paymentPolicyAcceptCheckboxPrefix),
      }),
    );
    fireEvent.click(
      screen.getByRole("button", { name: en.dashboard.settingsPage.paymentPolicyAccept }),
    );

    // Same render, no remount: the Stripe step must open up on its own.
    await waitFor(() => {
      expect(
        screen.getByRole("button", { name: en.dashboard.settingsPage.connectStripe }),
      ).toBeTruthy();
    });
    expect(
      screen.queryByText(en.dashboard.settingsPage.stripeSetupPolicyRequiredBody),
    ).toBeNull();
  });
});
