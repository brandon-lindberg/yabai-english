// @vitest-environment jsdom

import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { NextIntlClientProvider } from "next-intl";
import { afterEach, describe, expect, test, vi } from "vitest";
import en from "../../../../messages/en.json";
import { TeacherPaymentsSettings } from "@/components/settings/teacher-payments-settings";

const useSearchParamsMock = vi.fn(() => new URLSearchParams());

vi.mock("next/navigation", () => ({
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

  test("lets the teacher pass the refund processing fee to the student", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ ok: true, teacherProfileId: "tp-1" }),
    });
    vi.stubGlobal("fetch", fetchMock);

    render(
      <NextIntlClientProvider locale="en" messages={en}>
        <TeacherPaymentsSettings
          paymentPolicyAcceptedAt="2026-05-15T00:00:00.000Z"
          devPaymentsEnabled={false}
          stripeConnectEnabled
          refundFeePassedToStudent={false}
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

    expect(screen.getByText(en.dashboard.settingsPage.refundFeeTitle)).toBeTruthy();
    const toggle = screen.getByRole("checkbox", {
      name: en.dashboard.settingsPage.refundFeePassToStudentLabel,
    });
    expect((toggle as HTMLInputElement).checked).toBe(false);

    fireEvent.click(toggle);

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith("/api/teacher/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ refundFeePassedToStudent: true }),
      });
      expect((toggle as HTMLInputElement).checked).toBe(true);
    });
  });

  test("reverts the refund fee toggle when saving fails", async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: false, json: async () => ({}) });
    vi.stubGlobal("fetch", fetchMock);

    render(
      <NextIntlClientProvider locale="en" messages={en}>
        <TeacherPaymentsSettings
          paymentPolicyAcceptedAt="2026-05-15T00:00:00.000Z"
          devPaymentsEnabled={false}
          stripeConnectEnabled
          refundFeePassedToStudent={false}
          accounts={[]}
        />
      </NextIntlClientProvider>,
    );

    const toggle = screen.getByRole("checkbox", {
      name: en.dashboard.settingsPage.refundFeePassToStudentLabel,
    });
    fireEvent.click(toggle);

    await waitFor(() => {
      expect((toggle as HTMLInputElement).checked).toBe(false);
      expect(screen.getByText(en.dashboard.settingsPage.refundFeeSaveError)).toBeTruthy();
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
});
