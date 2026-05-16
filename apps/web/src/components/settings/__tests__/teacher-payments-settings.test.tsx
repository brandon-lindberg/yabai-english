// @vitest-environment jsdom

import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { NextIntlClientProvider } from "next-intl";
import { afterEach, describe, expect, test, vi } from "vitest";
import en from "../../../../messages/en.json";
import { TeacherPaymentsSettings } from "@/components/settings/teacher-payments-settings";

describe("TeacherPaymentsSettings", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
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
          paymentPolicyAcceptedAt={null}
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
});
