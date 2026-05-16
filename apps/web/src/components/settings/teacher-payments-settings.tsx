"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { PaymentMethodLogos } from "@/components/payment-method-logos";
import { TeacherPaymentPolicyForm } from "@/components/teacher-payment-policy-form";
import { getEnabledTeacherPaymentMethods } from "@/lib/payment-methods";

type Provider = "STRIPE" | "KOMOJU";
type AccountStatus = "PENDING" | "ENABLED" | "DISABLED" | "REQUIREMENTS_DUE";
type Method = "CARD" | "PAYPAY";

export type TeacherPaymentsSettingsAccount = {
  id: string;
  provider: Provider;
  providerAccountId: string | null;
  status: AccountStatus;
  chargesEnabled: boolean;
  payoutsEnabled: boolean;
  methods: Array<{
    method: Method;
    enabled: boolean;
  }>;
};

type Props = {
  paymentPolicyAcceptedAt: string | null;
  accounts: TeacherPaymentsSettingsAccount[];
  devPaymentsEnabled: boolean;
  stripeConnectEnabled: boolean;
};

export function TeacherPaymentsSettings({
  paymentPolicyAcceptedAt,
  accounts: initialAccounts,
  devPaymentsEnabled,
  stripeConnectEnabled,
}: Props) {
  const t = useTranslations("dashboard.settingsPage");
  const [accounts, setAccounts] = useState(initialAccounts);
  const [savingDevMethod, setSavingDevMethod] = useState(false);
  const [connectingStripe, setConnectingStripe] = useState(false);
  const [refreshingStripe, setRefreshingStripe] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const enabledMethods = getEnabledTeacherPaymentMethods(accounts);
  const stripeAccount = accounts.find((account) => account.provider === "STRIPE");

  async function enableDevStripe() {
    setSavingDevMethod(true);
    setError(null);
    try {
      const res = await fetch("/api/teacher/payment-accounts/dev-enable", { method: "POST" });
      if (!res.ok) {
        setError(t("enableDevStripeError"));
        return;
      }
      const data = (await res.json()) as { account?: TeacherPaymentsSettingsAccount };
      if (data.account) {
        setAccounts((current) => [
          data.account!,
          ...current.filter(
            (account) => account.provider !== data.account!.provider && account.id !== data.account!.id,
          ),
        ]);
      }
    } catch {
      setError(t("enableDevStripeError"));
    } finally {
      setSavingDevMethod(false);
    }
  }

  async function connectStripe() {
    setConnectingStripe(true);
    setError(null);
    try {
      const res = await fetch("/api/teacher/payment-accounts/stripe/connect", { method: "POST" });
      if (!res.ok) {
        setError(t("connectStripeError"));
        return;
      }
      const data = (await res.json()) as {
        onboardingUrl?: string;
        account?: TeacherPaymentsSettingsAccount;
      };
      if (data.account) {
        setAccounts((current) => [
          data.account!,
          ...current.filter(
            (account) => account.provider !== data.account!.provider && account.id !== data.account!.id,
          ),
        ]);
      }
      if (data.onboardingUrl) {
        window.location.assign(data.onboardingUrl);
      }
    } catch {
      setError(t("connectStripeError"));
    } finally {
      setConnectingStripe(false);
    }
  }

  async function refreshStripe() {
    setRefreshingStripe(true);
    setError(null);
    try {
      const res = await fetch("/api/teacher/payment-accounts/stripe/sync", { method: "POST" });
      if (!res.ok) {
        setError(t("refreshStripeError"));
        return;
      }
      const data = (await res.json()) as { account?: TeacherPaymentsSettingsAccount };
      if (data.account) {
        setAccounts((current) => [
          data.account!,
          ...current.filter(
            (account) => account.provider !== data.account!.provider && account.id !== data.account!.id,
          ),
        ]);
      }
    } catch {
      setError(t("refreshStripeError"));
    } finally {
      setRefreshingStripe(false);
    }
  }

  return (
    <section className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold text-foreground">{t("paymentsTitle")}</h2>
        <p className="mt-1 text-sm text-muted">{t("paymentsIntro")}</p>
      </div>

      <TeacherPaymentPolicyForm acceptedAt={paymentPolicyAcceptedAt} />

      <section className="space-y-3 rounded-xl border border-border bg-surface p-4">
        <div>
          <h3 className="text-base font-semibold text-foreground">{t("paymentsConnectedTitle")}</h3>
          <p className="mt-1 text-sm text-muted">{t("paymentsAvailableToStudents")}</p>
        </div>

        {enabledMethods.length > 0 ? (
          <PaymentMethodLogos methods={enabledMethods} />
        ) : (
          <p className="text-sm text-muted">{t("paymentsNone")}</p>
        )}

        {accounts.length > 0 ? (
          <div className="space-y-2">
            {accounts.map((account) => {
              const ready =
                account.status === "ENABLED" && account.chargesEnabled && account.payoutsEnabled;
              return (
                <div
                  key={account.id}
                  className="rounded-lg border border-border bg-background px-3 py-2 text-sm"
                >
                  <p className="font-medium text-foreground">
                    {t("paymentAccountStatus", {
                      provider: account.provider,
                      status: account.status,
                    })}
                  </p>
                  <p className="mt-1 text-xs text-muted">
                    {ready ? t("paymentAccountReady") : t("paymentAccountNeedsSetup")}
                  </p>
                </div>
              );
            })}
          </div>
        ) : null}

        {error ? (
          <p className="text-sm" style={{ color: "var(--app-danger)" }}>
            {error}
          </p>
        ) : null}

        {stripeConnectEnabled ? (
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => {
                void connectStripe();
              }}
              disabled={connectingStripe}
              className="rounded-full bg-primary px-5 py-2 text-sm font-semibold text-primary-foreground hover:opacity-90 disabled:opacity-50"
            >
              {t("connectStripe")}
            </button>
            {stripeAccount?.providerAccountId ? (
              <button
                type="button"
                onClick={() => {
                  void refreshStripe();
                }}
                disabled={refreshingStripe}
                className="rounded-full border border-border px-5 py-2 text-sm font-semibold text-foreground hover:bg-[var(--app-hover)] disabled:opacity-50"
              >
                {t("refreshStripe")}
              </button>
            ) : null}
            <p className="basis-full text-xs text-muted">{t("connectStripeHelp")}</p>
          </div>
        ) : devPaymentsEnabled ? (
          <div className="space-y-2">
            <button
              type="button"
              onClick={() => {
                void enableDevStripe();
              }}
              disabled={savingDevMethod}
              className="rounded-full bg-primary px-5 py-2 text-sm font-semibold text-primary-foreground hover:opacity-90 disabled:opacity-50"
            >
              {t("enableDevStripe")}
            </button>
            <p className="text-xs text-muted">{t("enableDevStripeHelp")}</p>
          </div>
        ) : (
          <p className="text-xs text-muted">{t("providerOnboardingPending")}</p>
        )}
      </section>
    </section>
  );
}
