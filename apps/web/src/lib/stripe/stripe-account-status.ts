import type { TeacherPaymentMethodType } from "@/generated/prisma/client";

/**
 * Which Stripe capability makes each payment method offerable.
 *
 * A connected account can only charge with a method Stripe has activated for
 * it, so this is the source of truth for what a teacher may be offered — not a
 * hardcoded assumption.
 *
 * `PAYPAY` is deliberately absent. Stripe exposes no PayPay capability and no
 * PayPay Checkout payment method type (verified against SDK 22.1.1, API
 * 2026-06-24.dahlia — the list has kakao_pay, naver_pay, samsung_pay and
 * amazon_pay, but no PayPay). The enum value is kept so the option can be
 * turned on the day Stripe ships it; mapping it to a capability that never
 * activates would only look like support we do not have.
 *
 * The JP method Stripe *does* offer that we have not wired up is
 * `konbini_payments` — convenience-store payment, and a natural fit since the
 * webhook already handles the delayed-payment events it needs.
 */
export const STRIPE_CAPABILITY_BY_METHOD = {
  CARD: "card_payments",
} as const satisfies Partial<Record<TeacherPaymentMethodType, string>>;

/** Methods we can actually offer today — the keys of the map above. */
export const SUPPORTED_METHOD_TYPES = Object.keys(
  STRIPE_CAPABILITY_BY_METHOD,
) as Array<keyof typeof STRIPE_CAPABILITY_BY_METHOD>;

type StripeAccountSnapshot = {
  charges_enabled?: boolean | null;
  payouts_enabled?: boolean | null;
  requirements?: {
    currently_due?: string[] | null;
    past_due?: string[] | null;
  } | null;
  /** Stripe's `Capabilities` is an interface with no index signature, so it is
   *  taken as unknown and narrowed here rather than fought with a cast. */
  capabilities?: unknown;
};

function resolveEnabledMethods(
  account: StripeAccountSnapshot,
  ready: boolean,
): TeacherPaymentMethodType[] {
  // An account that cannot take a payment offers nothing, whatever its
  // capabilities say.
  if (!ready) return [];

  const capabilities = account.capabilities;
  // Accounts connected before we read capabilities report none. Treating that
  // as "no methods" would quietly make existing teachers unbookable, so assume
  // the method every Stripe account can charge with.
  if (!capabilities || typeof capabilities !== "object") return ["CARD"];

  const byName = capabilities as Record<string, unknown>;
  if (Object.keys(byName).length === 0) return ["CARD"];

  return SUPPORTED_METHOD_TYPES.filter(
    (method) => byName[STRIPE_CAPABILITY_BY_METHOD[method]] === "active",
  );
}

export function resolveStripeAccountStatus(account: StripeAccountSnapshot) {
  const requirementsDue = [
    ...(account.requirements?.currently_due ?? []),
    ...(account.requirements?.past_due ?? []),
  ];
  const chargesEnabled = Boolean(account.charges_enabled);
  const payoutsEnabled = Boolean(account.payouts_enabled);
  const ready = chargesEnabled && payoutsEnabled && requirementsDue.length === 0;

  return {
    status: ready ? "ENABLED" as const : requirementsDue.length > 0 ? "REQUIREMENTS_DUE" as const : "PENDING" as const,
    chargesEnabled,
    payoutsEnabled,
    requirementsDue,
    enabledMethods: resolveEnabledMethods(account, ready),
  };
}
