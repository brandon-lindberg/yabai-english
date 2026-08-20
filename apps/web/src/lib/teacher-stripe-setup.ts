import {
  isLocalStripeProviderAccount,
  isStripeAccountReady,
  type TeacherPaymentAccountLike,
} from "@/lib/payment-methods";

export type TeacherStripeSetupState =
  | { state: "policy_required" }
  | { state: "not_started" }
  | { state: "in_progress"; stripeAccountId: string }
  | { state: "action_required"; stripeAccountId: string; requirementsDue: string[] }
  | { state: "ready"; stripeAccountId: string };

export type TeacherStripeSetupAccount = TeacherPaymentAccountLike & {
  requirementsDue?: string[];
};

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

  if (isStripeAccountReady(stripeAccount)) {
    return { state: "ready", stripeAccountId: stripeAccount.id };
  }

  const requirementsDue = stripeAccount.requirementsDue ?? [];
  if (stripeAccount.status === "REQUIREMENTS_DUE" || requirementsDue.length > 0) {
    return {
      state: "action_required",
      stripeAccountId: stripeAccount.id,
      requirementsDue,
    };
  }

  return { state: "in_progress", stripeAccountId: stripeAccount.id };
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
