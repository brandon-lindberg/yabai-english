"use client";

import { useEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { useSearchParams } from "next/navigation";
import { PaymentMethodLogos } from "@/components/payment-method-logos";
import { TeacherPaymentPolicyForm } from "@/components/teacher-payment-policy-form";
import { TeacherStripeSetupStatus } from "@/components/settings/teacher-stripe-setup-status";
import {
  getEnabledTeacherPaymentMethods,
  isLocalDevStripeAccountReady,
  isLocalStripeProviderAccount,
  isStripeAccountReady,
  isTeacherPaymentAccountReady,
} from "@/lib/payment-methods";
import { resolveTeacherStripeSetupState } from "@/lib/teacher-stripe-setup";

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
  requirementsDue?: string[];
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
  refundFeePassedToStudent?: boolean;
};

export function TeacherPaymentsSettings({
  paymentPolicyAcceptedAt,
  accounts: initialAccounts,
  devPaymentsEnabled,
  stripeConnectEnabled,
  refundFeePassedToStudent: initialRefundFeePassedToStudent = false,
}: Props) {
  const t = useTranslations("dashboard.settingsPage");
  const searchParams = useSearchParams();
  const handledStripeReturnRef = useRef(false);
  const policySectionRef = useRef<HTMLDivElement>(null);
  const [accounts, setAccounts] = useState(initialAccounts);
  const [savingDevMethod, setSavingDevMethod] = useState(false);
  const [connectingStripe, setConnectingStripe] = useState(false);
  const [refreshingStripe, setRefreshingStripe] = useState(false);
  const [returnBanner, setReturnBanner] = useState<"checking" | "ready" | "incomplete" | null>(
    null,
  );
  const [error, setError] = useState<string | null>(null);
  const [refundFeePassedToStudent, setRefundFeePassedToStudent] = useState(
    initialRefundFeePassedToStudent,
  );
  const [savingRefundFee, setSavingRefundFee] = useState(false);
  const [refundFeeError, setRefundFeeError] = useState<string | null>(null);
  const enabledMethods = getEnabledTeacherPaymentMethods(accounts);
  const hasLocalDevStripe = accounts.some(
    (account) =>
      account.provider === "STRIPE" &&
      isLocalStripeProviderAccount(account.providerAccountId),
  );

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
        const body = (await res.json().catch(() => null)) as { error?: string } | null;
        setError(body?.error ?? t("connectStripeError"));
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
    setReturnBanner("checking");
    try {
      const res = await fetch("/api/teacher/payment-accounts/stripe/sync", { method: "POST" });
      if (!res.ok) {
        setError(t("refreshStripeError"));
        setReturnBanner("incomplete");
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
        setReturnBanner(isStripeAccountReady(data.account) ? "ready" : "incomplete");
      } else {
        setReturnBanner("incomplete");
      }
    } catch {
      setError(t("refreshStripeError"));
      setReturnBanner("incomplete");
    } finally {
      setRefreshingStripe(false);
    }
  }

  async function saveRefundFeePreference(nextValue: boolean) {
    setSavingRefundFee(true);
    setRefundFeeError(null);
    setRefundFeePassedToStudent(nextValue);
    try {
      const res = await fetch("/api/teacher/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ refundFeePassedToStudent: nextValue }),
      });
      if (!res.ok) {
        setRefundFeePassedToStudent(!nextValue);
        setRefundFeeError(t("refundFeeSaveError"));
      }
    } catch {
      setRefundFeePassedToStudent(!nextValue);
      setRefundFeeError(t("refundFeeSaveError"));
    } finally {
      setSavingRefundFee(false);
    }
  }

  useEffect(() => {
    if (!stripeConnectEnabled || handledStripeReturnRef.current) {
      return;
    }

    const stripeParam = searchParams.get("stripe");
    if (stripeParam === "refresh") {
      handledStripeReturnRef.current = true;
      void connectStripe();
      return;
    }

    if (stripeParam === "return") {
      handledStripeReturnRef.current = true;
      void refreshStripe();
    }
  }, [searchParams, stripeConnectEnabled]);

  function focusPolicySection() {
    policySectionRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  const setupState = resolveTeacherStripeSetupState({
    paymentPolicyAcceptedAt,
    accounts,
    stripeConnectEnabled,
  });

  return (
    <section className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold text-foreground">{t("paymentsTitle")}</h2>
        <p className="mt-1 text-sm text-muted">{t("paymentsIntro")}</p>
      </div>

      {stripeConnectEnabled ? (
        <TeacherStripeSetupStatus
          paymentPolicyAcceptedAt={paymentPolicyAcceptedAt}
          accounts={accounts}
          stripeConnectEnabled={stripeConnectEnabled}
          connectingStripe={connectingStripe}
          refreshingStripe={refreshingStripe}
          returnBanner={returnBanner}
          onAcceptPolicyFocus={focusPolicySection}
          onConnectStripe={() => {
            void connectStripe();
          }}
          onRefreshStripe={() => {
            void refreshStripe();
          }}
        />
      ) : null}

      <div ref={policySectionRef}>
        <TeacherPaymentPolicyForm acceptedAt={paymentPolicyAcceptedAt} />
      </div>

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
              const ready = isTeacherPaymentAccountReady(account);
              const localDevReady =
                devPaymentsEnabled && isLocalDevStripeAccountReady(account);
              return (
                <div
                  key={account.id}
                  className="rounded-lg border border-border bg-background px-3 py-2 text-sm"
                >
                  <p className="font-medium text-foreground">
                    {account.provider === "STRIPE"
                      ? t(`stripeAccountLabel_${account.status}`)
                      : t("paymentAccountStatus", {
                          provider: account.provider,
                          status: account.status,
                        })}
                  </p>
                  <p className="mt-1 text-xs text-muted">
                    {ready
                      ? t("paymentAccountReady")
                      : localDevReady
                        ? t("paymentAccountLocalReady")
                        : t("paymentAccountNeedsSetup")}
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

        {!stripeConnectEnabled && devPaymentsEnabled && !hasLocalDevStripe ? (
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
        ) : null}
        {!stripeConnectEnabled && !devPaymentsEnabled ? (
          <p className="text-xs text-muted">{t("providerOnboardingPending")}</p>
        ) : null}
        {setupState.state === "ready" ? (
          <p className="text-xs text-foreground">{t("stripeSetupStudentsCanPay")}</p>
        ) : null}
      </section>

      <section className="space-y-3 rounded-xl border border-border bg-surface p-4">
        <div>
          <h3 className="text-base font-semibold text-foreground">{t("refundFeeTitle")}</h3>
          <p className="mt-1 text-sm text-muted">{t("refundFeeIntro")}</p>
        </div>
        <label className="flex items-start gap-3 text-sm text-foreground">
          <input
            type="checkbox"
            aria-label={t("refundFeePassToStudentLabel")}
            checked={refundFeePassedToStudent}
            disabled={savingRefundFee}
            onChange={(event) => {
              void saveRefundFeePreference(event.target.checked);
            }}
            className="mt-0.5 h-4 w-4 rounded border-border accent-[var(--app-primary,#4f46e5)]"
          />
          <span>
            <span className="font-medium">{t("refundFeePassToStudentLabel")}</span>
            <span className="mt-0.5 block text-xs text-muted">
              {refundFeePassedToStudent
                ? t("refundFeePassToStudentHelp")
                : t("refundFeeTeacherCoversHelp")}
            </span>
          </span>
        </label>
        {refundFeeError ? (
          <p className="text-sm" style={{ color: "var(--app-danger)" }}>
            {refundFeeError}
          </p>
        ) : null}
      </section>
    </section>
  );
}
