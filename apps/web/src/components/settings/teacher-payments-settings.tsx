"use client";

import { useEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { useSearchParams } from "next/navigation";
import { PaymentMethodLogos } from "@/components/payment-method-logos";
import { TeacherPaymentPolicyForm } from "@/components/teacher-payment-policy-form";
import { TeacherMarketplaceEconomicsNotice } from "@/components/settings/teacher-marketplace-economics-notice";
import { TeacherStripeSetupStatus } from "@/components/settings/teacher-stripe-setup-status";
import {
  SUPPORTED_PAYMENT_METHODS,
  type SupportedPaymentProvider,
  getEnabledTeacherPaymentMethods,
  isLocalDevStripeAccountReady,
  isLocalStripeProviderAccount,
  isStripeAccountReady,
  isTeacherPaymentAccountReady,
} from "@/lib/payment-methods";
import { resolveTeacherStripeSetupState } from "@/lib/teacher-stripe-setup";
import { buttonClasses } from "@/components/ui/button";
import { Status } from "@/components/ui/status";

type Provider = SupportedPaymentProvider;
type AccountStatus = "PENDING" | "ENABLED" | "DISABLED" | "REQUIREMENTS_DUE";
type Method = (typeof SUPPORTED_PAYMENT_METHODS)[number];

export type TeacherPaymentsSettingsAccount = {
  id: string;
  provider: Provider;
  providerAccountId: string | null;
  status: AccountStatus;
  chargesEnabled: boolean;
  payoutsEnabled: boolean;
  requirementsDue?: string[];
  detailsSubmitted?: boolean;
  pendingVerification?: string[];
  disabledReason?: string | null;
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
  paymentPolicyAcceptedAt: initialPaymentPolicyAcceptedAt,
  accounts: initialAccounts,
  devPaymentsEnabled,
  stripeConnectEnabled,
}: Props) {
  const t = useTranslations("dashboard.settingsPage");
  const searchParams = useSearchParams();
  const handledStripeReturnRef = useRef(false);
  const policySectionRef = useRef<HTMLDivElement>(null);
  const [accounts, setAccounts] = useState(initialAccounts);
  // Held here rather than read from the prop: the Stripe step is gated on it, so
  // accepting the policy has to open that step in the same render instead of
  // waiting for a page reload.
  const [paymentPolicyAcceptedAt, setPaymentPolicyAcceptedAt] = useState(
    initialPaymentPolicyAcceptedAt,
  );
  const [savingDevMethod, setSavingDevMethod] = useState(false);
  const [connectingStripe, setConnectingStripe] = useState(false);
  const [refreshingStripe, setRefreshingStripe] = useState(false);
  const [returnBanner, setReturnBanner] = useState<
    "checking" | "ready" | "in_review" | "incomplete" | null
  >(null);
  const [error, setError] = useState<string | null>(null);
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
        setReturnBanner(resolveReturnBanner(data.account));
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

  // Reuses the same state machine the status card renders from, so the banner
  // and the card can never disagree about whether a teacher must act.
  function resolveReturnBanner(account: TeacherPaymentsSettingsAccount) {
    if (isStripeAccountReady(account)) return "ready" as const;
    const state = resolveTeacherStripeSetupState({
      paymentPolicyAcceptedAt,
      accounts: [account],
      stripeConnectEnabled,
    }).state;
    return state === "in_review" ? ("in_review" as const) : ("incomplete" as const);
  }

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

      <TeacherMarketplaceEconomicsNotice />

      <div ref={policySectionRef}>
        <TeacherPaymentPolicyForm
          acceptedAt={paymentPolicyAcceptedAt}
          onAccepted={setPaymentPolicyAcceptedAt}
        />
      </div>

      <section className="space-y-3 border-t border-border pt-6">
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
          <p role="alert">
          <Status tone="error">{error}</Status>
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
              className={buttonClasses()}
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
    </section>
  );
}
