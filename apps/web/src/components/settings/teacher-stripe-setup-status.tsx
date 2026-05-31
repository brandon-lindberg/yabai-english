"use client";

import { useTranslations } from "next-intl";
import {
  resolveTeacherStripeSetupState,
  summarizeStripeRequirements,
  type TeacherStripeSetupAccount,
} from "@/lib/teacher-stripe-setup";
import { StripeBrandButton } from "@/components/stripe/stripe-brand-button";

type Props = {
  paymentPolicyAcceptedAt: string | null;
  accounts: TeacherStripeSetupAccount[];
  stripeConnectEnabled: boolean;
  connectingStripe: boolean;
  refreshingStripe: boolean;
  returnBanner?: "checking" | "ready" | "incomplete" | null;
  onAcceptPolicyFocus?: () => void;
  onConnectStripe: () => void;
  onRefreshStripe: () => void;
};

export function TeacherStripeSetupStatus({
  paymentPolicyAcceptedAt,
  accounts,
  stripeConnectEnabled,
  connectingStripe,
  refreshingStripe,
  returnBanner = null,
  onAcceptPolicyFocus,
  onConnectStripe,
  onRefreshStripe,
}: Props) {
  const t = useTranslations("dashboard.settingsPage");
  const setup = resolveTeacherStripeSetupState({
    paymentPolicyAcceptedAt,
    accounts,
    stripeConnectEnabled,
  });

  const requirementHints =
    setup.state === "action_required"
      ? summarizeStripeRequirements(setup.requirementsDue)
      : [];

  const showConnectButton =
    stripeConnectEnabled &&
    (setup.state === "not_started" ||
      setup.state === "in_progress" ||
      setup.state === "action_required");

  const connectLabel =
    setup.state === "not_started" ? t("connectStripe") : t("continueStripeSetup");

  const showRefreshButton =
    stripeConnectEnabled &&
    setup.state !== "not_started" &&
    setup.state !== "policy_required";

  return (
    <section
      className="space-y-3 rounded-xl border border-border bg-surface p-4"
      aria-labelledby="teacher-stripe-setup-title"
    >
      <div>
        <h3 id="teacher-stripe-setup-title" className="text-base font-semibold text-foreground">
          {t("stripeSetupTitle")}
        </h3>
        <p className="mt-1 text-sm text-muted">{t("stripeSetupIntro")}</p>
      </div>

      {returnBanner === "checking" ? (
        <p className="rounded-lg border border-border bg-background px-3 py-2 text-sm text-muted">
          {t("stripeReturnChecking")}
        </p>
      ) : null}
      {returnBanner === "ready" ? (
        <p className="rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground">
          {t("stripeReturnReady")}
        </p>
      ) : null}
      {returnBanner === "incomplete" ? (
        <p className="rounded-lg border border-border bg-background px-3 py-2 text-sm text-muted">
          {t("stripeReturnIncomplete")}
        </p>
      ) : null}

      <div className="rounded-lg border border-border bg-background px-3 py-3 text-sm">
        <p className="font-medium text-foreground">
          {t(`stripeSetupState_${setup.state}`)}
        </p>
        <p className="mt-1 text-xs text-muted">
          {setup.state === "ready"
            ? t("stripeSetupReadyBody")
            : setup.state === "policy_required"
              ? t("stripeSetupPolicyRequiredBody")
              : setup.state === "not_started"
                ? t("stripeSetupNotStartedBody")
                : setup.state === "action_required"
                  ? t("stripeSetupActionRequiredBody")
                  : t("stripeSetupInProgressBody")}
        </p>
        {requirementHints.length > 0 ? (
          <ul className="mt-2 list-inside list-disc text-xs text-muted">
            {requirementHints.map((hint) => (
              <li key={hint}>{t(`stripeRequirement_${hint}`)}</li>
            ))}
          </ul>
        ) : null}
      </div>

      <ol className="space-y-1 text-xs text-muted">
        <li>
          {paymentPolicyAcceptedAt ? "✓" : "1."} {t("stripeSetupStepPolicy")}
        </li>
        <li>{setup.state === "ready" ? "✓" : "2."} {t("stripeSetupStepConnect")}</li>
        <li>{setup.state === "ready" ? "✓" : "3."} {t("stripeSetupStepLive")}</li>
      </ol>

      <div className="flex flex-wrap items-center gap-2">
        {setup.state === "policy_required" ? (
          <button
            type="button"
            onClick={onAcceptPolicyFocus}
            className="rounded-full bg-primary px-5 py-2 text-sm font-semibold text-primary-foreground hover:opacity-90"
          >
            {t("stripeSetupAcceptPolicyCta")}
          </button>
        ) : null}
        {showConnectButton ? (
          <StripeBrandButton
            onClick={onConnectStripe}
            loading={connectingStripe}
            prefixLabel={
              setup.state === "not_started"
                ? t("connectStripePrefix")
                : t("continueStripeSetupPrefix")
            }
            aria-label={connectLabel}
          />
        ) : null}
        {showRefreshButton ? (
          <button
            type="button"
            onClick={onRefreshStripe}
            disabled={refreshingStripe}
            className="rounded-full border border-border px-5 py-2 text-sm font-semibold text-foreground hover:bg-[var(--app-hover)] disabled:opacity-50"
          >
            {t("refreshStripe")}
          </button>
        ) : null}
      </div>
      {stripeConnectEnabled ? (
        <p className="text-xs text-muted">{t("connectStripeHelp")}</p>
      ) : null}
    </section>
  );
}
