"use client";

import { useTranslations } from "next-intl";
import {
  resolveTeacherStripeSetupState,
  summarizeStripeRequirements,
  type TeacherStripeSetupAccount,
  type TeacherStripeSetupState,
} from "@/lib/teacher-stripe-setup";
import { StripeBrandButton } from "@/components/stripe/stripe-brand-button";
import { buttonClasses } from "@/components/ui/button";
import { Link } from "@/i18n/navigation";
import { actionLinkClass } from "@/components/ui/inline-link";

/** Where a Standard connected account holder signs in to see their own status.
 *  Standard accounts get a full Stripe dashboard, so this is the real answer to
 *  "how do I check on the review myself" — there is no deep link we can build. */
const STRIPE_DASHBOARD_URL = "https://dashboard.stripe.com/";

/** The walkthrough of Stripe's onboarding questions. */
const STRIPE_GUIDE_HREF = "/guides/stripe-onboarding";

/** One body string per state. A map rather than a ternary chain — there are now
 *  seven states and the chain had already stopped being readable at five. */
const SETUP_BODY_KEY: Record<TeacherStripeSetupState["state"], string> = {
  policy_required: "stripeSetupPolicyRequiredBody",
  not_started: "stripeSetupNotStartedBody",
  in_progress: "stripeSetupInProgressBody",
  in_review: "stripeSetupInReviewBody",
  action_required: "stripeSetupActionRequiredBody",
  restricted: "stripeSetupRestrictedBody",
  ready: "stripeSetupReadyBody",
};

type Props = {
  paymentPolicyAcceptedAt: string | null;
  accounts: TeacherStripeSetupAccount[];
  stripeConnectEnabled: boolean;
  connectingStripe: boolean;
  refreshingStripe: boolean;
  returnBanner?: "checking" | "ready" | "in_review" | "incomplete" | null;
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

  // Deliberately absent for `in_review` and `restricted`: there is no onboarding
  // left to continue, and offering the button is what made a waiting teacher
  // think they had missed a step.
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

  // Onboarding is behind them once Stripe has their details, whether or not the
  // review has finished.
  const connectStepDone = setup.state === "ready" || setup.state === "in_review";

  // Where the Continue button used to sit for these states. The teacher cannot
  // act through us, but they can look at Stripe's own account page — which is
  // the question they actually have while waiting.
  const showStripeDashboardLink =
    setup.state === "in_review" || setup.state === "restricted";

  return (
    <section
      className="space-y-3 border-t border-border pt-6"
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
      {returnBanner === "in_review" ? (
        <p className="rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground">
          {t("stripeReturnInReview")}
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
        <p className="mt-1 text-xs text-muted">{t(SETUP_BODY_KEY[setup.state])}</p>
        {setup.state === "in_review" ? (
          <div className="mt-2 space-y-1 rounded-md bg-[var(--app-hover)] px-2 py-2">
            <p className="text-xs font-medium text-foreground">
              {t("stripeSetupInReviewNoAction")}
            </p>
            <p className="text-xs text-muted">{t("stripeSetupInReviewTimeline")}</p>
          </div>
        ) : null}
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
        <li>{connectStepDone ? "✓" : "2."} {t("stripeSetupStepConnect")}</li>
        <li>{setup.state === "ready" ? "✓" : "3."} {t("stripeSetupStepLive")}</li>
      </ol>

      <div className="flex flex-wrap items-center gap-2">
        {setup.state === "policy_required" ? (
          <button
            type="button"
            onClick={onAcceptPolicyFocus}
            className={buttonClasses({ size: "lg" })}
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
        {showStripeDashboardLink ? (
          <a
            href={STRIPE_DASHBOARD_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="rounded-full border border-border px-5 py-2 text-sm font-semibold text-foreground hover:bg-[var(--app-hover)]"
          >
            {t("stripeCheckStatusOnStripe")}
          </a>
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
        <div className="space-y-2">
          <p>
            <Link href={STRIPE_GUIDE_HREF} className={actionLinkClass}>
              {t("stripeSetupGuideLink")}
            </Link>
          </p>
          <p className="text-xs text-muted">{t("connectStripeHelp")}</p>
        </div>
      ) : null}
    </section>
  );
}
