import {
  isLocalStripeProviderAccount,
  isStripeAccountReady,
  type TeacherPaymentAccountLike,
} from "@/lib/payment-methods";

export type TeacherStripeSetupState =
  | { state: "policy_required" }
  | { state: "not_started" }
  | { state: "in_progress"; stripeAccountId: string }
  | { state: "in_review"; stripeAccountId: string; pendingVerification: string[] }
  | { state: "action_required"; stripeAccountId: string; requirementsDue: string[] }
  | { state: "restricted"; stripeAccountId: string; disabledReason: string }
  | { state: "ready"; stripeAccountId: string };

export type TeacherStripeSetupAccount = TeacherPaymentAccountLike & {
  requirementsDue?: string[];
  detailsSubmitted?: boolean;
  pendingVerification?: string[];
  disabledReason?: string | null;
};

/**
 * `requirements.disabled_reason` values where charges are off for good and no
 * amount of waiting or form-filling by the teacher will turn them back on —
 * only Stripe can. Telling someone in this state that "this is normal, it
 * clears in a few days" would be a lie, so they are split out from review.
 */
function isBlockedDisabledReason(reason: string): boolean {
  return (
    reason.startsWith("rejected.") || reason === "listed" || reason === "platform_paused"
  );
}

/**
 * The reasons Stripe gives while it is doing the checking. `under_review` is
 * what a JP account gets during Installment Sales Act verification.
 */
const REVIEW_DISABLED_REASONS = new Set([
  "under_review",
  "requirements.pending_verification",
]);

export function resolveTeacherStripeSetupState({
  paymentPolicyAcceptedAt,
  accounts,
  stripeConnectEnabled,
}: {
  paymentPolicyAcceptedAt: Date | string | null | undefined;
  accounts: TeacherStripeSetupAccount[];
  stripeConnectEnabled: boolean;
}): TeacherStripeSetupState {
  if (!paymentPolicyAcceptedAt) {
    return { state: "policy_required" };
  }

  if (!stripeConnectEnabled) {
    return { state: "not_started" };
  }

  const stripeAccount = accounts.find(
    (account) =>
      account.provider === "STRIPE" &&
      !isLocalStripeProviderAccount(account.providerAccountId),
  );

  if (!stripeAccount) {
    return { state: "not_started" };
  }

  const phase = classifyStripeAccount(stripeAccount);
  switch (phase) {
    case "ready":
      return { state: "ready", stripeAccountId: stripeAccount.id };
    case "restricted":
      return {
        state: "restricted",
        stripeAccountId: stripeAccount.id,
        disabledReason: stripeAccount.disabledReason ?? "",
      };
    case "action_required":
      return {
        state: "action_required",
        stripeAccountId: stripeAccount.id,
        requirementsDue: stripeAccount.requirementsDue ?? [],
      };
    case "in_review":
      return {
        state: "in_review",
        stripeAccountId: stripeAccount.id,
        pendingVerification: stripeAccount.pendingVerification ?? [],
      };
    default:
      return { state: "in_progress", stripeAccountId: stripeAccount.id };
  }
}

/** Where a connected account sits, ignoring everything outside Stripe. */
export type StripeAccountPhase =
  | "ready"
  | "restricted"
  | "action_required"
  | "in_review"
  | "in_progress";

/**
 * The Stripe half of the setup state, split out so the settings UI and the
 * status-change notifications classify an account identically. They disagreed
 * once before over which of them counted as "needs setup", and a teacher was
 * told two different things about the same account on the same day.
 */
export function classifyStripeAccount(
  account: TeacherStripeSetupAccount,
): StripeAccountPhase {
  if (isStripeAccountReady(account)) return "ready";

  const disabledReason = account.disabledReason ?? null;
  if (disabledReason && isBlockedDisabledReason(disabledReason)) return "restricted";

  // Anything the teacher still has to supply outranks a review: Stripe may be
  // checking one thing while waiting on another, and the actionable half is
  // what they should see.
  const requirementsDue = account.requirementsDue ?? [];
  if (account.status === "REQUIREMENTS_DUE" || requirementsDue.length > 0) {
    return "action_required";
  }

  // Nothing outstanding and charges still off means the ball is in Stripe's
  // court. `detailsSubmitted` is the general case; the other two catch an
  // account Stripe has flagged for review before our record caught up.
  if (
    account.detailsSubmitted ||
    (account.pendingVerification ?? []).length > 0 ||
    (disabledReason && REVIEW_DISABLED_REASONS.has(disabledReason))
  ) {
    return "in_review";
  }

  return "in_progress";
}

export type StripeRequirementHint = "identity" | "bank" | "business" | "other";

export function summarizeStripeRequirements(requirementsDue: string[]): StripeRequirementHint[] {
  const hints = new Set<StripeRequirementHint>();

  for (const requirement of requirementsDue) {
    const normalized = requirement.toLowerCase();
    if (normalized.includes("verification") || normalized.includes("identity")) {
      hints.add("identity");
      continue;
    }
    if (normalized.includes("external_account") || normalized.includes("bank")) {
      hints.add("bank");
      continue;
    }
    if (normalized.includes("business") || normalized.includes("company")) {
      hints.add("business");
      continue;
    }
    hints.add("other");
  }

  return Array.from(hints);
}
